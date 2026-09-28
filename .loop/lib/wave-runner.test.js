// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { runWave } from './wave-runner.mjs';

const tasks = [
  { id: 'A', criteria: ['spec/x.html#a'], files_modified: ['a.js'] },
  { id: 'B', criteria: ['spec/x.html#b'], files_modified: ['b.js'] },
];
const green = () => ({
  exitCode: 0,
  complete: true,
  errors: [],
  tests: [{ id: 'test.js::suite', file: 'test.js', name: 'suite', status: 'passed', failureKind: null, message: '' }],
});
const ready = (task) => ({
  taskId: task.id,
  status: 'ready',
  evidence: {},
  findings: [],
  delta: {
    bytes: Buffer.from(task.id),
    changes: task.files_modified.map((file) => ({ path: file, before: null, after: 'new' })),
  },
});
function fixture() {
  const events = [];
  return {
    events,
    ports: {
      runTask: vi.fn(async ({ task }) => {
        events.push(`run-${task.id}`);
        return ready(task);
      }),
      createCandidate: vi.fn(async (baseline) => {
        expect(baseline).toBe('baseline');
        events.push('candidate');
        return 'candidate';
      }),
      apply: vi.fn(async (_, patch) => {
        events.push(`apply-${patch.bytes.toString()}`);
      }),
      fullSuite: vi.fn(async () => {
        events.push('suite');
        return green();
      }),
      acceptCandidate: vi.fn(async () => {
        events.push('accept');
        return 'accepted-baseline';
      }),
      discardCandidate: vi.fn(async () => {
        events.push('discard');
      }),
    },
  };
}
const request = () => ({ tasks, target: {}, baseline: 'baseline' });

