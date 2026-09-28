// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { publishReviewedRun } from './publication.mjs';

const clean = (id, name = 'rule-a', file = 'src/a.test.js') => ({
  complete: true,
  exitCode: 0,
  errors: [],
  tests: [{ id, file, name, status: 'passed', failureKind: null, message: '' }],
});
const red = (id, name) => ({
  ...clean(id, name),
  exitCode: 1,
  tests: [{ ...clean(id, name).tests[0], status: 'failed', failureKind: 'assertion', message: 'expected 0 to be 1' }],
});
const task = (id, depends_on = []) => ({
  id,
  summary: `Implement ${id}`,
  criteria: [`spec/x.html#rule-${id.toLowerCase()}`],
  depends_on,
  files_modified: [`src/${id}.js`, `src/${id}.test.js`],
  public_surface: [],
});
const reviewed = (entry) => {
  const binding = {
    id: `src/a.test.js::rule-${entry.id}`,
    file: 'src/a.test.js',
    name: `rule-${entry.id}`,
    criteria: entry.criteria,
  };
  return {
    taskId: entry.id,
    status: 'ready',
    findings: [],
    evidence: {
      bindings: [binding],
      red: red(binding.id, binding.name),
      green: clean(binding.id, binding.name),
      reviews: [{ findings: [], route: 'done' }],
      reviewStandards: {
        references: [{ kind: 'repository', id: 'CONTRIBUTING.md' }],
        records: [{ kind: 'repository', id: 'CONTRIBUTING.md', status: 'resolved' }],
        missingRequired: [],
      },
      usage: {
        counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 0.5 }],
        complete: true,
        missingExecutions: 0,
        apiDurationMs: 1,
        durationMs: 2,
      },
    },
  };
};
const plan = (tasks) => ({ issue: 42, target: 'react-vitest', tasks, waves: [tasks.map(({ id }) => id)] });
const run = (tasks = [task('A')]) => ({
  issue: { number: 42, repository: 'owner/repo', title: 'Only one running timer' },
  base: 'develop',
  plan: plan(tasks),
  hashes: { spec: 'spec-digest', target: 'target-digest', plan: 'plan-digest' },
  waves: [
    {
      status: 'ready',
      tasks: tasks.map(reviewed),
      integration: {
        run: clean('baseline::healthy', 'healthy', 'baseline'),
        verdict: { status: 'GREEN', reasons: [] },
      },
    },
  ],
});
const group = (taskIds = ['A'], head = 'loop/42-A') => ({
  taskIds,
  head,
  base: 'develop',
  title: 'Only one running timer',
});
function ports(overrides = {}) {
  const events = [];
  const published = { tree: 'tree-123', headOid: 'commit-123' };
  const api = {
    readInputs: vi.fn(async () => ({ spec: 'spec-digest', target: 'target-digest', plan: 'plan-digest' })),
    prepareGroup: vi.fn(async (value) => {
      events.push('final-suite-green');
      return { ...value, tree: 'tree-123', suite: clean('baseline::healthy', 'healthy', 'baseline') };
    }),
    readStagedTree: vi.fn(async () => 'tree-123'),
    readCommittedTree: vi.fn(async () => ({ tree: 'tree-123', headOid: 'commit-123', head: 'loop/42-A' })),
    gate2: vi.fn(async () => {
      events.push('gate2');
      return { decision: 'publish' };
    }),
    readPublishedTree: vi.fn(async () => {
      events.push('verify-published-tree');
      return published;
    }),
    findPullRequest: vi.fn(async () => null),
    openPullRequest: vi.fn(async () => {
      events.push('open-pr');
      return { url: 'https://github.com/owner/repo/pull/7', headOid: 'commit-123', base: 'develop' };
    }),
    commit: vi.fn(),
    merge: vi.fn(),
    ...overrides,
  };
  return { api, events };
}

