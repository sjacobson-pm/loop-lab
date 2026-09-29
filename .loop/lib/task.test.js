// @vitest-environment node
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { reviewTask } from './review.mjs';
import { runTask, validateBindings } from './task.mjs';

const task = {
  id: 'A',
  criteria: ['spec/x.html#rule-a'],
  files_modified: ['src/a.js', 'src/a.test.js'],
};
const binding = { id: 'src/a.test.js::rule-a', file: 'src/a.test.js', name: 'rule-a', criteria: [...task.criteria] };
const testResult = {
  id: binding.id,
  file: binding.file,
  name: binding.name,
  status: 'passed',
  failureKind: null,
  message: '',
};
const green = () => ({ exitCode: 0, complete: true, errors: [], tests: [{ ...testResult }] });
const red = () => ({
  exitCode: 1,
  complete: true,
  errors: [],
  tests: [{ ...testResult, status: 'failed', failureKind: 'assertion', message: 'expected 0 to be 1' }],
});
function fixture() {
  const events = [];
  const token = Object.freeze({ id: 'frozen-tests' });
  const ports = {
    baseline: vi.fn(async () => {
      events.push('baseline-green');
      return green();
    }),
    test: vi.fn(async () => {
      events.push('test');
      return { outcome: { status: 'completed' }, bindings: [binding], testFiles: [binding.file] };
    }),
    audit: vi.fn(async (leg) => {
      events.push(`audit-${leg}`);
      return [];
    }),
    freezeTests: vi.fn(async () => token),
    red: vi.fn(async ({ baseline, tests }) => {
      expect(baseline).toBe('baseline-token');
      expect(tests).toBe(token);
      events.push('red');
      return red();
    }),
    implement: vi.fn(async ({ tests }) => {
      expect(tests).toBe(token);
      events.push('implement');
      return { outcome: { status: 'completed' } };
    }),
    green: vi.fn(async ({ tests }) => {
      expect(tests).toBe(token);
      events.push('green');
      return green();
    }),
    review: vi.fn(async () => {
      events.push('review');
      return [];
    }),
    delta: vi.fn(async () => ({ bytes: Buffer.from('patch'), changes: [] })),
  };
  return { events, token, ports };
}
const request = () => ({
  task,
  target: {},
  baseline: 'baseline-token',
  index: { criteria: [{ anchor: task.criteria[0] }] },
});
const reviewIndex = { ...request().index, spec_path: 'spec/x.html' };
const reviewStandards = {
  references: [
    { kind: 'repository', id: '.github/copilot-instructions.md' },
    { kind: 'repository', id: 'CONTRIBUTING.md' },
  ],
  records: [],
  missingRequired: [],
};
const specRead = { name: 'view', arguments: { path: 'spec/x.html' } };
const standardsReads = reviewStandards.references.map(({ id }) => ({ name: 'view', arguments: { path: id } }));
const reviewerResponse = (toolRequests, overrides = {}) => ({
  outcome: {
    status: 'completed',
    reportedWrites: [],
    toolRequests,
    messages: ['[]'],
    usage: {
      counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 0.25 }],
      apiDurationMs: 10,
      durationMs: 20,
    },
    ...overrides,
  },
  violations: [],
});
function realReview(ports, responses) {
  const feedback = [];
  ports.review.mockImplementation(async (input) => {
    feedback.push(input.feedback);
    const response = responses.shift();
    if (!response) throw new Error('Unexpected reviewer invocation.');
    input.reportUsage(response.outcome.usage);
    return reviewTask(
      {
        task: input.task,
        index: input.index,
        evidence: input.evidence,
        delta: input.delta,
        standards: reviewStandards,
        worktree: path.resolve('reviewer'),
      },
      { review: async () => response }
    );
  });
  return feedback;
}

