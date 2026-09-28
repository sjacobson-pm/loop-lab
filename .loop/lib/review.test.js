// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { resolveStandards, reviewTask, routeFindings, validateFindings } from './review.mjs';

const task = {
  id: 'A',
  criteria: ['spec/x.html#rule-a'],
  files_modified: ['src/a.js', 'src/a.test.js'],
};
const index = { criteria: [{ anchor: task.criteria[0] }], context: [], spec_path: 'spec/x.html' };
const finding = (code, fault_domain, overrides = {}) => ({
  code,
  fault_domain,
  criteria: [...task.criteria],
  files: [],
  message: code,
  ...overrides,
});
const approval = {
  references: [],
  records: [],
  missingRequired: [],
};
const review = (overrides = {}) => ({
  outcome: {
    status: 'completed',
    messages: [JSON.stringify([])],
    reportedWrites: [],
    toolRequests: [],
    ...overrides,
  },
  violations: [],
});
const request = () => ({
  task,
  index,
  evidence: { bindings: [], red: { complete: true }, green: { complete: true } },
  delta: { changes: [], bytes: Buffer.alloc(0) },
  standards: approval,
});

describe('review findings and routing', () => {
  it.each([
    ['missing_test', 'test', 'test'],
    ['unsupported_assertion', 'test', 'test'],
    ['wrong_behavior', 'implement', 'implement'],
    ['standards', 'implement', 'implement'],
    ['undeclared_file', 'implement', 'implement'],
    ['contradictory_anchor', 'decompose', 'decompose'],
    ['unobservable_anchor', 'decompose', 'decompose'],
    ['ownership_conflict', 'decompose', 'decompose'],
  ])('%s routes to its responsible %s leg', (code, domain, destination) => {
    expect(routeFindings([finding(code, domain)])).toBe(destination);
  });

  it('routes mixed findings to Gate 1 first, then test, then implement, retaining every finding', () => {
    const findings = [
      finding('wrong_behavior', 'implement'),
      finding('missing_test', 'test'),
      finding('contradictory_anchor', 'decompose'),
    ];
    expect(routeFindings(findings)).toBe('decompose');
    expect(routeFindings(findings.slice(0, 2))).toBe('test');
    expect(routeFindings(findings.slice(0, 1))).toBe('implement');
    expect(routeFindings([])).toBe('done');
    expect(validateFindings(findings, task, index)).toEqual(findings);
  });

  it.each([
    [null, 'array'],
    [[finding('missing_test', 'implement')], 'domain'],
    [[finding('unrecognized', 'test')], 'code'],
    [[finding('missing_test', 'test', { criteria: ['spec/x.html#unknown'] })], 'anchor'],
    [[finding('missing_test', 'test', { criteria: [] })], 'criteria'],
    [[finding('missing_test', 'test', { files: ['../outside'] })], 'path'],
    [[finding('missing_test', 'test', { message: '' })], 'message'],
    [[finding('missing_test', 'test', { verdict: 'GREEN' })], 'fields'],
    [[finding('missing_test', 'test', { files: null })], 'path list'],
    [[finding('missing_test', 'test', { criteria: ['bare-anchor'] })], 'anchor'],
  ])('rejects malformed reviewer output instead of treating it as a clean review: %s', (input, problem) => {
    expect(() => validateFindings(input, task, index)).toThrow(new RegExp(problem, 'i'));
  });
  it('rejects a malformed anchor index even for an otherwise empty review', () => {
    expect(() => validateFindings([], task, { criteria: null })).toThrow(/context/i);
  });
});

describe('standards resolution', () => {
  it('rejects unknown stacks, malformed catalogs, malformed required lists, and unconfigured required identities', () => {
    const configured = { organization: [], local: [], repository: [], guidelines: [], required: [] };
    const available = { organization: [], local: [], repository: [], guidelines: [] };
    const resolve = (overrides = {}) =>
      resolveStandards({ stack: 'react-vitest', configured, available, ...overrides });
    expect(() => resolve({ stack: 'other' })).toThrow(/stack/i);
    expect(() => resolve({ available: { ...available, organization: ['dup', 'dup'] } })).toThrow(/catalog/i);
    expect(() => resolve({ configured: { ...configured, required: ['dup', 'dup'] } })).toThrow(/required/i);
    expect(() => resolve({ configured: { ...configured, required: ['organization:unconfigured'] } })).toThrow(
      /not configured/i
    );
  });
  it('resolves organization first and then available repository guidance, recording optional misses', () => {
    const result = resolveStandards({
      stack: 'react-vitest',
      configured: {
        organization: ['org-review', 'org-missing'],
        local: ['pa-review-dotnet', 'pa-review-dotnet-security'],
        repository: ['.github/copilot-instructions.md', 'CONTRIBUTING.md'],
        guidelines: ['github-process-docs'],
        required: [],
      },
      available: {
        organization: ['org-review'],
        local: ['pa-review-dotnet', 'pa-review-dotnet-security'],
        repository: ['CONTRIBUTING.md'],
        guidelines: ['github-process-docs'],
      },
    });
    expect(result.references).toEqual([
      { kind: 'organization', id: 'org-review' },
      { kind: 'repository', id: 'CONTRIBUTING.md' },
    ]);
    expect(result.records).toContainEqual({ kind: 'organization', id: 'org-missing', status: 'missing' });
    expect(result.records).toContainEqual({ kind: 'local', id: 'pa-review-dotnet', status: 'incompatible' });
    expect(result.missingRequired).toEqual([]);
  });

  it('orders .NET skills before repository guidance and C# guidelines, with required misses blocking review', async () => {
    const result = resolveStandards({
      stack: 'dotnet-xunit',
      configured: {
        organization: ['org-required'],
        local: ['pa-review-dotnet', 'pa-review-dotnet-security'],
        repository: ['.github/copilot-instructions.md'],
        guidelines: ['github-process-docs'],
        required: ['organization:org-required'],
      },
      available: {
        organization: [],
        local: ['pa-review-dotnet', 'pa-review-dotnet-security'],
        repository: ['.github/copilot-instructions.md'],
        guidelines: ['github-process-docs'],
      },
    });
    expect(result.references.map(({ id }) => id)).toEqual([
      'pa-review-dotnet',
      'pa-review-dotnet-security',
      '.github/copilot-instructions.md',
      'github-process-docs',
    ]);
    expect(result.missingRequired).toEqual(['organization:org-required']);
    const ports = { review: vi.fn(async () => review()) };
    await expect(reviewTask({ ...request(), standards: result }, ports)).rejects.toThrow(/required.*org-required/i);
    expect(ports.review).not.toHaveBeenCalled();
  });
});