describe('Gate 2 publication', () => {
  it('requires a final GREEN suite, presents one human gate, verifies published tree, then confirms an actual PR', async () => {
    // * ARRANGE
    const { api, events } = ports();
    // * ACT
    const result = await publishReviewedRun({ run: run(), groups: [group()] }, api);
    events.push('stop');
    // * ASSERT
    expect(events).toEqual(['final-suite-green', 'gate2', 'verify-published-tree', 'open-pr', 'stop']);
    expect(result).toEqual({ status: 'pr-opened', pullRequests: ['https://github.com/owner/repo/pull/7'] });
    expect(api.gate2).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: [expect.objectContaining({ taskIds: ['A'], head: 'loop/42-A' })],
        treeDigests: ['tree-123'],
        evidence: expect.objectContaining({ hashes: run().hashes }),
      })
    );
    expect(api.commit).not.toHaveBeenCalled();
    expect(api.merge).not.toHaveBeenCalled();
  });

  it('never presents Gate 2 for a parked sibling, failed integration, or unreviewed task', async () => {
    // * ARRANGE
    const parked = run();
    parked.waves[0].tasks[0].status = 'parked';
    const failed = run();
    failed.waves[0].integration.run = red('baseline::healthy', 'healthy');
    const unreviewed = run();
    unreviewed.waves[0].tasks[0].evidence.reviews = [];
    const { api } = ports();
    // * ACT / ASSERT
    for (const candidate of [parked, failed, unreviewed])
      await expect(publishReviewedRun({ run: candidate, groups: [group()] }, api)).rejects.toThrow(/GREEN|reviewed/i);
    expect(api.gate2).not.toHaveBeenCalled();
    expect(api.openPullRequest).not.toHaveBeenCalled();
  });

  it('rejects a PR grouping that contradicts the dependency components before any side effect', async () => {
    // * ARRANGE
    const { api } = ports();
    // * ACT / ASSERT
    await expect(
      publishReviewedRun({ run: run([task('A'), task('B')]), groups: [group(['A', 'B'])] }, api)
    ).rejects.toThrow(/group/i);
    expect(api.prepareGroup).not.toHaveBeenCalled();
  });

  it('rejects a malformed group or missing signed-off issue evidence before Gate 2', async () => {
    const { api } = ports();
    await expect(publishReviewedRun({ run: run(), groups: [{ ...group(), head: '' }] }, api)).rejects.toThrow(/group/i);
    const broken = run();
    broken.hashes.spec = '';
    await expect(publishReviewedRun({ run: broken, groups: [group()] }, api)).rejects.toThrow(/approved/i);
    expect(api.gate2).not.toHaveBeenCalled();
  });

  it('rejects a PR base that differs from the explicit repository configuration', async () => {
    const { api } = ports();
    await expect(publishReviewedRun({ run: run(), groups: [{ ...group(), base: 'main' }] }, api)).rejects.toThrow(
      /base|group/i
    );
    expect(api.prepareGroup).not.toHaveBeenCalled();
  });

  it('stops without opening a PR when Gate 2 declines', async () => {
    // * ARRANGE
    const { api } = ports({ gate2: vi.fn(async () => ({ decision: 'stop' })) });
    // * ACT
    const result = await publishReviewedRun({ run: run(), groups: [group()] }, api);
    // * ASSERT
    expect(result).toEqual({ status: 'stopped', pullRequests: [] });
    expect(api.readPublishedTree).not.toHaveBeenCalled();
    expect(api.openPullRequest).not.toHaveBeenCalled();
  });

  it('does not reach Gate 2 after stale initial inputs, failed final suite, or changed initial staging', async () => {
    const staleInputs = ports({ readInputs: vi.fn(async () => ({ ...run().hashes, plan: 'edited' })) });
    expect(await publishReviewedRun({ run: run(), groups: [group()] }, staleInputs.api)).toEqual({
      status: 'stale',
      pullRequests: [],
    });
    expect(staleInputs.api.prepareGroup).not.toHaveBeenCalled();
    const redSuite = ports({
      prepareGroup: vi.fn(async (entry) => ({ ...entry, tree: 'tree-123', suite: red('bad', 'bad') })),
    });
    await expect(publishReviewedRun({ run: run(), groups: [group()] }, redSuite.api)).rejects.toThrow(
      /Final full suite/
    );
    const changedStage = ports({ readStagedTree: vi.fn(async () => 'unreviewed-tree') });
    expect(await publishReviewedRun({ run: run(), groups: [group()] }, changedStage.api)).toEqual({
      status: 'stale',
      pullRequests: [],
    });
    expect(changedStage.api.gate2).not.toHaveBeenCalled();
  });

  it('does not turn an invalid Gate 2 response or a local commit without an identity into a PR', async () => {
    const invalidGate = ports({ gate2: vi.fn(async () => ({ decision: 'later' })) });
    await expect(publishReviewedRun({ run: run(), groups: [group()] }, invalidGate.api)).rejects.toThrow(
      /explicit publish or stop/
    );
    const invalidCommit = ports({
      readCommittedTree: vi.fn(async () => ({ head: 'loop/42-A', tree: 'tree-123', headOid: '' })),
    });
    await expect(publishReviewedRun({ run: run(), groups: [group()] }, invalidCommit.api)).rejects.toThrow(
      /commit identity/
    );
    expect(invalidCommit.api.openPullRequest).not.toHaveBeenCalled();
  });

  it('labels absent resolved review standards honestly in the PR body', async () => {
    const candidate = run();
    candidate.waves[0].tasks[0].evidence.reviewStandards.references = [];
    const { api } = ports();
    expect((await publishReviewedRun({ run: candidate, groups: [group()] }, api)).status).toBe('pr-opened');
    expect(api.openPullRequest.mock.calls[0][2].body).toContain('- None resolved');
  });

  it('labels absent optional review standards metadata honestly in the PR body', async () => {
    const candidate = run();
    delete candidate.waves[0].tasks[0].evidence.reviewStandards;
    const { api } = ports();
    expect((await publishReviewedRun({ run: candidate, groups: [group()] }, api)).status).toBe('pr-opened');
    expect(api.openPullRequest.mock.calls[0][2].body).toContain('- None resolved');
  });

  it('does not publish when the reviewed staged tree was not committed by the human', async () => {
    // * ARRANGE
    const { api } = ports({
      readCommittedTree: vi.fn(async () => ({ tree: 'prior-tree', headOid: 'commit-123', head: 'loop/42-A' })),
    });
    // * ACT
    const result = await publishReviewedRun({ run: run(), groups: [group()] }, api);
    // * ASSERT
    expect(result).toEqual({ status: 'awaiting-publication', pullRequests: [] });
    expect(api.openPullRequest).not.toHaveBeenCalled();
  });

  it('does not open a PR for a different local branch or a remote commit other than the reviewed local commit', async () => {
    const wrongBranch = ports({
      readCommittedTree: vi.fn(async () => ({ tree: 'tree-123', headOid: 'commit-123', head: 'other' })),
    });
    expect(await publishReviewedRun({ run: run(), groups: [group()] }, wrongBranch.api)).toEqual({
      status: 'stale',
      pullRequests: [],
    });
    const differentCommit = ports({
      readPublishedTree: vi.fn(async () => ({ tree: 'tree-123', headOid: 'other-commit' })),
    });
    expect(await publishReviewedRun({ run: run(), groups: [group()] }, differentCommit.api)).toEqual({
      status: 'stale',
      pullRequests: [],
    });
    expect(differentCommit.api.openPullRequest).not.toHaveBeenCalled();
  });

  it('does not publish when a matching local commit has not reached the remote branch', async () => {
    // * ARRANGE
    const { api } = ports({ readPublishedTree: vi.fn(async () => null) });
    // * ACT
    const result = await publishReviewedRun({ run: run(), groups: [group()] }, api);
    // * ASSERT
    expect(result).toEqual({ status: 'awaiting-publication', pullRequests: [] });
    expect(api.openPullRequest).not.toHaveBeenCalled();
  });

  it('invalidates approval after a changed target or changed staged tree', async () => {
    // * ARRANGE
    const { api } = ports();
    api.readInputs
      .mockResolvedValueOnce(run().hashes)
      .mockResolvedValueOnce({ ...run().hashes, target: 'changed-target' });
    // * ACT / ASSERT
    expect(await publishReviewedRun({ run: run(), groups: [group()] }, api)).toEqual({
      status: 'stale',
      pullRequests: [],
    });
    expect(api.readPublishedTree).not.toHaveBeenCalled();
    const changedTree = ports({
      readStagedTree: vi.fn().mockResolvedValueOnce('tree-123').mockResolvedValueOnce('other'),
    });
    expect(await publishReviewedRun({ run: run(), groups: [group()] }, changedTree.api)).toEqual({
      status: 'stale',
      pullRequests: [],
    });
    expect(changedTree.api.openPullRequest).not.toHaveBeenCalled();
  });

  it('refuses a published branch with different content even when the PR API succeeds', async () => {
    // * ARRANGE
    const { api } = ports({ readPublishedTree: vi.fn(async () => ({ tree: 'other', headOid: 'commit-123' })) });
    // * ACT
    const result = await publishReviewedRun({ run: run(), groups: [group()] }, api);
    // * ASSERT
    expect(result).toEqual({ status: 'stale', pullRequests: [] });
    expect(api.openPullRequest).not.toHaveBeenCalled();
  });

  it('recovers an existing PR by exact head and base without creating a duplicate', async () => {
    // * ARRANGE
    const { api } = ports({
      findPullRequest: vi.fn(async () => ({
        url: 'https://github.com/owner/repo/pull/7',
        headOid: 'commit-123',
        base: 'develop',
      })),
    });
    // * ACT
    const result = await publishReviewedRun({ run: run(), groups: [group()] }, api);
    // * ASSERT
    expect(result).toMatchObject({ status: 'pr-opened', pullRequests: ['https://github.com/owner/repo/pull/7'] });
    expect(api.openPullRequest).not.toHaveBeenCalled();
  });

  it('passes an anchored issue, task/wave, RED/GREEN, and standards summary to GitHub without paraphrasing criteria', async () => {
    // * ARRANGE
    const { api } = ports();
    // * ACT
    await publishReviewedRun({ run: run(), groups: [group()] }, api);
    // * ASSERT
    const [, , request] = api.openPullRequest.mock.calls[0];
    expect(request.body).toContain('owner/repo#42');
    expect(request.body).toContain('spec/x.html#rule-a');
    expect(request.body).toContain('Task A');
    expect(request.body).toMatch(/Wave 1.*GREEN/);
    expect(request.body).toMatch(/RED.*GREEN/);
    expect(request.body).toContain('repository:CONTRIBUTING.md');
    expect(request.body).not.toContain('Only one running timer');
  });

  it('fails explicitly on PR authentication errors or an unrelated PR receipt', async () => {
    // * ARRANGE
    const unauthorized = ports({
      openPullRequest: vi.fn(async () => {
        throw new Error('GH_AUTH_REQUIRED');
      }),
    });
    const wrong = ports({
      openPullRequest: vi.fn(async () => ({
        url: 'https://github.com/owner/repox/pull/7',
        headOid: 'commit-123',
        base: 'develop',
      })),
    });
    // * ACT / ASSERT
    await expect(publishReviewedRun({ run: run(), groups: [group()] }, unauthorized.api)).rejects.toThrow(
      /GH_AUTH_REQUIRED/
    );
    await expect(publishReviewedRun({ run: run(), groups: [group()] }, wrong.api)).rejects.toThrow(/PR response/i);
  });

  it('presents independent groups together and verifies all trees before opening either PR', async () => {
    // * ARRANGE
    const events = [];
    const { api } = ports({
      prepareGroup: vi.fn(async (entry) => ({
        ...entry,
        tree: `tree-${entry.taskIds[0]}`,
        suite: clean('baseline::healthy', 'healthy', 'baseline'),
      })),
      readStagedTree: vi.fn(async (entry) => entry.tree),
      readCommittedTree: vi.fn(async (entry) => ({
        tree: entry.tree,
        headOid: `commit-${entry.taskIds[0]}`,
        head: entry.head,
      })),
      readPublishedTree: vi.fn(async (entry) => {
        events.push(`verify-${entry.taskIds[0]}`);
        return { tree: entry.tree, headOid: `commit-${entry.taskIds[0]}` };
      }),
      openPullRequest: vi.fn(async (entry, branch) => {
        events.push(`open-${entry.taskIds[0]}`);
        return {
          url: `https://github.com/owner/repo/pull/${entry.taskIds[0] === 'A' ? 7 : 8}`,
          headOid: branch.headOid,
          base: entry.base,
        };
      }),
    });

    // * ACT
    const result = await publishReviewedRun(
      { run: run([task('A'), task('B')]), groups: [group(['A']), group(['B'], 'loop/42-B')] },
      api
    );
    // * ASSERT
    expect(events).toEqual(['verify-A', 'verify-B', 'open-A', 'open-B']);
    expect(api.gate2).toHaveBeenCalledTimes(1);
    expect(result.pullRequests).toEqual([
      'https://github.com/owner/repo/pull/7',
      'https://github.com/owner/repo/pull/8',
    ]);
  });
  it('rejects a metacharacter repository URL that is not the reviewed repository', async () => {
    const candidate = run();
    candidate.issue.repository = 'owner/re.po';
    const { api } = ports({
      openPullRequest: vi.fn(async () => ({
        url: 'https://github.com/owner/reXpo/pull/7',
        headOid: 'commit-123',
        base: 'develop',
      })),
    });
    await expect(publishReviewedRun({ run: candidate, groups: [group()] }, api)).rejects.toThrow(/PR response/i);
  });
});
