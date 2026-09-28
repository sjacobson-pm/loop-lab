// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { runAttended } from './lifecycle.mjs';

const issue = { number: 42, repository: 'owner/repo', title: 'Only one timer', body: 'One timer runs.' };
const anchor = 'spec/x.html#rule-a';
const task = {
  id: 'A',
  summary: 'Enforce one running timer',
  criteria: [anchor],
  depends_on: [],
  files_modified: ['src/A.js', 'src/A.test.js'],
  public_surface: [],
};
const binding = {
  id: 'src/A.test.js::only one timer',
  file: 'src/A.test.js',
  name: 'only one timer',
  criteria: [anchor],
};
const git = (root, ...args) =>
  execFileSync('git', ['-c', 'safe.bareRepository=all', '-C', root, ...args], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();

async function fixture() {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'loop-acceptance-'));
  const root = path.join(temporary, 'checkout');
  const remote = path.join(temporary, 'remote.git');
  await mkdir(root);
  git(root, 'init', '--quiet', '--initial-branch=main');
  git(temporary, 'init', '--bare', '--quiet', '--initial-branch=main', remote);
  await mkdir(path.join(root, '.loop'));
  await mkdir(path.join(root, 'spec'));
  await mkdir(path.join(root, 'src'));
  await writeFile(
    path.join(root, '.loop/targets.json'),
    JSON.stringify({
      targets: {
        'react-vitest': {
          exercised: true,
          stack: 'react-vitest',
          publication_base: 'main',
          budgets: { cycle: 3, total: 15 },
          test_pathspecs: ['*.test.js'],
          review_standards: {
            organization: [],
            local: [],
            repository: [],
            guidelines: [],
            required: [],
          },
        },
      },
    })
  );
  await writeFile(path.join(root, 'spec/x.html'), '<p id="rule-a" data-pd-kind="Rule">One timer runs.</p>');
  await writeFile(path.join(root, 'src/A.js'), 'zero');
  git(root, 'add', '--all');
  git(
    root,
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    'Seed synthetic checkout'
  );
  git(root, 'push', '--quiet', remote, 'main:main');
  return { root, remote, dispose: () => rm(temporary, { recursive: true, force: true }) };
}