describe('task RED/GREEN sequence', () => {
  it('retries missing spec and standards reads once with exact filenames and accepts a complete review', async () => {
    const { ports } = fixture();
    const feedback = realReview(ports, [
      reviewerResponse([]),
      reviewerResponse([specRead, ...standardsReads], {
        usage: {
          counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 0.75 }],
          apiDurationMs: 11,
          durationMs: 21,
        },
      }),
    ]);
    const result = await runTask({ ...request(), index: reviewIndex, maxRepairs: 0 }, ports);
    expect(result.status).toBe('ready');
    expect(result.evidence.reviews).toEqual([{ findings: [], route: 'done' }]);
    expect(ports.review).toHaveBeenCalledTimes(2);
    expect(feedback[0]).toBeUndefined();
    expect(feedback[1]).toContain('spec/x.html');
    expect(feedback[1]).toContain('.github/copilot-instructions.md');
    expect(feedback[1]).toContain('CONTRIBUTING.md');
    expect(feedback[1]).not.toMatch(/clamp|rule-a|rule text/i);
    expect(result.evidence.termination.total).toBe(4);
    expect(result.evidence.usage.counters).toEqual([{ name: 'premiumRequests', unit: 'premium-requests', value: 1 }]);
  });

  it('parks after a second incomplete read with both attempts and measured usage reported', async () => {
    const { ports } = fixture();
    const feedback = realReview(ports, [reviewerResponse([]), reviewerResponse(standardsReads)]);
    const result = await runTask({ ...request(), index: reviewIndex, maxRepairs: 0 }, ports);
    expect(result.status).toBe('parked');
    expect(ports.review).toHaveBeenCalledTimes(2);
    expect(feedback[1]).toContain('spec/x.html');
    expect(result.evidence.diagnostics).toEqual([
      expect.objectContaining({ phase: 'review', message: expect.stringContaining('CONTRIBUTING.md') }),
      expect.objectContaining({ phase: 'review', message: expect.stringContaining('spec/x.html') }),
    ]);
    expect(result.evidence.diagnostics[1].message).not.toContain('CONTRIBUTING.md');
    expect(result.evidence.termination.total).toBe(4);
    expect(result.evidence.usage.counters).toEqual([{ name: 'premiumRequests', unit: 'premium-requests', value: 0.5 }]);
    expect(result.evidence.reviews).toEqual([]);
  });

  it('does not dispatch a missing-read retry when the existing total execution cap is exhausted', async () => {
    const { ports } = fixture();
    realReview(ports, [reviewerResponse([]), reviewerResponse([specRead, ...standardsReads])]);
    const result = await runTask({ ...request(), index: reviewIndex, maxAgentExecutions: 3 }, ports);
    expect(result.status).toBe('parked');
    expect(ports.review).toHaveBeenCalledTimes(1);
    expect(result.evidence.termination.total).toBe(3);
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/total limit/i);
    expect(result.evidence.usage.counters).toEqual([
      { name: 'premiumRequests', unit: 'premium-requests', value: 0.25 },
    ]);
  });

  it.each([
    ['write audit', { violations: [{ code: 'review_write', path: 'src/a.js' }] }, /audit/i],
    ['non-read-only tool', { outcome: { toolRequests: [{ name: 'edit', arguments: {} }] } }, /read-only/i],
    ['transport failure', { outcome: { status: 'failed' } }, /transport/i],
    ['malformed final JSON', { outcome: { messages: ['not JSON'] } }, /invalid JSON/i, true],
    ['invalid findings schema', { outcome: { messages: ['{}'] } }, /array/i, true],
  ])('does not retry %s after reaching its validation boundary', async (_, change, reason, readAll) => {
    const { ports } = fixture();
    const incomplete = reviewerResponse(readAll ? [specRead, ...standardsReads] : []);
    const first = {
      ...incomplete,
      ...change,
      outcome: { ...incomplete.outcome, ...change.outcome },
    };
    realReview(ports, [first, reviewerResponse([specRead, ...standardsReads])]);
    const result = await runTask({ ...request(), index: reviewIndex }, ports);
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(reason);
    expect(ports.review).toHaveBeenCalledTimes(1);
    expect(result.evidence.termination.total).toBe(3);
  });

  it('parks incomplete audit evidence without inventing an implementation finding', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.audit.mockResolvedValue([{ code: 'incomplete_evidence', path: null }]);
    // * ACT / ASSERT
    const result = await runTask(request(), ports);
    expect(result.status).toBe('parked');
    expect(result.findings).toEqual([]);
    expect(result.evidence.diagnostics[0].message).toContain('incomplete_evidence');
  });
  it.each([null, 'cancelled'])('retains a non-Error port failure: %s', async (reason) => {
    // * ARRANGE
    const { ports } = fixture();
    ports.baseline.mockRejectedValue(reason);
    // * ACT / ASSERT
    const result = await runTask(request(), ports);
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics[0].message).toBe(String(reason));
  });
  it('retains the author outcome and explicit binding parse failure before repair', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.test.mockResolvedValueOnce({
      outcome: { status: 'completed' },
      bindings: [],
      testFiles: [binding.file],
      bindingError: 'Invalid author JSON',
    });
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result.status).toBe('ready');
    expect(result.evidence.legs).toHaveLength(3);
    expect(result.evidence.diagnostics).toContainEqual({ phase: 'bindings', message: 'Invalid author JSON' });
  });
  it.each(['freezeTests', 'delta'])('does not accept missing %s evidence', async (port) => {
    // * ARRANGE
    const { ports } = fixture();
    ports[port].mockResolvedValue(undefined);
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('Missing') })
    );
  });
  it('parks incomplete audits and exhausted binding repair without calling RED', async () => {
    // * ARRANGE
    const first = fixture();
    first.ports.audit.mockResolvedValue(null);
    const second = fixture();
    second.ports.test.mockResolvedValue({ outcome: { status: 'completed' }, bindings: [], testFiles: [binding.file] });
    // * ACT / ASSERT
    expect((await runTask(request(), first.ports)).status).toBe('parked');
    const exhausted = await runTask({ ...request(), maxRepairs: 0 }, second.ports);
    expect(exhausted.status).toBe('parked');
    expect(exhausted.findings[0].code).toBe('unsupported_assertion');
    expect(second.ports.red).not.toHaveBeenCalled();
  });
  it('orders harness verdicts and audits before authorizing independent implementation', async () => {
    // * ARRANGE
    const { ports, events, token } = fixture();
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(events).toEqual([
      'baseline-green',
      'test',
      'audit-test',
      'red',
      'implement',
      'audit-implement',
      'green',
      'review',
    ]);
    expect(result).toMatchObject({
      taskId: 'A',
      status: 'ready',
      findings: [],
      evidence: { bindings: [binding], tests: token },
    });
    expect(result.delta).toEqual({ bytes: Buffer.from('patch'), changes: [] });
    expect(Object.isFrozen(result.evidence.bindings[0].criteria)).toBe(true);
  });
  it('requires a separate review after verified GREEN before accepting a task', async () => {
    // * ARRANGE
    const { ports, events } = fixture();
    // * ACT
    const accepted = await runTask(request(), ports);
    // * ASSERT
    expect(accepted.status).toBe('ready');
    expect(events.slice(-2)).toEqual(['green', 'review']);
    expect(accepted.evidence.reviews).toEqual([{ findings: [], route: 'done' }]);
  });
  it('routes a missing test through fresh test audit, baseline RED, candidate GREEN and re-review', async () => {
    // * ARRANGE
    const { ports, events, token } = fixture();
    const repaired = Object.freeze({ id: 'repaired-tests' });
    ports.freezeTests.mockResolvedValueOnce(token).mockResolvedValueOnce(repaired);
    ports.review
      .mockImplementationOnce(async () => {
        events.push('review');
        return [
          {
            code: 'missing_test',
            fault_domain: 'test',
            criteria: [...task.criteria],
            files: [],
            message: 'observable untested',
          },
        ];
      })
      .mockImplementationOnce(async () => {
        events.push('review');
        return [];
      });
    ports.red
      .mockImplementationOnce(ports.red.getMockImplementation())
      .mockImplementationOnce(async ({ baseline, tests }) => {
        expect(baseline).toBe('baseline-token');
        expect(tests).toBe(repaired);
        events.push('red-on-baseline');
        return red();
      });
    ports.green
      .mockImplementationOnce(ports.green.getMockImplementation())
      .mockImplementationOnce(async ({ tests }) => {
        expect(tests).toBe(repaired);
        events.push('green-on-candidate');
        return green();
      });
    // * ACT
    const outcome = await runTask({ ...request(), maxRepairs: 1 }, ports);
    // * ASSERT
    expect(outcome.status).toBe('ready');
    expect(events.slice(events.indexOf('review'))).toEqual([
      'review',
      'test',
      'audit-test',
      'red-on-baseline',
      'green-on-candidate',
      'review',
    ]);
    expect(ports.implement).toHaveBeenCalledTimes(1);
    expect(outcome.evidence.reviews).toHaveLength(2);
  });
  it('repairs implementation before re-review if a newly RED test fails on candidate source', async () => {
    // * ARRANGE
    const { ports, events } = fixture();
    ports.review.mockImplementationOnce(async () => {
      events.push('review');
      return [
        {
          code: 'missing_test',
          fault_domain: 'test',
          criteria: [...task.criteria],
          files: [binding.file],
          message: 'new assertion',
        },
      ];
    });
    ports.green.mockImplementationOnce(ports.green.getMockImplementation()).mockImplementationOnce(async () => {
      events.push('green-failed');
      return red();
    });
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 1 }, ports);
    // * ASSERT
    expect(result.status).toBe('ready');
    expect(events).toEqual([
      'baseline-green',
      'test',
      'audit-test',
      'red',
      'implement',
      'audit-implement',
      'green',
      'review',
      'test',
      'audit-test',
      'red',
      'green-failed',
      'implement',
      'audit-implement',
      'green',
      'review',
    ]);
    expect(result.evidence.history.map(({ phase }) => phase)).toEqual([
      'baseline',
      'red',
      'green',
      'red',
      'green',
      'green',
    ]);
  });
  it('routes an implementation finding through audited implementation, GREEN and re-review', async () => {
    // * ARRANGE
    const { ports, events } = fixture();
    ports.review
      .mockImplementationOnce(async () => {
        events.push('review');
        return [
          {
            code: 'wrong_behavior',
            fault_domain: 'implement',
            criteria: [...task.criteria],
            files: ['src/a.js'],
            message: 'expected behavior missing',
          },
        ];
      })
      .mockImplementationOnce(async () => {
        events.push('review');
        return [];
      });
    // * ACT
    const outcome = await runTask({ ...request(), maxRepairs: 1 }, ports);
    // * ASSERT
    expect(outcome.status).toBe('ready');
    expect(events.slice(events.indexOf('review'))).toEqual([
      'review',
      'implement',
      'audit-implement',
      'green',
      'review',
    ]);
    expect(ports.test).toHaveBeenCalledTimes(1);
  });
  it('cannot accept a changed test that passes on the frozen baseline', async () => {
    // * ARRANGE
    const { ports, token } = fixture();
    const repaired = Object.freeze({ id: 'repaired-tests' });
    ports.freezeTests.mockResolvedValueOnce(token).mockResolvedValueOnce(repaired);
    ports.red.mockResolvedValueOnce(red()).mockResolvedValue(green());
    ports.review.mockResolvedValueOnce([
      { code: 'missing_test', fault_domain: 'test', criteria: [...task.criteria], files: [], message: 'missing' },
    ]);
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 1 }, ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.findings[0].code).toBe('unsupported_assertion');
    expect(ports.green).toHaveBeenCalledTimes(1);
    expect(ports.review).toHaveBeenCalledTimes(1);
  });
  it('returns decompose findings to Gate 1 without changing approved ownership', async () => {
    // * ARRANGE
    const { ports } = fixture();
    const finding = {
      code: 'ownership_conflict',
      fault_domain: 'decompose',
      criteria: [...task.criteria],
      files: ['src/b.js'],
      message: 'another task owns src/b.js',
    };
    ports.review.mockResolvedValue([finding]);
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result).toMatchObject({ status: 'gate1', findings: [finding], delta: null });
    expect(ports.test).toHaveBeenCalledTimes(1);
    expect(ports.implement).toHaveBeenCalledTimes(1);
  });
  it('cannot skip an unavailable reviewer or claim an empty review from malformed findings', async () => {
    // * ARRANGE
    const first = fixture();
    delete first.ports.review;
    const second = fixture();
    second.ports.review.mockResolvedValue([{ code: 'invented', fault_domain: 'test' }]);
    // * ACT / ASSERT
    expect((await runTask(request(), first.ports)).status).toBe('parked');
    const result = await runTask(request(), second.ports);
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/review/i);
  });
  it('preserves mixed review findings and routes test before implementation without losing either fault', async () => {
    // * ARRANGE
    const { ports } = fixture();
    const testFinding = {
      code: 'missing_test',
      fault_domain: 'test',
      criteria: [...task.criteria],
      files: [binding.file],
      message: 'missing assertion',
    };
    const implementationFinding = {
      code: 'wrong_behavior',
      fault_domain: 'implement',
      criteria: [...task.criteria],
      files: ['src/a.js'],
      message: 'incorrect behavior',
    };
    ports.review
      .mockResolvedValueOnce([implementationFinding, testFinding])
      .mockResolvedValueOnce([implementationFinding]);
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 1 }, ports);
    // * ASSERT
    expect(result.status).toBe('ready');
    expect(result.evidence.reviews.map(({ route }) => route)).toEqual(['test', 'implement', 'done']);
    expect(result.evidence.reviews[0].findings).toEqual([implementationFinding, testFinding]);
    expect(ports.test).toHaveBeenCalledTimes(2);
    expect(ports.implement).toHaveBeenCalledTimes(2);
  });
  it('parks repeated reviewer faults at the repair boundary, keeping the final finding', async () => {
    // * ARRANGE
    const { ports } = fixture();
    const repeated = {
      code: 'wrong_behavior',
      fault_domain: 'implement',
      criteria: [...task.criteria],
      files: ['src/a.js'],
      message: 'still incorrect',
    };
    ports.review.mockResolvedValue([repeated]);
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 1 }, ports);
    // * ASSERT
    expect(result).toMatchObject({ status: 'parked', findings: [repeated], delta: null });
    expect(result.evidence.reviews).toHaveLength(2);
    expect(ports.implement).toHaveBeenCalledTimes(2);
  });
  it('parks a test finding when no backward test repair remains', async () => {
    const { ports } = fixture();
    const finding = {
      code: 'missing_test',
      fault_domain: 'test',
      criteria: [...task.criteria],
      files: [binding.file],
      message: 'Criterion untested',
    };
    ports.review.mockResolvedValue([finding]);
    const result = await runTask({ ...request(), maxRepairs: 0 }, ports);
    expect(result).toMatchObject({ status: 'parked', findings: [finding] });
    expect(ports.test).toHaveBeenCalledTimes(1);
    expect(ports.green).toHaveBeenCalledTimes(1);
  });
  it('parks an audited implementation failure after test repair makes candidate GREEN fail', async () => {
    const { ports } = fixture();
    ports.review.mockResolvedValueOnce([
      { code: 'missing_test', fault_domain: 'test', criteria: [...task.criteria], files: [], message: 'New assertion' },
    ]);
    ports.green.mockResolvedValueOnce(green()).mockResolvedValueOnce(red());
    ports.audit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ code: 'protected', path: 'spec/x.html' }]);
    const result = await runTask({ ...request(), maxRepairs: 1 }, ports);
    expect(result.status).toBe('parked');
    expect(result.findings[0].code).toBe('undeclared_file');
    expect(result.evidence.history.map(({ phase }) => phase)).toEqual(['baseline', 'red', 'green', 'red', 'green']);
    expect(ports.review).toHaveBeenCalledTimes(1);
  });
  it('parks a write-audit violation in an implementation repair before re-review', async () => {
    const { ports } = fixture();
    ports.review.mockResolvedValueOnce([
      { code: 'wrong_behavior', fault_domain: 'implement', criteria: [...task.criteria], files: [], message: 'Fix' },
    ]);
    ports.audit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ code: 'source_fence', path: 'src/a.test.js' }]);
    const result = await runTask({ ...request(), maxRepairs: 1 }, ports);
    expect(result.status).toBe('parked');
    expect(result.findings[0].code).toBe('undeclared_file');
    expect(ports.review).toHaveBeenCalledTimes(1);
  });
  it('parks a failing baseline without dispatching any agent', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.baseline.mockResolvedValue(red());
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(ports.test).not.toHaveBeenCalled();
    expect(ports.implement).not.toHaveBeenCalled();
  });
  it('bounds invalid-RED test repair and never calls implement or GREEN', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.red.mockResolvedValue(green());
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 1 }, ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(ports.test).toHaveBeenCalledTimes(2);
    expect(ports.implement).not.toHaveBeenCalled();
    expect(ports.green).not.toHaveBeenCalled();
    expect(result.findings[0]).toMatchObject({ code: 'unsupported_assertion', fault_domain: 'test' });
  });
  it('repairs GREEN without changing the immutable test version or reauthoring tests', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.green.mockResolvedValueOnce(red()).mockResolvedValueOnce(green());
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 1 }, ports);
    // * ASSERT
    expect(result.status).toBe('ready');
    expect(ports.test).toHaveBeenCalledTimes(1);
    expect(ports.implement).toHaveBeenCalledTimes(2);
    expect(ports.freezeTests).toHaveBeenCalledTimes(1);
  });
  it('bounds implementation repairs and retains failed evidence', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.green.mockResolvedValue(red());
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 0 }, ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.green.exitCode).toBe(1);
    expect(result.findings[0].code).toBe('wrong_behavior');
    expect(ports.delta).not.toHaveBeenCalled();
  });
  it.each(['test', 'implement'])('audits a failed %s transport before parking', async (leg) => {
    // * ARRANGE
    const { ports } = fixture();
    ports[leg].mockResolvedValue({ outcome: { status: 'failed' } });
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(ports.audit).toHaveBeenCalledWith(leg, expect.any(Object));
    expect(ports.delta).not.toHaveBeenCalled();
  });
  it.each(['test', 'implement'])('rejects %s writes without advancing to acceptance', async (leg) => {
    // * ARRANGE
    const { ports } = fixture();
    ports.audit.mockImplementation(async (current) =>
      current === leg ? [{ code: 'undeclared', path: 'outside.js' }] : []
    );
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.findings[0]).toMatchObject({ code: 'undeclared_file', files: ['outside.js'] });
    expect(ports.delta).not.toHaveBeenCalled();
  });
  it('does not run RED for invalid bindings and can repair their schema in a fresh test leg', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.test.mockResolvedValueOnce({ outcome: { status: 'completed' }, bindings: [], testFiles: [binding.file] });
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result.status).toBe('ready');
    expect(ports.test).toHaveBeenCalledTimes(2);
    expect(ports.red).toHaveBeenCalledTimes(1);
  });
  it('surfaces port failures without a success-shaped delta', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.delta.mockRejectedValue(new Error('snapshot changed'));
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result).toMatchObject({ status: 'parked', delta: null });
    expect(result.evidence.diagnostics).toContainEqual(expect.objectContaining({ message: 'snapshot changed' }));
  });
  it('parks a repeated reviewer fault before an exhausted repair cycle or agent cap can dispatch again', async () => {
    // * ARRANGE
    const { ports } = fixture();
    const fault = (location) => ({
      code: 'wrong_behavior',
      fault_domain: 'implement',
      criteria: [...task.criteria],
      files: ['src/a.js'],
      message: `wrong at src/a.js:${location}`,
    });
    ports.review.mockResolvedValueOnce([fault(42)]).mockResolvedValueOnce([fault(99)]);
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 1, maxAgentExecutions: 5 }, ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.findings).toEqual([fault(99)]);
    expect(result.evidence.diagnostics).toContainEqual(
      expect.objectContaining({ phase: 'budget', message: expect.stringMatching(/breaker|repeat/i) })
    );
    expect(ports.implement).toHaveBeenCalledTimes(2);
    expect(ports.review).toHaveBeenCalledTimes(2);
  });
  it('detects A -> B -> A reviewer faults across nonconsecutive repairs', async () => {
    // * ARRANGE
    const { ports } = fixture();
    const fault = (message) => ({
      code: 'wrong_behavior',
      fault_domain: 'implement',
      criteria: [...task.criteria],
      files: [],
      message,
    });
    ports.review
      .mockResolvedValueOnce([fault('expected 2')])
      .mockResolvedValueOnce([fault('expected 3')])
      .mockResolvedValueOnce([fault('expected 2')]);
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 3 }, ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/breaker|repeat/i);
    expect(ports.implement).toHaveBeenCalledTimes(3);
    expect(ports.review).toHaveBeenCalledTimes(3);
  });
  it('counts every initial agent leg and parks before review when the total cap is two', async () => {
    // * ARRANGE
    const { ports } = fixture();
    // * ACT
    const result = await runTask({ ...request(), maxAgentExecutions: 2 }, ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.termination.total).toBe(2);
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/total/i);
    expect(ports.test).toHaveBeenCalledTimes(1);
    expect(ports.implement).toHaveBeenCalledTimes(1);
    expect(ports.red).toHaveBeenCalledTimes(1);
    expect(ports.green).toHaveBeenCalledTimes(1);
    expect(ports.review).not.toHaveBeenCalled();
  });
  it('parks before starting implementation when the initial test author used the only agent slot', async () => {
    // * ARRANGE
    const { ports } = fixture();
    // * ACT
    const result = await runTask({ ...request(), maxAgentExecutions: 1 }, ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.termination.total).toBe(1);
    expect(result.evidence.red).toBeDefined();
    expect(ports.implement).not.toHaveBeenCalled();
    expect(ports.review).not.toHaveBeenCalled();
  });
  it('applies the target profile limits without changing test verdicts or adding a gate', async () => {
    // * ARRANGE
    const { ports } = fixture();
    // * ACT
    const result = await runTask({ ...request(), target: { budgets: { cycle: 3, total: 2 } } }, ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.termination.total).toBe(2);
    expect(result.evidence.history.find(({ phase }) => phase === 'red').verdict.status).toBe('RED');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/total/i);
    expect(ports.review).not.toHaveBeenCalled();
  });
  it('bounds repeated invalid RED with a breaker without authorizing implementation', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.red.mockResolvedValue(green());
    // * ACT
    const result = await runTask({ ...request(), maxRepairs: 3 }, ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/breaker|repeat/i);
    expect(ports.test).toHaveBeenCalledTimes(2);
    expect(ports.implement).not.toHaveBeenCalled();
  });
  it('aggregates fractional terminal usage once per attempted agent call, ignoring checkpoint totals', async () => {
    // * ARRANGE
    const { ports } = fixture();
    const usage = (value) => ({
      counters: [{ name: 'premiumRequests', unit: 'premium-requests', value }],
      apiDurationMs: 10,
      durationMs: 20,
      checkpoints: [{ counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 99 }] }],
    });
    ports.test.mockResolvedValue({
      outcome: { status: 'completed', usage: usage(0.25) },
      bindings: [binding],
      testFiles: [binding.file],
    });
    ports.implement.mockResolvedValue({ outcome: { status: 'completed', usage: usage(0.5) } });
    ports.review.mockImplementation(async ({ reportUsage }) => {
      reportUsage(usage(0.75));
      return [];
    });
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result.status).toBe('ready');
    expect(result.evidence.usage).toEqual({
      counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 1.5 }],
      apiDurationMs: 30,
      durationMs: 60,
      complete: true,
      missingExecutions: 0,
    });
    expect(result.evidence.termination.total).toBe(3);
  });
  it('flags missing usage on failed agent transport instead of charging zero', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.test.mockResolvedValue({ outcome: { status: 'failed' } });
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.termination.total).toBe(1);
    expect(result.evidence.usage).toMatchObject({ complete: false, missingExecutions: 1, counters: [] });
  });
  it('rejects a reviewer that reports terminal usage twice without counting it twice', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.review.mockImplementation(async ({ reportUsage }) => {
      reportUsage({ counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 1 }] });
      reportUsage({ counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 1 }] });
      return [];
    });
    // * ACT
    const result = await runTask(request(), ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/reported twice/i);
    expect(result.evidence.usage.counters).toEqual([{ name: 'premiumRequests', unit: 'premium-requests', value: 1 }]);
  });
  it('rejects invalid repair limits before running work', async () => {
    // * ARRANGE
    const { ports } = fixture();
    // * ACT / ASSERT
    await expect(runTask({ ...request(), maxRepairs: -1 }, ports)).rejects.toThrow(/repair/i);
    await expect(runTask({ ...request(), target: { budgets: { cycle: -1, total: 15 } } }, ports)).rejects.toThrow(
      /repair|budget/i
    );
    expect(ports.baseline).not.toHaveBeenCalled();
  });
});

describe('test bindings', () => {
  it.each(
    [
      [],
      [binding, binding],
      [{ ...binding, id: 'wrong' }],
      [{ ...binding, file: 'src/a.js', id: 'src/a.js::rule-a' }],
      [{ ...binding, criteria: ['spec/x.html#invented'] }],
      [{ ...binding, criteria: [] }],
      [{ ...binding, verdict: 'RED' }],
    ].map((bindings) => ({ bindings }))
  )('rejects incomplete or agent-certified bindings %j', ({ bindings }) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => validateBindings(bindings, task, [binding.file])).toThrow();
  });
  it('requires all task criteria and preserves frozen anchor-only copies', () => {
    // * ARRANGE / ACT / ASSERT
    expect(() =>
      validateBindings([binding], { ...task, criteria: [...task.criteria, 'spec/x.html#other'] }, [binding.file])
    ).toThrow(/criteria/);
    const validated = validateBindings([binding], task, [binding.file]);
    expect(validated).toEqual([binding]);
    expect(validated[0]).not.toBe(binding);
    expect(Object.isFrozen(validated)).toBe(true);
  });
});
