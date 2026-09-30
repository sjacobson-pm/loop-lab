// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLegWorktree } from './attended.mjs';
import { createExecution } from './execution.mjs';
import { capturePatch } from './lib/patches.mjs';
import { auditWorkspaceDetails, captureWorkspace } from './lib/workspace.mjs';
import { runTask as taskController } from './lib/task.mjs';

vi.mock('./attended.mjs', async (original) => {
  const module = await original();
  return { ...module, createLegWorktree: vi.fn(module.createLegWorktree) };
});
vi.mock('node:fs/promises', async (original) => {
  const module = await original();
  return { ...module, lstat: vi.fn(module.lstat) };
});
vi.mock('./lib/workspace.mjs', async (original) => {
  const module = await original();
  return {
    ...module,
    captureWorkspace: vi.fn(module.captureWorkspace),
    auditWorkspaceDetails: vi.fn(module.auditWorkspaceDetails),
  };
});
vi.mock('./lib/patches.mjs', async (original) => {
  const module = await original();
  return { ...module, capturePatch: vi.fn(module.capturePatch) };
});
vi.mock('./lib/task.mjs', async (original) => {
  const module = await original();
  return { ...module, runTask: vi.fn(module.runTask) };
});

const roots = [];
const executions = [];
const tasks = ['A', 'B'].map((id) => ({
  id,
  summary: `Implement ${id}`,
  criteria: [`spec/x.html#${id}`],
  files_modified: [`src/${id}.js`, `src/${id}.test.js`],
}));
const target = {
  stack: 'react-vitest',
  test_pathspecs: ['*.test.js'],
  review_standards: {
    organization: [],
    local: [],
    repository: [],
    guidelines: [],
    required: [],
  },
};
const index = { spec_path: 'spec/x.html', criteria: tasks.map((task) => ({ anchor: task.criteria[0] })), context: [] };
async function repository({ clean = false, generated = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loop-execution-'));
  roots.push(root);
  execFileSync('git', ['init', '--quiet', root]);
  const tree = execFileSync('git', ['-C', root, 'hash-object', '-t', 'tree', '-w', '--stdin'], { input: '' })
    .toString()
    .trim();
  const commit = `tree ${tree}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nFixture\n`;
  const oid = execFileSync('git', ['-C', root, 'hash-object', '-t', 'commit', '-w', '--stdin'], { input: commit })
    .toString()
    .trim();
  execFileSync('git', ['-C', root, 'update-ref', 'HEAD', oid]);
  await mkdir(path.join(root, 'src'));
  await mkdir(path.join(root, 'spec'));
  for (const task of tasks) await writeFile(path.join(root, `src/${task.id}.js`), 'zero');
  await writeFile(path.join(root, 'spec/x.html'), '<p id="A">Rule A</p><p id="B">Rule B</p>');
  await writeFile(path.join(root, '.gitignore'), 'node_modules/\n');
  execFileSync('git', ['-C', root, 'add', '.']);
  if (clean) {
    const staged = execFileSync('git', ['-C', root, 'write-tree'], { encoding: 'utf8' }).trim();
    const object = `tree ${staged}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nFixture\n`;
    const committed = execFileSync('git', ['-C', root, 'hash-object', '-t', 'commit', '-w', '--stdin'], {
      input: object,
      encoding: 'utf8',
    }).trim();
    execFileSync('git', ['-C', root, 'update-ref', 'HEAD', committed]);
  }
  if (generated) {
    await mkdir(path.join(root, '.loop/criteria'), { recursive: true });
    await mkdir(path.join(root, '.loop/plans'), { recursive: true });
    await writeFile(path.join(root, '.loop/criteria/42.json'), 'criteria');
    await writeFile(path.join(root, '.loop/plans/42.plan.json'), 'plan');
  }
  return root;
}
function adapters() {
  const calls = [];
  const agent = async ({ worktree, leg }) => {
    const { task, index } = JSON.parse(await readFile(path.join(worktree, '.loop/task-context.json'), 'utf8'));
    calls.push({ worktree, leg, task: task.id });
    if (leg === 'review') {
      expect(await readFile(path.join(worktree, `src/${task.id}.js`), 'utf8')).toBe('one');
      expect(await readFile(path.join(worktree, `src/${task.id}.test.js`), 'utf8')).toContain('rule');
      const { standards } = JSON.parse(await readFile(path.join(worktree, '.loop/task-context.json'), 'utf8'));
      const specFile = path.join(worktree, index.spec_path);
      await readFile(specFile, 'utf8');
      const toolRequests = await Promise.all(
        standards.references
          .filter(({ kind }) => kind === 'repository')
          .map(async ({ id }) => {
            const file = path.join(worktree, id);
            await readFile(file, 'utf8');
            return { name: 'view', arguments: { path: file } };
          })
      );
      return {
        status: 'completed',
        reportedWrites: [],
        toolRequests: [{ name: 'view', arguments: { path: specFile } }, ...toolRequests],
        messages: ['[]'],
      };
    }
    const file = `src/${task.id}.${leg === 'test' ? 'test.js' : 'js'}`;
    const binding = { id: `${file}::rule ${task.id}`, file, name: `rule ${task.id}`, criteria: task.criteria };
    await writeFile(path.join(worktree, file), leg === 'test' ? JSON.stringify(binding) : 'one');
    return {
      status: 'completed',
      reportedWrites: [path.join(worktree, file)],
      messages: [JSON.stringify([binding])],
      usage: { counters: [] },
    };
  };
  const runner = async ({ cwd, phase }) => {
    calls.push({ worktree: cwd, phase });
    const tests = [
      { id: 'baseline::healthy', file: 'baseline', name: 'healthy', status: 'passed', failureKind: null, message: '' },
    ];
    for (const file of (await readdir(path.join(cwd, 'src'))).filter((name) => name.endsWith('.test.js'))) {
      const binding = JSON.parse(await readFile(path.join(cwd, 'src', file), 'utf8'));
      const passed = (await readFile(path.join(cwd, 'src', file.replace('.test.js', '.js')), 'utf8')) === 'one';
      tests.push({
        ...binding,
        status: passed ? 'passed' : 'failed',
        failureKind: passed ? null : 'assertion',
        message: passed ? '' : 'expected zero to be one',
      });
    }
    return { exitCode: tests.every(({ status }) => status === 'passed') ? 0 : 1, complete: true, errors: [], tests };
  };
  return { agent, runner, calls };
}
async function setup({ clean = false, generated = false, ...overrides } = {}) {
  const root = await repository({ clean, generated });
  const ports = adapters();
  const execution = await createExecution({ root, target, index, ...ports, ...overrides });
  executions.push(execution);
  return { root, execution, ...ports };
}
async function reviewedSourceDelta(root) {
  const beforeTree = await createLegWorktree(root);
  const afterTree = await createLegWorktree(root);
  try {
    const before = await captureWorkspace(beforeTree.path);
    await writeFile(path.join(afterTree.path, 'src/A.js'), 'one');
    return await capturePatch(before, await captureWorkspace(afterTree.path), ['src/A.js']);
  } finally {
    await beforeTree.dispose();
    await afterTree.dispose();
  }
}
afterEach(async () => {
  const disposed = await Promise.allSettled(executions.splice(0).map((execution) => execution.dispose()));
  const removed = await Promise.allSettled(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  const failure = [...disposed, ...removed].find(({ status }) => status === 'rejected');
  if (failure) throw failure.reason;
});

describe('isolated task execution adapters', { timeout: 30_000 }, () => {
  it('rejects malformed group heads and unreviewed deltas before allocating a publication tree', async () => {
    const { execution } = await setup();
    for (const group of [
      { head: 'other/42-1', tasks: [{ task: tasks[0], delta: { bytes: Buffer.alloc(0), changes: [] } }] },
      {
        head: 'loop/42-1',
        tasks: [{ task: tasks[0], delta: { bytes: Buffer.alloc(0), changes: [{ path: 'src/B.js' }] } }],
      },
    ])
      await expect(execution.stageGroup(group)).rejects.toThrow(/Invalid reviewed PR group deltas/);
  });

  it('preserves tracked generated inputs at their committed bytes when staging an audited delta', async () => {
    const root = await repository({ generated: true });
    execFileSync('git', ['-C', root, 'add', '-A']);
    const tree = execFileSync('git', ['-C', root, 'write-tree'], { encoding: 'utf8' }).trim();
    const raw = `tree ${tree}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nFixture\n`;
    const oid = execFileSync('git', ['-C', root, 'hash-object', '-t', 'commit', '-w', '--stdin'], {
      input: raw,
      encoding: 'utf8',
    }).trim();
    execFileSync('git', ['-C', root, 'update-ref', 'HEAD', oid]);
    const delta = await reviewedSourceDelta(root);
    const execution = await createExecution({ root, target, index, ...adapters() });
    executions.push(execution);
    const staged = await execution.stageGroup({ head: 'loop/42-1', tasks: [{ task: tasks[0], delta }] });
    expect(await readFile(path.join(staged.path, '.loop/criteria/42.json'), 'utf8')).toBe('criteria');
    expect(await readFile(path.join(staged.path, '.loop/plans/42.plan.json'), 'utf8')).toBe('plan');
    expect(
      execFileSync('git', ['-C', staged.path, 'diff', '--name-only', 'HEAD', '--', '.loop'], { encoding: 'utf8' })
    ).toBe('');
  }, 45_000);

  it('rejects a failed final group suite and disposes the candidate worktree', async () => {
    const normal = adapters();
    const { root, execution } = await setup({
      runner: async (input) => {
        const result = await normal.runner(input);
        if (input.phase === 'integration') return { ...result, exitCode: 1 };
        return result;
      },
    });
    const delta = await reviewedSourceDelta(root);
    await expect(execution.stageGroup({ head: 'loop/42-1', tasks: [{ task: tasks[0], delta }] })).rejects.toThrow(
      /Final group suite failed/
    );
    expect(
      execFileSync('git', ['-C', root, 'worktree', 'list', '--porcelain'])
        .toString()
        .match(/worktree /g)
    ).toHaveLength(2);
  }, 45_000);

  it('preserves the staging error together with a failed candidate cleanup', async () => {
    const { execution } = await setup();
    const real = await vi.importActual('./attended.mjs');
    vi.mocked(createLegWorktree).mockImplementationOnce(async (root) => {
      const tree = await real.createLegWorktree(root);
      return {
        ...tree,
        dispose: async () => {
          await tree.dispose();
          throw new Error('Candidate cleanup failed');
        },
      };
    });
    try {
      await expect(
        execution.stageGroup({
          head: 'loop/42-1',
          tasks: [{ task: tasks[0], delta: { changes: [{ path: 'src/A.js' }], bytes: Buffer.from('invalid') } }],
        })
      ).rejects.toMatchObject({
        errors: [expect.any(Error), expect.objectContaining({ message: 'Candidate cleanup failed' })],
      });
    } finally {
      vi.mocked(createLegWorktree).mockRestore();
    }
  });

  it('stages separate reviewed component trees without committing or changing the original checkout', async () => {
    const { root, execution, calls } = await setup({ clean: true, generated: true });
    const deltas = [];
    for (const task of tasks) {
      const baseline = await createLegWorktree(root);
      const author = await createLegWorktree(root);
      try {
        const before = await captureWorkspace(baseline.path);
        await writeFile(path.join(author.path, `src/${task.id}.js`), 'one');
        await writeFile(
          path.join(author.path, `src/${task.id}.test.js`),
          JSON.stringify({
            id: `src/${task.id}.test.js::rule ${task.id}`,
            file: `src/${task.id}.test.js`,
            name: `rule ${task.id}`,
            criteria: task.criteria,
          })
        );
        const after = await captureWorkspace(author.path);
        deltas.push({ task, delta: await capturePatch(before, after, task.files_modified) });
      } finally {
        await baseline.dispose();
        await author.dispose();
      }
    }
    const first = await execution.stageGroup({ head: 'loop/42-1', tasks: [deltas[0]] });
    const second = await execution.stageGroup({ head: 'loop/42-2', tasks: [deltas[1]] });
    expect(first.suite.exitCode).toBe(0);
    expect(second.suite.exitCode).toBe(0);
    expect(first.path).not.toBe(second.path);
    expect(first.tree).not.toBe(second.tree);
    expect(execFileSync('git', ['-C', first.path, 'write-tree'], { encoding: 'utf8' }).trim()).toBe(first.tree);
    expect(execFileSync('git', ['-C', first.path, 'branch', '--show-current'], { encoding: 'utf8' }).trim()).toBe(
      first.head
    );
    expect(await readFile(path.join(first.path, 'src/B.js'), 'utf8')).toBe('zero');
    expect(await readFile(path.join(second.path, 'src/A.js'), 'utf8')).toBe('zero');
    expect(await readFile(path.join(root, 'src/A.js'), 'utf8')).toBe('zero');
    const stagedPaths = execFileSync('git', ['-C', first.path, 'ls-tree', '-r', '--name-only', first.tree], {
      encoding: 'utf8',
    });
    expect(stagedPaths).toContain('src/A.js');
    expect(stagedPaths).toContain('src/B.js');
    expect(stagedPaths).not.toContain('.loop/criteria/42.json');
    expect(stagedPaths).not.toContain('.loop/plans/42.plan.json');
    expect(calls.filter(({ phase }) => phase === 'integration')).toHaveLength(2);
  }, 45_000);
  it('preserves both a failed final baseline and its Git cleanup failure', async () => {
    const { execution } = await setup({
      runner: async () => ({
        complete: false,
        exitCode: 1,
        errors: [{ kind: 'test', message: 'suite failed' }],
        tests: [],
      }),
    });
    const original = await vi.importActual('./attended.mjs');
    vi.mocked(createLegWorktree).mockImplementationOnce(async (root) => {
      const tree = await original.createLegWorktree(root);
      return {
        ...tree,
        dispose: async () => {
          await tree.dispose();
          throw new Error('Git disposal failed');
        },
      };
    });
    try {
      await expect(
        execution.stageGroup({
          head: 'loop/42-1',
          tasks: [{ task: tasks[0], delta: { changes: [{ path: 'src/A.js' }], bytes: Buffer.from('patch') } }],
        })
      ).rejects.toMatchObject({
        errors: [
          expect.objectContaining({ message: expect.stringMatching(/baseline/i) }),
          expect.objectContaining({ message: 'Git disposal failed' }),
        ],
      });
    } finally {
      vi.mocked(createLegWorktree).mockRestore();
    }
  });
  // Known margin: fresh reviewer worktree, patches, and audits take ~22.5s with isolated
  // coverage, ~32s under full load, and ~37s instrumented; Git/filesystem timing, not a hang.
  it('rejects an empty reviewed PR group rather than requesting a human commit with no changes', async () => {
    const { execution } = await setup();
    await expect(
      execution.stageGroup({
        head: 'loop/42-1',
        tasks: [{ task: tasks[0], delta: { changes: [], bytes: Buffer.alloc(0) } }],
      })
    ).rejects.toThrow(/no audited changes/i);
  });
  it('reviews the audited delta in a fresh read-only context, not the author worktree', async () => {
    // * ARRANGE
    const { execution, calls } = await setup();
    // * ACT
    const result = await execution.runTask(tasks[0]);
    // * ASSERT
    expect(result.status).toBe('ready');
    expect(result.evidence.reviews).toEqual([{ findings: [], route: 'done' }]);
    const authors = calls.filter(({ leg }) => leg === 'test' || leg === 'implement');
    const review = calls.find(({ leg }) => leg === 'review');
    expect(review.worktree).not.toBe(authors[0].worktree);
    expect(review.worktree).not.toBe(authors[1].worktree);
  }, 45_000);
  it('rejects reviewer writes found by the independent worktree audit despite clean claimed telemetry', async () => {
    // * ARRANGE
    const original = adapters();
    const { execution } = await setup({
      agent: async (input) => {
        if (input.leg !== 'review') return original.agent(input);
        await writeFile(path.join(input.worktree, 'src/A.js'), 'tampered');
        return { status: 'completed', reportedWrites: [], toolRequests: [], messages: ['[]'] };
      },
    });
    // * ACT
    const result = await execution.runTask(tasks[0]);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1)).toMatchObject({ phase: 'review' });
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/review_write/);
  });
  it('parks before dispatch when a required configured review standard is unavailable', async () => {
    // * ARRANGE
    const withRequired = {
      ...target,
      review_standards: {
        ...target.review_standards,
        organization: ['unpublished-standard'],
        required: ['organization:unpublished-standard'],
      },
    };
    const { execution, calls } = await setup({ target: withRequired });
    // * ACT
    const result = await execution.runTask(tasks[0]);
    // * ASSERT
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/required.*unpublished-standard/);
    expect(calls.some(({ leg }) => leg === 'review')).toBe(false);
  });
  it('rejects missing review configuration rather than accepting the GREEN candidate without review', async () => {
    const { execution, calls } = await setup({ target: { ...target, review_standards: null } });
    const result = await execution.runTask(tasks[0]);
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/review standards configuration/i);
    expect(calls.some(({ leg }) => leg === 'review')).toBe(false);
  });
  it('surfaces an unreadable configured review reference instead of treating it as absent', async () => {
    const actual = await vi.importActual('node:fs/promises');
    vi.mocked(lstat).mockImplementation((file, ...args) =>
      String(file).endsWith(path.join('src', 'A.js', 'guide.md'))
        ? Promise.reject(Object.assign(new Error('Guidance cannot be read'), { code: 'EACCES' }))
        : actual.lstat(file, ...args)
    );
    try {
      const { execution, calls } = await setup({
        target: {
          ...target,
          review_standards: { ...target.review_standards, repository: ['src/A.js/guide.md'] },
        },
      });
      const result = await execution.runTask(tasks[0]);
      expect(result.status).toBe('parked');
      expect(result.evidence.diagnostics.at(-1).message).toMatch(/Guidance cannot be read/);
      expect(calls.some(({ leg }) => leg === 'review')).toBe(false);
    } finally {
      vi.mocked(lstat).mockImplementation(actual.lstat);
    }
  });
  it('does not mistake a directory for an available required repository standard', async () => {
    const { execution, calls } = await setup({
      target: {
        ...target,
        review_standards: {
          ...target.review_standards,
          repository: ['src'],
          required: ['repository:src'],
        },
      },
    });
    const result = await execution.runTask(tasks[0]);
    expect(result.status).toBe('parked');
    expect(result.evidence.reviewStandards.records).toContainEqual({
      kind: 'repository',
      id: 'src',
      status: 'missing',
    });
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/required.*repository:src/);
    expect(calls.some(({ leg }) => leg === 'review')).toBe(false);
  });
  it('resolves an existing regular repository guidance file before dispatching independent review', async () => {
    const root = await repository();
    await writeFile(path.join(root, 'REVIEW.md'), 'Project-specific review guidance.\n');
    const normal = adapters();
    const execution = await createExecution({
      root,
      target: {
        ...target,
        review_standards: {
          ...target.review_standards,
          repository: ['REVIEW.md'],
          required: ['repository:REVIEW.md'],
        },
      },
      index,
      ...normal,
    });
    executions.push(execution);
    const result = await execution.runTask(tasks[0]);
    expect(result.status).toBe('ready');
    expect(result.evidence.reviewStandards.references).toEqual([{ kind: 'repository', id: 'REVIEW.md' }]);
    expect(normal.calls.some(({ leg }) => leg === 'review')).toBe(true);
  });
  it('retries an incomplete reviewer read in a fresh worktree with exact-file feedback in its prompt', async () => {
    const root = await repository();
    await writeFile(path.join(root, 'REVIEW.md'), 'Project-specific review guidance.\n');
    const normal = adapters();
    const reviews = [];
    const execution = await createExecution({
      root,
      target: {
        ...target,
        review_standards: { ...target.review_standards, repository: ['REVIEW.md'] },
      },
      index,
      runner: normal.runner,
      agent: async (input) => {
        if (input.leg !== 'review') return normal.agent(input);
        reviews.push({ worktree: input.worktree, prompt: input.prompt });
        if (reviews.length === 1) {
          const specFile = path.join(input.worktree, index.spec_path);
          await readFile(specFile, 'utf8');
          return {
            status: 'completed',
            reportedWrites: [],
            toolRequests: [{ name: 'view', arguments: { path: specFile } }],
            messages: ['[]'],
            usage: { counters: [] },
          };
        }
        return normal.agent(input);
      },
    });
    executions.push(execution);
    const result = await execution.runTask(tasks[0], { maxRepairs: 0 });
    expect(result.status).toBe('ready');
    expect(reviews).toHaveLength(2);
    expect(reviews[1].worktree).not.toBe(reviews[0].worktree);
    expect(reviews[1].prompt).toContain('REVIEW.md');
    expect(reviews[1].prompt).not.toContain('Project-specific review guidance.');
    expect(result.evidence.reviews).toEqual([{ findings: [], route: 'done' }]);
    expect(result.evidence.termination.total).toBe(4);
  }, 60_000);

  it('retains review transport failure together with the incomplete write audit', async () => {
    const normal = adapters();
    const { execution } = await setup({
      agent: async (input) => {
        if (input.leg === 'review') throw new Error('Independent reviewer transport broke');
        return normal.agent(input);
      },
    });
    const result = await execution.runTask(tasks[0]);
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/incomplete_evidence/i);
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/Independent reviewer transport broke/);
  });
  it('rejects runner changes to Git metadata without changing the parent HEAD', async () => {
    // * ARRANGE
    const normal = adapters();
    const { root, execution } = await setup({
      runner: async (request) => {
        const report = await normal.runner(request);
        const tree = execFileSync('git', ['-C', request.cwd, 'hash-object', '-t', 'tree', '-w', '--stdin'], {
          input: '',
        })
          .toString()
          .trim();
        const commit = `tree ${tree}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nChanged fixture metadata\n`;
        const oid = execFileSync('git', ['-C', request.cwd, 'hash-object', '-t', 'commit', '-w', '--stdin'], {
          input: commit,
        })
          .toString()
          .trim();
        execFileSync('git', ['-C', request.cwd, 'update-ref', 'HEAD', oid]);
        return report;
      },
    });
    const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD']).toString();
    // * ACT / ASSERT
    const result = await execution.runTask(tasks[0]);
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/runner mutated/);
    expect(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD']).toString()).toBe(head);
  });
  it('can allocate and dispose default adapters without invoking an agent', async () => {
    // * ARRANGE
    const root = await repository();
    const execution = await createExecution({ root, target, index });
    executions.push(execution);
    // * ACT / ASSERT
    expect(await execution.pathFor(execution.baseline)).not.toBe(root);
  });
  it('cleans up when initial snapshot capture fails', async () => {
    // * ARRANGE
    const root = await repository();
    vi.mocked(captureWorkspace).mockRejectedValueOnce(new Error('Snapshot unavailable'));
    // * ACT / ASSERT
    await expect(createExecution({ root, target, index })).rejects.toThrow('Snapshot unavailable');
    expect(
      execFileSync('git', ['-C', root, 'worktree', 'list', '--porcelain'])
        .toString()
        .match(/worktree /g)
    ).toHaveLength(1);
  });
  it.each([false, true])('retains cleanup failure with operation failure=%s', async (operationFails) => {
    // * ARRANGE
    const { execution } = await setup({
      runner: async () => ({
        complete: false,
        exitCode: null,
        tests: [],
        errors: [{ kind: 'setup', message: 'Stopped' }],
      }),
    });
    const actual = await vi.importActual('./attended.mjs');
    vi.mocked(createLegWorktree).mockImplementationOnce(async (source) => {
      const tree = await actual.createLegWorktree(source);
      return {
        ...tree,
        dispose: async () => {
          await tree.dispose();
          throw new Error('Disposal failed');
        },
      };
    });
    // * ACT / ASSERT
    try {
      await execution.runTask(tasks[0], { maxRepairs: operationFails ? -1 : 0 });
      expect.unreachable('Expected disposal failure');
    } catch (error) {
      expect(error.errors.map(({ message }) => message)).toEqual(
        operationFails ? ['Invalid repair limit.', 'Disposal failed'] : ['Disposal failed']
      );
    }
  });
  it('reports final cleanup failures rather than claiming clean shutdown', async () => {
    // * ARRANGE
    const actual = await vi.importActual('./attended.mjs');
    vi.mocked(createLegWorktree).mockImplementationOnce(async (source) => {
      const tree = await actual.createLegWorktree(source);
      return {
        ...tree,
        dispose: async () => {
          await tree.dispose();
          throw new Error('Final disposal failed');
        },
      };
    });
    const { execution } = await setup();
    // * ACT / ASSERT
    await expect(execution.dispose()).rejects.toMatchObject({
      errors: [expect.objectContaining({ message: 'Final disposal failed' })],
    });
    await expect(execution.pathFor(execution.baseline)).rejects.toThrow(/closed/i);
  });
  it('repairs malformed author JSON while preserving both attempts', async () => {
    // * ARRANGE
    const normal = adapters();
    let tests = 0;
    const { execution } = await setup({
      profiles: { test: { model: 'fixture-profile' } },
      agent: async (request) => {
        const outcome = await normal.agent(request);
        if (request.leg === 'test') {
          expect(request.profile).toEqual({ model: 'fixture-profile' });
          if (tests++ === 0) outcome.messages = ['not JSON'];
        }
        return outcome;
      },
    });
    // * ACT / ASSERT
    const result = await execution.runTask(tasks[0], { maxRepairs: 1 });
    expect(result.status).toBe('ready');
    expect(result.evidence.legs).toHaveLength(3);
    expect(result.evidence.diagnostics[0].message).toMatch(/invalid binding JSON/);
  });
  it('passes installed dependency package metadata as one basename deny to the test author', async () => {
    const normal = adapters();
    let received;
    const { execution } = await setup({
      runner: async (input) => {
        if (input.phase === 'baseline') {
          const dependency = path.join(input.cwd, 'node_modules', 'fixture-package');
          await mkdir(dependency, { recursive: true });
          await writeFile(path.join(dependency, 'package.json'), '{}');
        }
        return normal.runner(input);
      },
      agent: async (input) => {
        if (input.leg === 'test') received = input;
        return normal.agent(input);
      },
    });

    expect((await execution.runTask(tasks[0])).status).toBe('ready');
    expect(received.deniedPaths).toContain('package.json');
    expect(received.deniedPaths).not.toContain(
      path.join(received.worktree, 'node_modules', 'fixture-package', 'package.json')
    );
    expect(received.deniedPaths).toContain(path.join(received.worktree, 'spec', 'x.html'));
  });
  it.each(['replay', 'candidate', 'integration'])(
    'rejects a failed %s suite without accepting changes',
    async (kind) => {
      // * ARRANGE
      const normal = adapters();
      let baselines = 0;
      const { execution } = await setup({
        runner: async (request) => {
          if (request.phase === 'baseline') baselines++;
          if (
            (kind === 'replay' && baselines === 2) ||
            (kind === 'candidate' && baselines === 4) ||
            (kind === 'integration' && request.phase === 'integration')
          )
            return {
              complete: false,
              exitCode: 1,
              tests: [],
              errors: [{ kind: 'setup', message: 'Deliberate failure' }],
            };
          return normal.runner(request);
        },
      });
      // * ACT / ASSERT
      expect((await execution.runWave([tasks[0]])).status).toBe('parked');
    }
  );
  it.each(['candidate', 'integration'])(
    'rejects external drift between verified %s capture and frozen baseline handoff',
    async (kind) => {
      // * ARRANGE
      const normal = adapters();
      const actual = await vi.importActual('./lib/workspace.mjs');
      let baselines = 0;
      let injectAt;
      vi.mocked(captureWorkspace).mockImplementation(async (root) => {
        const snapshot = await actual.captureWorkspace(root);
        if (root === injectAt) {
          injectAt = undefined;
          await writeFile(path.join(root, 'src/B.js'), 'external drift after trusted capture');
        }
        return snapshot;
      });
      try {
        const { execution } = await setup({
          runner: async (request) => {
            if (request.phase === 'baseline') baselines++;
            const report = await normal.runner(request);
            if (
              (kind === 'candidate' && request.phase === 'baseline' && baselines === 4) ||
              (kind === 'integration' && request.phase === 'integration')
            )
              injectAt = request.cwd;
            return report;
          },
        });
        // * ACT / ASSERT
        const result = await execution.runWave([tasks[0]]);
        expect(result.status).toBe('parked');
        expect(result.diagnostics).toContainEqual({
          phase: 'integration',
          message: expect.stringMatching(/Frozen baseline changed/i),
        });
      } finally {
        vi.mocked(captureWorkspace).mockImplementation(actual.captureWorkspace);
      }
    }
  );
  it.each(['red', 'delta'])('rejects a controller supplying the wrong %s snapshot token', async (port) => {
    // * ARRANGE
    const actual = await vi.importActual('./lib/task.mjs');
    vi.mocked(taskController).mockImplementationOnce((input, ports) =>
      actual.runTask(input, {
        ...ports,
        [port]: (args) => ports[port]({ ...args, tests: 'incorrect-token' }),
      })
    );
    const { execution } = await setup();
    // * ACT / ASSERT
    const result = await execution.runTask(tasks[0]);
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/snapshot/i);
  });
  it('freezes supporting test files even when they contain no named test binding', async () => {
    // * ARRANGE
    const normal = adapters();
    const { execution } = await setup({
      target: { ...target, test_pathspecs: ['*.test.js', 'tests/**'] },
      agent: async (request) => {
        const outcome = await normal.agent(request);
        if (request.leg === 'test') {
          await mkdir(path.join(request.worktree, 'tests'), { recursive: true });
          const helper = path.join(request.worktree, 'tests/support.js');
          await writeFile(helper, 'support');
          outcome.reportedWrites.push(helper);
        }
        return outcome;
      },
      runner: async (request) => {
        if (['red', 'green'].includes(request.phase))
          expect(await readFile(path.join(request.cwd, 'tests/support.js'), 'utf8')).toBe('support');
        return normal.runner(request);
      },
    });
    // * ACT / ASSERT
    const task = { ...tasks[0], files_modified: [...tasks[0].files_modified, 'tests/support.js'] };
    expect((await execution.runTask(task)).status).toBe('ready');
  });
  it('creates declared parent directories before invoking tool-only authors', async () => {
    // * ARRANGE
    let observed = false;
    const { execution } = await setup({
      agent: async ({ worktree }) => {
        observed = existsSync(path.join(worktree, 'new/nested'));
        throw new Error('Stop after inspecting declared parent directories.');
      },
    });
    // * ACT
    await execution.runTask({ ...tasks[0], files_modified: ['new/nested/A.test.js', 'new/nested/A.js'] });
    // * ASSERT
    expect(observed).toBe(true);
  });
  it('rejects new dispatch as soon as disposal starts while draining existing work', async () => {
    // * ARRANGE
    const started = Promise.withResolvers();
    const release = Promise.withResolvers();
    const { execution } = await setup({
      runner: async () => {
        started.resolve();
        await release.promise;
        return {
          complete: false,
          exitCode: null,
          tests: [],
          errors: [{ kind: 'cancelled', message: 'Fixture stopped' }],
        };
      },
    });
    const first = execution.runTask(tasks[0]);
    await started.promise;
    const closing = execution.dispose();
    let rejection;
    const second = execution.runTask(tasks[1]).catch((error) => {
      rejection = error;
    });
    // * ACT / ASSERT
    try {
      await new Promise(setImmediate);
      expect(rejection?.message).toMatch(/closed/i);
    } finally {
      release.resolve();
      await Promise.allSettled([first, second, closing]);
    }
  });
  it('replays immutable tests against baseline and candidate source without changing the parent', async () => {
    // * ARRANGE
    const actualWorkspace = await vi.importActual('./lib/workspace.mjs');
    const actualPatches = await vi.importActual('./lib/patches.mjs');
    const handedSnapshots = [];
    vi.mocked(auditWorkspaceDetails).mockImplementation(async (...args) => {
      const evidence = await actualWorkspace.auditWorkspaceDetails(...args);
      handedSnapshots.push(evidence.after);
      return evidence;
    });
    vi.mocked(capturePatch).mockImplementation((before, after, files) => {
      expect(handedSnapshots).toContain(after);
      return actualPatches.capturePatch(before, after, files);
    });
    try {
      const { root, execution, calls } = await setup();
      const before = await captureWorkspace(root);
      // * ACT
      const result = await execution.runTask(tasks[0]);
      // * ASSERT
      expect(result.status).toBe('ready');
      expect(result.evidence.red.exitCode).toBe(1);
      expect(result.evidence.green.exitCode).toBe(0);
      expect(result.delta.changes.map(({ path: file }) => file)).toEqual(tasks[0].files_modified);
      const red = calls.find(({ phase }) => phase === 'red');
      const green = calls.find(({ phase }) => phase === 'green');
      expect(red.worktree).not.toBe(green.worktree);
      expect(calls.filter(({ leg }) => leg).map(({ leg }) => leg)).toEqual(['test', 'implement', 'review']);
      expect((await captureWorkspace(root)).digest).toBe(before.digest);
    } finally {
      vi.mocked(auditWorkspaceDetails).mockImplementation(actualWorkspace.auditWorkspaceDetails);
      vi.mocked(capturePatch).mockImplementation(actualPatches.capturePatch);
    }
  });
  it.each([
    ['test', 'protected file'],
    ['test', 'Git config'],
    ['implement', 'protected file'],
  ])('rejects external %s audit drift through a %s', async (leg, mutation) => {
    // * ARRANGE
    const actual = await vi.importActual('./lib/workspace.mjs');
    vi.mocked(auditWorkspaceDetails).mockImplementation(async (...args) => {
      const evidence = await actual.auditWorkspaceDetails(...args);
      if (args[2].leg === leg && evidence.violations.length === 0) {
        if (mutation === 'Git config')
          execFileSync('git', ['-C', args[0].root, 'config', '--local', 'loop.audit', 'external change']);
        else await writeFile(path.join(args[0].root, 'src/B.js'), 'external write after audit');
      }
      return evidence;
    });
    try {
      const { execution } = await setup();
      // * ACT
      const result = await execution.runTask(tasks[0]);
      // * ASSERT
      expect(result.status).toBe('parked');
      expect(result.evidence.diagnostics.at(-1).message).toMatch(/changed after its last audited leg/i);
      expect(result.evidence.legs.map(({ leg: auditedLeg }) => auditedLeg)).toEqual(
        leg === 'test' ? ['test'] : ['test', 'implement']
      );
    } finally {
      vi.mocked(auditWorkspaceDetails).mockImplementation(actual.auditWorkspaceDetails);
    }
  });
  it('rejects an external write after test freeze but before the next author leg', async () => {
    // * ARRANGE
    const actual = await vi.importActual('./lib/patches.mjs');
    let injected = false;
    vi.mocked(capturePatch).mockImplementation(async (before, after, files) => {
      const patch = await actual.capturePatch(before, after, files);
      if (!injected && files.includes('src/A.test.js')) {
        injected = true;
        await writeFile(path.join(after.root, 'src/B.js'), 'external write after freeze');
      }
      return patch;
    });
    try {
      const { execution } = await setup();
      // * ACT
      const result = await execution.runTask(tasks[0]);
      // * ASSERT
      expect(injected).toBe(true);
      expect(result.status).toBe('parked');
      expect(result.evidence.diagnostics.at(-1).message).toMatch(/changed after its last audited leg/i);
      expect(result.evidence.legs.map(({ leg }) => leg)).toEqual(['test']);
    } finally {
      vi.mocked(capturePatch).mockImplementation(actual.capturePatch);
    }
  });
  // Known margin: this two-task Git/filesystem integration went from ~29s to ~26.7s after the
  // sequential root-check fix; residual subprocess/I/O variance under load is not a hang.
  it('integrates siblings then seeds the next accepted baseline with both uncommitted deltas', async () => {
    // * ARRANGE
    const { root, execution, calls } = await setup();
    // * ACT
    const result = await execution.runWave(tasks);
    // * ASSERT
    expect(result.status).toBe('ready');
    const accepted = await execution.pathFor(result.baseline);
    for (const task of tasks) expect(await readFile(path.join(accepted, `src/${task.id}.js`), 'utf8')).toBe('one');
    expect(new Set(calls.filter(({ leg }) => leg === 'test').map(({ worktree }) => worktree)).size).toBe(2);
    expect(await readFile(path.join(root, 'src/A.js'), 'utf8')).toBe('zero');
    expect((await captureWorkspace(accepted)).head).toBe((await captureWorkspace(root)).head);
  }, 45_000);
  it.each(['test', 'implement'])('rejects an inverse-fence write by the %s author', async (badLeg) => {
    // * ARRANGE
    const normal = adapters();
    const { execution } = await setup({
      agent: async (request) => {
        const outcome = await normal.agent(request);
        if (request.leg === badLeg) {
          const forbidden = path.join(request.worktree, badLeg === 'test' ? 'src/A.js' : 'src/A.test.js');
          await writeFile(forbidden, 'unauthorized');
          outcome.reportedWrites.push(forbidden);
        }
        return outcome;
      },
    });
    // * ACT / ASSERT
    const result = await execution.runTask(tasks[0]);
    expect(result.status).toBe('parked');
    expect(result.evidence.audits.at(-1).violations.length).toBeGreaterThan(0);
  });
  it('rejects source mutations made by executing test code, even if its report claims RED', async () => {
    // * ARRANGE
    const normal = adapters();
    const { execution } = await setup({
      runner: async (request) => {
        const report = await normal.runner(request);
        if (request.phase === 'red') await writeFile(path.join(request.cwd, 'src/A.js'), 'test changed source');
        return report;
      },
    });
    // * ACT / ASSERT
    const result = await execution.runTask(tasks[0]);
    expect(result.status).toBe('parked');
    expect(result.evidence.diagnostics.at(-1).message).toMatch(/runner mutated/i);
    expect(result.evidence.legs.map(({ leg }) => leg)).toEqual(['test']);
  });
  it('fails explicitly on baseline drift and rejects unknown or closed snapshot access', async () => {
    // * ARRANGE
    const { execution } = await setup();
    await expect(execution.pathFor('unknown')).rejects.toThrow(/snapshot/i);
    const baseline = await execution.pathFor(execution.baseline);
    await writeFile(path.join(baseline, 'src/A.js'), 'changed');
    // * ACT / ASSERT
    await expect(execution.runTask(tasks[0])).rejects.toThrow(/baseline changed/i);
    await execution.dispose();
    await expect(execution.runTask(tasks[0])).rejects.toThrow(/closed/i);
  });
});