describe('independent reviewer boundary', () => {
  it('rejects missing standards resolution before dispatching a reviewer', async () => {
    const ports = { review: vi.fn(async () => review()) };
    await expect(reviewTask({ ...request(), standards: null }, ports)).rejects.toThrow(/standards resolution/i);
    expect(ports.review).not.toHaveBeenCalled();
  });
  it('accepts only a clean audited judgment and preserves its complete anchored findings', async () => {
    // * ARRANGE
    const findings = [finding('missing_test', 'test'), finding('wrong_behavior', 'implement')];
    const ports = { review: vi.fn(async () => review({ messages: [JSON.stringify(findings)] })) };
    const input = request();
    // * ACT
    const accepted = await reviewTask(input, ports);
    // * ASSERT
    expect(accepted).toEqual(findings);
    expect(Object.isFrozen(accepted[0].criteria)).toBe(true);
    expect(ports.review).toHaveBeenCalledWith(input);
    expect(routeFindings(accepted)).toBe('test');
  });

  it('validates the final JSON findings after read-only tool narration', async () => {
    const messages = [
      'Reading the harness input file .loop/task-context.json to gather anchors, file lists, and reports for review. Running a file read.',
      'Reading source and test files to verify behavior against the anchored rule. Running parallel reads of src/a.js and src/a.test.js.',
      '[]',
    ];
    const result = review({
      sessionId: 'review-session',
      exitCode: 0,
      usage: {
        counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 0 }],
        apiDurationMs: 15767,
        durationMs: 26125,
      },
      diagnostics: [],
      toolRequests: [
        { name: 'view', arguments: { path: '.loop/task-context.json' } },
        { name: 'view', arguments: { path: 'src/a.js' } },
        { name: 'view', arguments: { path: 'src/a.test.js' } },
      ],
      messages,
    });
    const accepted = await reviewTask(request(), { review: async () => result });
    expect(accepted).toEqual([]);
    expect(routeFindings(accepted)).toBe('done');
    expect(result.outcome.messages).toEqual(messages);
  });

  it.each([
    ['transport failure', { outcome: { ...review().outcome, status: 'failed' } }, /transport/i],
    ['missing audit', { violations: null }, /audit/i],
    ['physical reviewer write', { violations: [{ code: 'undeclared', path: 'src/a.js' }] }, /audit/i],
    [
      'failed transport with a physical write',
      { outcome: { ...review().outcome, status: 'failed' }, violations: [{ code: 'review_write', path: 'src/a.js' }] },
      /review_write/i,
    ],
    [
      'failed transport with an incomplete audit',
      {
        outcome: {
          ...review().outcome,
          status: 'failed',
          diagnostics: [{ code: 'transport', message: 'Independent reviewer transport broke' }],
        },
        violations: [{ code: 'incomplete_evidence', path: null }],
      },
      /Independent reviewer transport broke/,
    ],
    ['reported write', { outcome: { ...review().outcome, reportedWrites: ['src/a.js'] } }, /write/i],
    ['attempted write', { outcome: { ...review().outcome, toolRequests: [{ name: 'edit' }] } }, /write/i],
    ['invalid tool telemetry', { outcome: { ...review().outcome, toolRequests: [null] } }, /read-only/i],
    ['missing final message', { outcome: { ...review().outcome, messages: [] } }, /JSON findings array/i],
    ['invalid JSON', { outcome: { ...review().outcome, messages: ['not JSON'] } }, /invalid JSON/i],
    [
      'invalid final JSON after narration',
      { outcome: { ...review().outcome, messages: ['Reading files.', 'not JSON'] } },
      /invalid JSON/i,
    ],
    [
      'invalid final findings after narration',
      { outcome: { ...review().outcome, messages: ['Reading files.', '{}'] } },
      /array/i,
    ],
  ])('parks %s rather than calling it an empty review', async (_, overrides, reason) => {
    // * ARRANGE
    const ports = { review: async () => ({ ...review(), ...overrides }) };
    // * ACT / ASSERT
    await expect(reviewTask(request(), ports)).rejects.toThrow(reason);
  });
});
