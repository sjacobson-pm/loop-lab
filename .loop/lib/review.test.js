// @vitest-environment node
import path from 'node:path';
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
const reviewerWorktree = path.resolve('review-standards-root');
const repositoryStandards = {
  ...approval,
  references: [
    { kind: 'repository', id: '.github/copilot-instructions.md' },
    { kind: 'repository', id: 'CONTRIBUTING.md' },
  ],
};
const viewed = (file) => ({ name: 'view', arguments: { path: file } });
const review = (overrides = {}) => ({
  outcome: {
    status: 'completed',
    messages: [JSON.stringify([])],
    reportedWrites: [],
    toolRequests: [viewed('spec/x.html')],
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
  worktree: reviewerWorktree,
});
const repositoryRequest = () => ({ ...request(), standards: repositoryStandards, worktree: reviewerWorktree });

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
  it('accepts a reviewer that opened the spec and every resolved repository standard', async () => {
    const toolRequests = [
      viewed(path.join(reviewerWorktree, 'spec/x.html')),
      viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')),
      viewed(path.join(reviewerWorktree, 'CONTRIBUTING.md')),
    ];
    expect(await reviewTask(repositoryRequest(), { review: async () => review({ toolRequests }) })).toEqual([]);
  });

  it('rejects a reviewer that opened both standards but not the spec', async () => {
    const toolRequests = [
      viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')),
      viewed(path.join(reviewerWorktree, 'CONTRIBUTING.md')),
    ];
    await expect(reviewTask(repositoryRequest(), { review: async () => review({ toolRequests }) })).rejects.toThrow(
      /incomplete review evidence.*spec\/x\.html/i
    );
  });

  it.each([
    ['a similarly named file outside the review worktree', viewed(path.resolve(reviewerWorktree, '..', 'spec/x.html'))],
    ['a similarly named nested file', viewed(path.join(reviewerWorktree, 'other/spec/x.html'))],
    ['a grep of the spec', { name: 'grep', arguments: { path: path.join(reviewerWorktree, 'spec/x.html') } }],
    ['a view without path arguments', { name: 'view', arguments: {} }],
    ['a view with null arguments', { name: 'view', arguments: null }],
    ['a view with a non-string path', { name: 'view', arguments: { path: 42 } }],
  ])('does not count %s as an opened spec', async (_, request) => {
    const toolRequests = [
      viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')),
      viewed(path.join(reviewerWorktree, 'CONTRIBUTING.md')),
      request,
    ];
    await expect(reviewTask(repositoryRequest(), { review: async () => review({ toolRequests }) })).rejects.toThrow(
      /incomplete review evidence.*spec\/x\.html/i
    );
  });

  it('requires a spec read even when no repository standards are resolved', async () => {
    await expect(reviewTask(request(), { review: async () => review({ toolRequests: [] }) })).rejects.toThrow(
      /incomplete review evidence.*spec\/x\.html/i
    );
  });

  it('still rejects missing standards after opening the spec', async () => {
    const toolRequests = [
      viewed(path.join(reviewerWorktree, 'spec/x.html')),
      viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')),
    ];
    await expect(reviewTask(repositoryRequest(), { review: async () => review({ toolRequests }) })).rejects.toThrow(
      /incomplete review evidence.*CONTRIBUTING\.md/i
    );
  });

  it('requires the reviewer worktree root to verify a spec read', async () => {
    await expect(reviewTask({ ...request(), worktree: undefined }, { review: async () => review() })).rejects.toThrow(
      /review worktree/i
    );
  });

  it('accepts findings after opening every resolved repository standard in the review worktree', async () => {
    const outcome = review({
      toolRequests: [
        viewed('spec/x.html'),
        viewed(path.join(reviewerWorktree, '.github', 'copilot-instructions.md')),
        viewed(path.join(reviewerWorktree, 'CONTRIBUTING.md')),
      ],
    });
    expect(await reviewTask(repositoryRequest(), { review: async () => outcome })).toEqual([]);
  });

  it('matches relative standard reads and Windows case and separator variants to exact resolved paths', async () => {
    const contributing = path.join(reviewerWorktree, 'CONTRIBUTING.md');
    const alias = process.platform === 'win32' ? contributing.replaceAll('\\', '/').toUpperCase() : contributing;
    const outcome = review({
      toolRequests: [viewed('spec/x.html'), viewed('.github/copilot-instructions.md'), viewed(alias)],
    });
    expect(await reviewTask(repositoryRequest(), { review: async () => outcome })).toEqual([]);
  });

  it('requires exact standard path case on non-Windows platforms', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { ...descriptor, value: 'linux' });
    try {
      const outcome = review({
        toolRequests: [
          viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')),
          viewed(path.join(reviewerWorktree, 'contributing.md')),
        ],
      });
      await expect(reviewTask(repositoryRequest(), { review: async () => outcome })).rejects.toThrow(
        /incomplete review evidence.*CONTRIBUTING\.md/i
      );
    } finally {
      Object.defineProperty(process, 'platform', descriptor);
    }
  });

  it('rejects a reviewer that opened no resolved repository standards', async () => {
    await expect(
      reviewTask(repositoryRequest(), {
        review: async () => review({ toolRequests: [viewed(path.join(reviewerWorktree, 'src/a.js'))] }),
      })
    ).rejects.toThrow(/incomplete review evidence.*copilot-instructions\.md.*CONTRIBUTING\.md/i);
  });

  it.each([
    ['only the first standard', [viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md'))]],
    [
      'the first standard plus a similarly named unrelated file',
      [
        viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')),
        viewed(path.join(reviewerWorktree, 'nested/CONTRIBUTING.md')),
      ],
    ],
    [
      'the first standard plus a grep of the other',
      [
        viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')),
        { name: 'grep', arguments: { path: path.join(reviewerWorktree, 'CONTRIBUTING.md') } },
      ],
    ],
    [
      'the first standard plus a path outside the review worktree',
      [
        viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')),
        viewed(path.resolve(reviewerWorktree, '..', 'CONTRIBUTING.md')),
      ],
    ],
    [
      'the first standard plus a view without path arguments',
      [viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')), { name: 'view', arguments: {} }],
    ],
    [
      'the first standard plus a non-string view path',
      [
        viewed(path.join(reviewerWorktree, '.github/copilot-instructions.md')),
        { name: 'view', arguments: { path: 42 } },
      ],
    ],
  ])('rejects incomplete repository-standard reads: %s', async (_, toolRequests) => {
    await expect(reviewTask(repositoryRequest(), { review: async () => review({ toolRequests }) })).rejects.toThrow(
      /incomplete review evidence.*CONTRIBUTING\.md/i
    );
  });

  it('does not demand checkout reads for resolved non-repository kinds or unresolved repository standards', async () => {
    const standards = {
      ...approval,
      references: [
        { kind: 'organization', id: 'org-standard' },
        { kind: 'local', id: 'local-skill' },
        { kind: 'guidelines', id: 'external-guidance' },
      ],
      records: [
        { kind: 'repository', id: 'optional.md', status: 'missing' },
        { kind: 'repository', id: 'incompatible.md', status: 'incompatible' },
      ],
    };
    expect(await reviewTask({ ...request(), standards }, { review: async () => review() })).toEqual([]);
  });

  it('still accepts a clean review when no repository standards are resolved', async () => {
    expect(await reviewTask(request(), { review: async () => review() })).toEqual([]);
  });

  it('fails closed when a resolved repository standard has no review worktree root', async () => {
    await expect(
      reviewTask({ ...repositoryRequest(), worktree: undefined }, { review: async () => review() })
    ).rejects.toThrow(/review worktree/i);
  });

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
    expect(ports.review).toHaveBeenCalledWith({
      task: input.task,
      index: input.index,
      evidence: input.evidence,
      delta: input.delta,
      standards: input.standards,
    });
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
        { name: 'view', arguments: { path: 'spec/x.html' } },
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