async function runFixture({ root, remote, events, driftRemote = false }) {
  let reviewedTree;
  const agent = async ({ leg, worktree }) => {
    events.push(leg);
    const completed = { status: 'completed', usage: { counters: [] }, diagnostics: [] };
    if (leg === 'decompose') {
      const file = path.join(worktree, '.loop/plans/42.plan.json');
      await writeFile(file, JSON.stringify({ issue: 42, target: 'react-vitest', tasks: [task] }));
      return { ...completed, reportedWrites: [file], messages: [] };
    }
    if (leg === 'test') {
      const file = path.join(worktree, binding.file);
      await writeFile(file, JSON.stringify(binding));
      return { ...completed, reportedWrites: [file], messages: [JSON.stringify([binding])] };
    }
    if (leg === 'implement') {
      const file = path.join(worktree, 'src/A.js');
      await writeFile(file, 'one');
      return { ...completed, reportedWrites: [file], messages: [] };
    }
    expect(leg).toBe('review');
    expect(await readFile(path.join(worktree, 'src/A.js'), 'utf8')).toBe('one');
    expect(JSON.parse(await readFile(path.join(worktree, binding.file), 'utf8'))).toEqual(binding);
    return { ...completed, reportedWrites: [], toolRequests: [], messages: ['[]'] };
  };
  const runner = async ({ cwd, phase }) => {
    events.push(phase);
    const source = await readFile(path.join(cwd, 'src/A.js'), 'utf8');
    let authored;
    try {
      authored = JSON.parse(await readFile(path.join(cwd, binding.file), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const passed = source === 'one';
    return {
      complete: true,
      exitCode: authored && !passed ? 1 : 0,
      errors: [],
      tests: [
        {
          id: 'baseline::healthy',
          file: 'baseline',
          name: 'healthy',
          status: 'passed',
          failureKind: null,
          message: '',
        },
        ...(authored
          ? [
              {
                ...authored,
                status: passed ? 'passed' : 'failed',
                failureKind: passed ? null : 'assertion',
                message: passed ? '' : 'expected exactly one running timer',
              },
            ]
          : []),
      ],
    };
  };
  return runAttended(
    {
      root,
      issue,
      specPath: 'spec/x.html',
      target: 'react-vitest',
      acceptanceKinds: ['Rule'],
      agent,
      runner,
      gate1: async ({ plan, prGroups }) => {
        events.push('gate1');
        expect(plan.tasks).toEqual([task]);
        expect(prGroups).toEqual([['A']]);
        return { decision: 'approve' };
      },
      gate2: async ({ groups, treeDigests, evidence }) => {
        events.push('gate2');
        expect(groups).toHaveLength(1);
        expect(treeDigests).toEqual([groups[0].tree]);
        reviewedTree = groups[0].tree;
        expect(evidence.hashes).toEqual({
          spec: expect.any(String),
          target: expect.any(String),
          plan: expect.any(String),
        });
        expect(git(groups[0].path, 'write-tree')).toBe(groups[0].tree);
        expect(git(groups[0].path, 'ls-tree', '-r', '--name-only', groups[0].tree)).not.toContain('.loop/plans/');
        git(
          groups[0].path,
          '-c',
          'user.name=Test',
          '-c',
          'user.email=test@example.invalid',
          '-c',
          'commit.gpgsign=false',
          'commit',
          '--quiet',
          '-m',
          'Human publishes reviewed group'
        );
        events.push('human-commit');
        expect(git(groups[0].path, 'rev-parse', 'HEAD^{tree}')).toBe(reviewedTree);
        git(groups[0].path, 'push', '--quiet', remote, `HEAD:refs/heads/${groups[0].head}`);
        events.push('human-push');
        expect(git(remote, 'rev-parse', `refs/heads/${groups[0].head}^{tree}`)).toBe(reviewedTree);
        if (driftRemote) {
          git(remote, 'update-ref', `refs/heads/${groups[0].head}`, git(remote, 'rev-parse', 'refs/heads/main'));
        }
        return { decision: 'publish' };
      },
    },
    {
      githubFactory: () => ({
        readPublishedTree: async ({ head }) => {
          events.push('remote-tree');
          const headOid = git(remote, 'rev-parse', `refs/heads/${head}`);
          return { headOid, tree: git(remote, 'rev-parse', `${headOid}^{tree}`) };
        },
        findPullRequest: async () => null,
        openPullRequest: async (group, branch, { body }) => {
          events.push('open-pr');
          expect(body).toContain(anchor);
          expect(git(remote, 'rev-parse', `refs/heads/${group.head}`)).toBe(branch.headOid);
          return { url: 'https://github.com/owner/repo/pull/7', headOid: branch.headOid, base: group.base };
        },
      }),
    }
  ).then((result) => ({ result, reviewedTree }));
}

it('opens a synthetic PR only for the human-published, reviewed tree after real RED/GREEN/review and both gates', async () => {
  const fixtureRoot = await fixture();
  const events = [];
  try {
    const { result, reviewedTree } = await runFixture({ ...fixtureRoot, events });
    expect(result).toEqual({ status: 'pr-opened', pullRequests: ['https://github.com/owner/repo/pull/7'] });
    expect(git(fixtureRoot.remote, 'rev-parse', 'refs/heads/loop/42-1^{tree}')).toBe(reviewedTree);
    expect(events).toContain('red');
    expect(events).toContain('green');
    expect(events.indexOf('red')).toBeLessThan(events.indexOf('implement'));
    expect(events.indexOf('green')).toBeLessThan(events.indexOf('review'));
    expect(events.indexOf('gate1')).toBeLessThan(events.indexOf('test'));
    expect(events.indexOf('gate2')).toBeLessThan(events.indexOf('human-commit'));
    expect(events.indexOf('human-commit')).toBeLessThan(events.indexOf('human-push'));
    expect(events.indexOf('human-push')).toBeLessThan(events.indexOf('remote-tree'));
    expect(events.indexOf('remote-tree')).toBeLessThan(events.indexOf('open-pr'));
  } finally {
    await fixtureRoot.dispose();
  }
}, 120_000);

it('refuses to open a PR when the temporary remote branch drifts from the reviewed tree', async () => {
  const fixtureRoot = await fixture();
  const events = [];
  try {
    const { result, reviewedTree } = await runFixture({ ...fixtureRoot, events, driftRemote: true });
    expect(result).toEqual({ status: 'stale', pullRequests: [] });
    expect(git(fixtureRoot.remote, 'rev-parse', 'refs/heads/loop/42-1^{tree}')).not.toBe(reviewedTree);
    expect(events).toContain('human-push');
    expect(events).toContain('remote-tree');
    expect(events).not.toContain('open-pr');
  } finally {
    await fixtureRoot.dispose();
  }
}, 120_000);