describe('concurrent wave barriers', () => {
  it.each(['apply', 'discardCandidate'])(
    'reports a non-Error %s rejection without losing the barrier failure',
    async (port) => {
      // * ARRANGE
      const { ports } = fixture();
      if (port === 'discardCandidate') {
        ports.fullSuite.mockResolvedValue({ ...green(), exitCode: 1 });
      }
      ports[port].mockRejectedValue('cancelled');
      // * ACT
      const result = await runWave(request(), ports);
      // * ASSERT
      expect(result.status).toBe('parked');
      expect(result.diagnostics).toContainEqual(expect.objectContaining({ message: 'cancelled' }));
      expect(ports.acceptCandidate).not.toHaveBeenCalled();
    }
  );
  it.each([null, 'cancelled'])('retains a non-Error task rejection: %s', async (reason) => {
    // * ARRANGE
    const { ports } = fixture();
    ports.runTask.mockRejectedValueOnce(reason);
    // * ACT / ASSERT
    const result = await runWave(request(), ports);
    expect(result.status).toBe('parked');
    expect(result.diagnostics[0].message).toBe(String(reason));
  });
  it.each([null, {}, { path: null }])(
    'rejects malformed delta entries without trusting their paths',
    async (change) => {
      // * ARRANGE
      const { ports } = fixture();
      ports.runTask.mockResolvedValueOnce({
        ...ready(tasks[0]),
        delta: { bytes: Buffer.from('A'), changes: [change] },
      });
      // * ACT / ASSERT
      expect((await runWave(request(), ports)).status).toBe('parked');
      expect(ports.createCandidate).not.toHaveBeenCalled();
    }
  );
  it('rejects a missing candidate without invoking the suite or accepting a baseline', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.createCandidate.mockResolvedValue(undefined);
    // * ACT / ASSERT
    expect((await runWave(request(), ports)).status).toBe('parked');
    expect(ports.fullSuite).not.toHaveBeenCalled();
  });
  it('does not execute an empty wave', async () => {
    // * ARRANGE
    const { ports } = fixture();
    // * ACT / ASSERT
    await expect(runWave({ ...request(), tasks: [] }, ports)).rejects.toThrow('nonempty');
    expect(ports.createCandidate).not.toHaveBeenCalled();
  });
  it('starts all siblings and drains them before applying in stable plan order', async () => {
    // * ARRANGE
    const { ports, events } = fixture();
    const a = Promise.withResolvers();
    const b = Promise.withResolvers();
    ports.runTask.mockImplementation(({ task }) => {
      events.push(`run-${task.id}`);
      return task.id === 'A' ? a.promise : b.promise;
    });
    // * ACT
    const pending = runWave(request(), ports);
    await new Promise(setImmediate);
    // * ASSERT
    expect(events).toEqual(['run-A', 'run-B']);
    b.resolve(ready(tasks[1]));
    await new Promise(setImmediate);
    expect(ports.createCandidate).not.toHaveBeenCalled();
    a.resolve(ready(tasks[0]));
    expect(await pending).toMatchObject({ status: 'ready', baseline: 'accepted-baseline' });
    expect(events).toEqual(['run-A', 'run-B', 'candidate', 'apply-A', 'apply-B', 'suite', 'accept']);
    expect(ports.discardCandidate).not.toHaveBeenCalled();
  });
  it('waits for a running sibling after another task parks and retains completed deltas', async () => {
    // * ARRANGE
    const { ports } = fixture();
    const b = Promise.withResolvers();
    ports.runTask.mockImplementation(({ task }) =>
      task.id === 'A' ? Promise.resolve({ ...ready(task), status: 'parked', delta: null }) : b.promise
    );
    let returned = false;
    const pending = runWave(request(), ports).then((result) => {
      returned = true;
      return result;
    });
    // * ACT / ASSERT
    await new Promise(setImmediate);
    expect(returned).toBe(false);
    b.resolve(ready(tasks[1]));
    const result = await pending;
    expect(result.status).toBe('parked');
    expect(result.tasks[1].delta).toEqual(ready(tasks[1]).delta);
    expect(ports.createCandidate).not.toHaveBeenCalled();
  });
  it('surfaces all parked budget reasons after draining siblings and preserves incomplete usage', async () => {
    // * ARRANGE
    const { ports } = fixture();
    const later = Promise.withResolvers();
    ports.runTask.mockImplementation(({ task }) =>
      task.id === 'A'
        ? {
            taskId: 'A',
            status: 'parked',
            delta: null,
            evidence: {
              diagnostics: [{ phase: 'budget', message: 'Repeated test signature' }],
              usage: {
                counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 0.5 }],
                complete: true,
                missingExecutions: 0,
              },
            },
          }
        : later.promise
    );
    const pending = runWave(request(), ports);
    await new Promise(setImmediate);
    // * ACT
    later.resolve({
      taskId: 'B',
      status: 'parked',
      delta: null,
      evidence: {
        diagnostics: [{ phase: 'budget', message: 'Total agent limit exhausted' }],
        usage: { counters: [], complete: false, missingExecutions: 1 },
      },
    });
    const result = await pending;
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.diagnostics).toEqual([
      { phase: 'budget', taskId: 'A', message: 'Repeated test signature' },
      { phase: 'budget', taskId: 'B', message: 'Total agent limit exhausted' },
    ]);
    expect(result.usage).toMatchObject({
      counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 0.5 }],
      complete: false,
      missingExecutions: 1,
    });
    expect(ports.createCandidate).not.toHaveBeenCalled();
  });
  it('captures synchronous task failures without abandoning later siblings', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.runTask.mockImplementation(({ task }) => {
      if (task.id === 'A') throw new Error('task failed');
      return ready(task);
    });
    // * ACT
    const result = await runWave(request(), ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(ports.runTask).toHaveBeenCalledTimes(2);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ message: 'task failed' }));
    expect(ports.createCandidate).not.toHaveBeenCalled();
  });
  it('returns Gate 1 after draining decomposition faults rather than silently changing ownership', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.runTask
      .mockResolvedValueOnce({
        ...ready(tasks[0]),
        status: 'gate1',
        delta: null,
        findings: [
          {
            code: 'ownership_conflict',
            fault_domain: 'decompose',
            criteria: tasks[0].criteria,
            files: ['b.js'],
            message: 'File belongs to another task',
          },
        ],
      })
      .mockResolvedValueOnce(ready(tasks[1]));
    // * ACT / ASSERT
    expect((await runWave(request(), ports)).status).toBe('gate1');
    expect(ports.createCandidate).not.toHaveBeenCalled();
  });
  it('drains every sibling and presents all anchored decomposition faults at the same Gate 1 barrier', async () => {
    // * ARRANGE
    const { ports } = fixture();
    const later = Promise.withResolvers();
    const a = {
      code: 'ownership_conflict',
      fault_domain: 'decompose',
      criteria: [...tasks[0].criteria],
      files: ['b.js'],
      message: 'A needs a file owned by B',
    };
    const b = {
      code: 'unobservable_anchor',
      fault_domain: 'decompose',
      criteria: [...tasks[1].criteria],
      files: [],
      message: 'B has no observable behavior',
    };
    ports.runTask.mockImplementation(({ task }) =>
      task.id === 'A' ? { ...ready(task), status: 'gate1', findings: [a], delta: null } : later.promise
    );
    let settled = false;
    const pending = runWave(request(), ports).then((result) => {
      settled = true;
      return result;
    });
    // * ACT
    await new Promise(setImmediate);
    expect(settled).toBe(false);
    later.resolve({ ...ready(tasks[1]), status: 'gate1', findings: [b], delta: null });
    const result = await pending;
    // * ASSERT
    expect(result.status).toBe('gate1');
    expect(result.findings).toEqual([a, b]);
    expect(ports.createCandidate).not.toHaveBeenCalled();
  });
  it('parks malformed task Gate 1 evidence rather than presenting fabricated findings to a human', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.runTask.mockResolvedValueOnce({
      ...ready(tasks[0]),
      status: 'gate1',
      delta: null,
      findings: [
        { code: 'unknown', fault_domain: 'decompose', criteria: ['spec/x.html#a'], files: [], message: 'bad' },
      ],
    });
    // * ACT / ASSERT
    const result = await runWave(request(), ports);
    expect(result.status).toBe('parked');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ taskId: 'A', message: expect.any(String) }));
    expect(ports.createCandidate).not.toHaveBeenCalled();
  });
  it('parks a valid non-decomposition fault presented as a Gate 1 result', async () => {
    const { ports } = fixture();
    ports.runTask.mockResolvedValueOnce({
      ...ready(tasks[0]),
      status: 'gate1',
      delta: null,
      findings: [
        {
          code: 'wrong_behavior',
          fault_domain: 'implement',
          criteria: [...tasks[0].criteria],
          files: [],
          message: 'Implementation still wrong',
        },
      ],
    });
    const result = await runWave(request(), ports);
    expect(result.status).toBe('parked');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ message: expect.stringMatching(/decomposition/i) })
    );
  });
  it.each(['overlap', 'undeclared'])('rejects %s changes before creating a candidate', async (kind) => {
    // * ARRANGE
    const { ports } = fixture();
    const conflictingTasks = kind === 'overlap' ? [tasks[0], { ...tasks[1], files_modified: ['a.js'] }] : tasks;
    if (kind === 'undeclared')
      ports.runTask.mockResolvedValueOnce({
        ...ready(tasks[0]),
        delta: { bytes: Buffer.from('A'), changes: [{ path: 'outside.js' }] },
      });
    // * ACT
    const result = await runWave({ ...request(), tasks: conflictingTasks }, ports);
    // * ASSERT
    expect(result.status).toBe('gate1');
    expect(result.findings[0].code).toBe('ownership_conflict');
    expect(ports.createCandidate).not.toHaveBeenCalled();
  });
  it.each(['apply', 'fullSuite', 'acceptCandidate'])(
    'discards a failed %s candidate without accepting it',
    async (operation) => {
      // * ARRANGE
      const { ports } = fixture();
      ports[operation].mockRejectedValue(new Error(`${operation} failed`));
      // * ACT
      const result = await runWave(request(), ports);
      // * ASSERT
      expect(result.status).toBe('parked');
      expect(result.baseline).toBe('baseline');
      expect(result.diagnostics).toContainEqual(expect.objectContaining({ message: `${operation} failed` }));
      expect(ports.discardCandidate).toHaveBeenCalledWith('candidate');
    }
  );
  it('blocks integration regressions and surfaces cleanup errors', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.fullSuite.mockResolvedValue({ ...green(), exitCode: 1 });
    ports.discardCandidate.mockRejectedValue(new Error('cleanup failed'));
    // * ACT
    const result = await runWave(request(), ports);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(ports.acceptCandidate).not.toHaveBeenCalled();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ message: 'cleanup failed' }));
  });
  it('allows empty byte deltas but rejects mismatched task identities and missing acceptance receipts', async () => {
    // * ARRANGE
    const { ports } = fixture();
    ports.runTask.mockResolvedValueOnce({ ...ready(tasks[0]), delta: { bytes: Buffer.alloc(0), changes: [] } });
    ports.acceptCandidate.mockResolvedValue(undefined);
    // * ACT / ASSERT
    expect((await runWave(request(), ports)).status).toBe('parked');
    const other = fixture();
    other.ports.runTask.mockResolvedValueOnce({ ...ready(tasks[0]), taskId: 'wrong' });
    expect((await runWave(request(), other.ports)).status).toBe('parked');
    expect(other.ports.createCandidate).not.toHaveBeenCalled();
  });
});
