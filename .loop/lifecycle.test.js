// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runAttended } from './lifecycle.mjs';

const issue = { number: 42, repository: 'owner/repo', title: 'One timer', body: 'Issue prose' };
const tasks = ['A', 'B'].map((id) => ({
  id,
  depends_on: [],
  files_modified: [`src/${id}.js`],
  criteria: [`spec/x.html#rule-${id}`],
}));
const plan = { issue: 42, target: 'react-vitest', tasks, waves: [['A'], ['B']] };
const hashes = { spec: 'spec-42', target: 'target-42', plan: 'plan-42' };
const approved = { status: 'planned', plan, hashes };
const wave = (task, baseline) => ({
  status: 'ready',
  baseline: `${baseline}-${task.id}`,
  tasks: [{ taskId: task.id, status: 'ready', delta: { bytes: Buffer.from(task.id), changes: [] } }],
  integration: { verdict: { status: 'GREEN' } },
});

describe('attended Gate 1 through Gate 2 lifecycle', () => {
  it('runs the approved waves in order, presents only Gate 2, and disposes all worktrees after the human stops', async () => {
    const calls = [];
    const execution = {
      baseline: 'start',
      runWave: vi.fn(async ([task], { baseline }) => {
        calls.push(`${task.id}:${baseline}`);
        return wave(task, baseline);
      }),
      dispose: vi.fn(async () => calls.push('dispose')),
    };
    const prepare = async ({ gate1 }) => {
      expect(await gate1({ plan, prGroups: [['A'], ['B']] })).toEqual({ decision: 'approve' });
      return approved;
    };
    const publisher = vi.fn(async ({ run, groups }, ports) => {
      expect(run).toMatchObject({ issue, plan, hashes, base: 'main' });
      expect(run.waves).toHaveLength(2);
      expect(groups.map(({ taskIds }) => taskIds)).toEqual([['A'], ['B']]);
      expect(await ports.gate2({ groups, treeDigests: ['tree-a', 'tree-b'] })).toEqual({ decision: 'stop' });
      return { status: 'stopped', pullRequests: [] };
    });
    const result = await runAttended(
      {
        root: 'fixture-root',
        issue,
        specPath: 'spec/x.html',
        target: 'react-vitest',
        acceptanceKinds: ['Rule'],
        gate1: async () => {
          calls.push('gate1');
          return { decision: 'approve' };
        },
        gate2: async () => {
          calls.push('gate2');
          return { decision: 'stop' };
        },
      },
      {
        prepare,
        executionFactory: async () => execution,
        publisher,
        loadApproved: async () => ({
          index: { spec_path: 'spec/x.html' },
          targetConfig: { publication_base: 'main' },
          plan,
        }),
        localFactory: ({ gate2 }) => ({ gate2, readInputs: async () => hashes }),
        githubFactory: () => ({}),
        checkBaseline: async () => {},
      }
    );
    expect(result).toEqual({ status: 'stopped', pullRequests: [] });
    expect(calls).toEqual(['gate1', 'A:start', 'B:start-A', 'gate2', 'dispose']);
    expect(execution.dispose).toHaveBeenCalledTimes(1);
    expect(publisher).toHaveBeenCalledTimes(1);
  });

  it('keeps execution open until asynchronous publication finishes staging', async () => {
    const events = [];
    let disposed = false;
    const execution = {
      baseline: 'start',
      runWave: async ([entry], { baseline }) => wave(entry, baseline),
      stageGroup: async () => {
        if (disposed) throw new Error('Execution is closed.');
        events.push('staged');
      },
      dispose: async () => {
        disposed = true;
        events.push('disposed');
      },
    };
    const result = await runAttended(
      { root: 'fixture-root', issue, target: 'react-vitest', specPath: 'spec/x.html' },
      {
        prepare: async () => approved,
        executionFactory: async () => execution,
        loadApproved: async () => ({
          plan,
          index: { spec_path: 'spec/x.html' },
          targetConfig: { publication_base: 'main' },
        }),
        localFactory: ({ execution: current }) => ({
          readInputs: async () => hashes,
          prepareGroup: (group) => current.stageGroup(group),
        }),
        githubFactory: () => ({}),
        publisher: async (_, ports) => {
          await new Promise(setImmediate);
          await ports.prepareGroup({ taskIds: ['A'] });
          events.push('published');
          return { status: 'pr-opened', pullRequests: ['https://github.com/owner/repo/pull/7'] };
        },
        checkBaseline: async () => {},
      }
    );
    expect(result.status).toBe('pr-opened');
    expect(events).toEqual(['staged', 'published', 'disposed']);
  });

  it('does not present Gate 2 after a parked wave and always disposes execution', async () => {
    const execution = {
      baseline: 'start',
      runWave: async () => ({ status: 'parked', tasks: [{ taskId: 'A', status: 'parked' }] }),
      dispose: vi.fn(),
    };
    const publisher = vi.fn();
    const result = await runAttended(
      { root: 'fixture-root', issue, target: 'react-vitest', specPath: 'spec/x.html', acceptanceKinds: ['Rule'] },
      {
        prepare: async () => approved,
        executionFactory: async () => execution,
        publisher,
        loadApproved: async () => ({
          index: { spec_path: 'spec/x.html' },
          targetConfig: { publication_base: 'main' },
          plan,
        }),
        localFactory: () => ({ readInputs: async () => hashes }),
        checkBaseline: async () => {},
      }
    );
    expect(result.status).toBe('parked');
    expect(publisher).not.toHaveBeenCalled();
    expect(execution.dispose).toHaveBeenCalledTimes(1);
  });

  it('rejects a plan changed after Gate 1 without starting execution', async () => {
    const executionFactory = vi.fn();
    await expect(
      runAttended(
        { root: 'fixture-root', issue, target: 'react-vitest', specPath: 'spec/x.html', acceptanceKinds: ['Rule'] },
        {
          prepare: async () => approved,
          executionFactory,
          loadApproved: async () => ({
            index: { spec_path: 'spec/x.html' },
            targetConfig: { publication_base: 'main' },
            plan: { ...plan, waves: [['B'], ['A']] },
          }),
          checkBaseline: async () => {},
        }
      )
    ).rejects.toThrow(/approved plan/i);
    expect(executionFactory).not.toHaveBeenCalled();
  });

  it.each([
    ['issue', { ...plan, issue: 43 }, { ...approved, plan: { ...plan, issue: 43 } }, { spec_path: 'spec/x.html' }],
    [
      'target',
      { ...plan, target: 'other' },
      { ...approved, plan: { ...plan, target: 'other' } },
      { spec_path: 'spec/x.html' },
    ],
    ['criteria path', plan, approved, { spec_path: 'spec/other.html' }],
  ])('rejects approved %s evidence that disagrees with the invocation', async (_, loaded, approval, index) => {
    const executionFactory = vi.fn();
    await expect(
      runAttended(
        { root: 'fixture-root', issue, target: 'react-vitest', specPath: 'spec/x.html' },
        {
          prepare: async () => approval,
          loadApproved: async () => ({ plan: loaded, index, targetConfig: { publication_base: 'main' } }),
          executionFactory,
          checkBaseline: async () => {},
        }
      )
    ).rejects.toThrow(/do not agree/i);
    expect(executionFactory).not.toHaveBeenCalled();
  });

  it('passes explicitly selected agent and runner to execution and rejects stale approved inputs before waves', async () => {
    const agent = async () => {};
    const runner = async () => {};
    const runWave = vi.fn();
    const executionFactory = vi.fn(async () => ({ baseline: 'start', runWave, dispose: async () => {} }));
    const publisher = vi.fn();
    expect(
      await runAttended(
        { root: 'fixture-root', issue, target: 'react-vitest', specPath: 'spec/x.html', agent, runner },
        {
          prepare: async () => approved,
          loadApproved: async () => ({
            plan,
            index: { spec_path: 'spec/x.html' },
            targetConfig: { publication_base: 'main' },
          }),
          executionFactory,
          localFactory: () => ({ readInputs: async () => ({ ...hashes, plan: 'changed' }) }),
          publisher,
          checkBaseline: async () => {},
        }
      )
    ).toEqual({ status: 'stale', pullRequests: [] });
    expect(executionFactory).toHaveBeenCalledWith(expect.objectContaining({ agent, runner }));
    expect(runWave).not.toHaveBeenCalled();
    expect(publisher).not.toHaveBeenCalled();
  });

  it('rejects an unknown task in an approved wave and disposes execution', async () => {
    const invalid = { ...plan, waves: [['not-declared']] };
    const dispose = vi.fn();
    const runWave = vi.fn();
    await expect(
      runAttended(
        { root: 'fixture-root', issue, target: 'react-vitest', specPath: 'spec/x.html' },
        {
          prepare: async () => ({ ...approved, plan: invalid }),
          loadApproved: async () => ({
            plan: invalid,
            index: { spec_path: 'spec/x.html' },
            targetConfig: { publication_base: 'main' },
          }),
          executionFactory: async () => ({ baseline: 'start', runWave, dispose }),
          localFactory: () => ({ readInputs: async () => hashes }),
          checkBaseline: async () => {},
        }
      )
    ).rejects.toThrow(/Unknown task/);
    expect(runWave).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('requires an available re-entry before continuing after a decomposition fault', async () => {
    const failedWave = { status: 'gate1', tasks: [{ taskId: 'A', status: 'gate1' }], findings: [] };
    const gate2 = vi.fn();
    await expect(
      runAttended(
        { root: 'fixture-root', issue, target: 'react-vitest', specPath: 'spec/x.html', gate2 },
        {
          prepare: async () => approved,
          loadApproved: async () => ({
            plan,
            index: { spec_path: 'spec/x.html' },
            targetConfig: { publication_base: 'main' },
          }),
          executionFactory: async () => ({
            baseline: 'start',
            runWave: async () => failedWave,
            dispose: async () => {},
          }),
          localFactory: () => ({ readInputs: async () => hashes }),
          checkBaseline: async () => {},
        }
      )
    ).rejects.toThrow(/re-entry is unavailable/);
    expect(gate2).not.toHaveBeenCalled();
  });

  it('checks the actual checkout cleanliness before preparation by default', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'loop-dirty-lifecycle-'));
    try {
      execFileSync('git', ['init', '--quiet', root]);
      await writeFile(path.join(root, 'untracked.js'), 'dirty');
      const prepare = vi.fn();
      await expect(runAttended({ root, issue, specPath: 'spec/x.html' }, { prepare })).rejects.toThrow(
        /clean baseline/
      );
      expect(prepare).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it('routes a drained decomposition finding back to the same Gate 1 rather than exposing Gate 2', async () => {
    const failedWave = { status: 'gate1', tasks: [{ taskId: 'A', status: 'gate1' }], findings: [] };
    const reenter = vi.fn(async () => ({ status: 'stopped' }));
    const gate2 = vi.fn();
    const execution = {
      baseline: 'start',
      runWave: async () => failedWave,
      dispose: vi.fn(),
    };
    const result = await runAttended(
      {
        root: 'fixture-root',
        issue,
        target: 'react-vitest',
        specPath: 'spec/x.html',
        acceptanceKinds: ['Rule'],
        gate2,
      },
      {
        prepare: async () => ({ ...approved, reenter }),
        executionFactory: async () => execution,
        loadApproved: async () => ({
          index: { spec_path: 'spec/x.html' },
          targetConfig: { publication_base: 'main' },
          plan,
        }),
        localFactory: () => ({ readInputs: async () => hashes }),
        checkBaseline: async () => {},
      }
    );
    expect(result.status).toBe('stopped');
    expect(reenter).toHaveBeenCalledWith(failedWave);
    expect(execution.dispose).toHaveBeenCalledTimes(1);
    expect(gate2).not.toHaveBeenCalled();
  });

  it('refuses a dirty checkout before spending an agent execution', async () => {
    const prepare = vi.fn();
    await expect(
      runAttended(
        { root: 'dirty-root', issue, target: 'react-vitest', specPath: 'spec/x.html', acceptanceKinds: ['Rule'] },
        {
          prepare,
          checkBaseline: async () => {
            throw new Error('Publication requires a clean baseline.');
          },
        }
      )
    ).rejects.toThrow(/clean baseline/);
    expect(prepare).not.toHaveBeenCalled();
  });
  it('rejects a path-like repository before preparing the plan', async () => {
    const prepare = vi.fn();
    await expect(
      runAttended(
        { root: 'fixture-root', issue: { ...issue, repository: '../repo' }, specPath: 'spec/x.html' },
        { prepare, checkBaseline: async () => {} }
      )
    ).rejects.toThrow(/repository/i);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('loads approved criteria, plan and configured base from the selected checkout, not the harness directory', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'loop-approved-'));
    try {
      await mkdir(path.join(root, '.loop/criteria'), { recursive: true });
      await mkdir(path.join(root, '.loop/plans'), { recursive: true });
      const index = { spec_path: 'spec/x.html', criteria: [{ anchor: 'spec/x.html#rule-A' }] };
      await writeFile(path.join(root, '.loop/criteria/42.json'), JSON.stringify(index));
      await writeFile(path.join(root, '.loop/plans/42.plan.json'), JSON.stringify(plan));
      await writeFile(
        path.join(root, '.loop/targets.json'),
        JSON.stringify({ targets: { 'react-vitest': { publication_base: 'main' } } })
      );
      const executionFactory = vi.fn(async ({ root: inputRoot, index: supplied, target }) => {
        expect(inputRoot).toBe(root);
        expect(supplied).toEqual(index);
        expect(target.publication_base).toBe('main');
        return {
          baseline: 'start',
          runWave: async ([task], { baseline }) => wave(task, baseline),
          dispose: async () => {},
        };
      });
      const result = await runAttended(
        { root, issue, target: 'react-vitest', specPath: 'spec/x.html', acceptanceKinds: ['Rule'] },
        {
          prepare: async () => approved,
          checkBaseline: async () => {},
          executionFactory,
          localFactory: () => ({ readInputs: async () => hashes }),
          githubFactory: () => ({}),
          publisher: async ({ run }) => ({ status: 'stopped', base: run.base }),
        }
      );
      expect(result).toEqual({ status: 'stopped', base: 'main' });
      expect(executionFactory).toHaveBeenCalledTimes(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
