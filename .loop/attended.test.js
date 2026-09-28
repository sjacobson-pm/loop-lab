// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLegWorktree, prepareAttended, readIssue } from './attended.mjs';

vi.mock('node:fs/promises', async (original) => {
  const fs = await original();
  return { ...fs, copyFile: vi.fn(fs.copyFile) };
});

const roots = [];
it('reads issues without evaluating preparation-only dependencies', async () => {
  // * ARRANGE
  const root = await mkdtemp(path.join(os.tmpdir(), 'loop-issue-boundary-'));
  roots.push(root);
  await mkdir(path.join(root, 'lib'));
  for (const file of [
    'attended.mjs',
    'host.mjs',
    'lib/plan.mjs',
    'lib/waves.mjs',
    'lib/fences.mjs',
    'lib/workspace.mjs',
  ])
    await copyFile(new URL(file, import.meta.url), path.join(root, file));
  await writeFile(
    path.join(root, 'lib/orchestrator.mjs'),
    'throw new Error("Preparation-only dependency evaluated"); export function prepareLoop() {}'
  );
  await mkdir(path.join(root, '.loop'));
  await writeFile(
    path.join(root, '.loop/targets.json'),
    JSON.stringify({ targets: { 'react-vitest': { exercised: true, publication_base: 'main', test_pathspecs: [] } } })
  );
  await writeFile(path.join(root, 'spec.html'), '<html></html>');
  const program = `
    const {readIssue,prepareAttended} = await import(${JSON.stringify(pathToFileURL(path.join(root, 'attended.mjs')).href)});
    const issue = await readIssue('owner/repo',42,async()=>({stdout:JSON.stringify({number:42,title:'Title',body:'Body'})}));
    console.log(issue.body);
    try { await readIssue('invalid',0); } catch(error) { console.log(error.message); }
    try { await prepareAttended({root:${JSON.stringify(root)},issue,specPath:'spec.html',target:'react-vitest',acceptanceKinds:['Rule']}); }
    catch(error) { console.log(error.message); }
  `;
  // * ACT / ASSERT
  expect(execFileSync(process.execPath, ['--input-type=module', '-e', program], { encoding: 'utf8' }).trim()).toBe(
    'Body\nInvalid issue coordinates\nPreparation-only dependency evaluated'
  );
});
async function repository() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loop-attended-'));
  roots.push(root);
  execFileSync('git', ['init', '--quiet', root]);
  // Tests use an existing empty-tree commit object, without running git commit or creating user commits.
  const emptyTree = execFileSync('git', ['-C', root, 'hash-object', '-t', 'tree', '-w', '--stdin'], { input: '' })
    .toString()
    .trim();
  const commit = `tree ${emptyTree}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nFixture\n`;
  const oid = execFileSync('git', ['-C', root, 'hash-object', '-t', 'commit', '-w', '--stdin'], { input: commit })
    .toString()
    .trim();
  execFileSync('git', ['-C', root, 'update-ref', 'HEAD', oid]);
  await mkdir(path.join(root, '.loop'), { recursive: true });
  await mkdir(path.join(root, 'spec'));
  await writeFile(path.join(root, 'spec/x.html'), '<p id="rule-a" data-pd-kind="Rule">One timer runs.</p>');
  await writeFile(
    path.join(root, '.loop/targets.json'),
    JSON.stringify({
      targets: { 'react-vitest': { exercised: true, publication_base: 'main', test_pathspecs: ['*.test.js'] } },
    })
  );
  await writeFile(path.join(root, 'approved.txt'), 'reviewed uncommitted tree');
  execFileSync('git', ['-C', root, 'add', '.']);
  return root;
}
afterEach(async () => {
  const removals = await Promise.allSettled(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  const failure = removals.find(({ status }) => status === 'rejected');
  if (failure) throw failure.reason;
});
const issue = { number: 42, title: 'Smoke issue', body: 'Permit one running timer.', repository: 'owner/repo' };
const proposed = {
  issue: 42,
  target: 'react-vitest',
  tasks: [
    {
      id: 'A',
      summary: 'Enforce one timer',
      criteria: ['spec/x.html#rule-a'],
      depends_on: [],
      files_modified: ['src/a.js', 'src/a.test.js'],
      public_surface: [],
    },
  ],
  waves: [['invented']],
};
const outcome = (writes = []) => ({
  status: 'completed',
  reportedWrites: writes,
  usage: { counters: [] },
  diagnostics: [],
});

describe('readIssue', () => {
  it('reads GitHub prose without requiring story headings and uses separate argv', async () => {
    // * ARRANGE
    const execute = vi.fn(async () => ({
      stdout: JSON.stringify({ number: 42, title: issue.title, body: issue.body }),
    }));
    // * ACT
    const result = await readIssue('owner/repo', 42, execute);
    // * ASSERT
    expect(result).toEqual(issue);
    expect(execute).toHaveBeenCalledWith(
      'gh',
      ['issue', 'view', '42', '--repo', 'owner/repo', '--json', 'number,title,body'],
      expect.objectContaining({ shell: false })
    );
  });
  it.each([
    ['bad/repo/extra', 42],
    ['owner/repo', 0],
  ])('rejects ambiguous issue coordinates', async (repository, number) => {
    // * ARRANGE / ACT / ASSERT
    await expect(readIssue(repository, number)).rejects.toThrow();
  });
  it('rejects path-like repository coordinates before invoking GitHub', async () => {
    const execute = vi.fn();
    await expect(readIssue('../repo', 42, execute)).rejects.toThrow(/coordinates/i);
    expect(execute).not.toHaveBeenCalled();
  });
  it('rejects a mismatched GitHub issue response', async () => {
    // * ARRANGE / ACT / ASSERT
    await expect(readIssue('owner/repo', 42, async () => ({ stdout: '{"number":43}' }))).rejects.toThrow(/response/);
  });
});

describe('isolated attended preparation', { timeout: 30_000 }, () => {
  it('disposes a derived worktree after its seeding worktree has been removed', async () => {
    // * ARRANGE
    const root = await repository();
    const parent = await createLegWorktree(root);
    const child = await createLegWorktree(parent.path);
    await parent.dispose();
    // * ACT / ASSERT
    try {
      await expect(child.dispose()).resolves.toBeUndefined();
    } finally {
      // Preserve the failing assertion while cleaning this regression's own scratch resources.
      if (existsSync(child.path)) {
        execFileSync('git', ['-C', root, 'worktree', 'remove', '--force', child.path]);
        await rm(path.dirname(child.path), { recursive: true, force: true });
      }
    }
  });
  it('surfaces a real Git disposal failure when the shared repository becomes unavailable', async () => {
    // * ARRANGE
    const root = await repository();
    const tree = await createLegWorktree(root);
    await rename(path.join(root, '.git'), path.join(root, 'unavailable-git'));
    // * ACT / ASSERT
    try {
      await expect(tree.dispose()).rejects.toMatchObject({ code: 128 });
    } finally {
      await rename(path.join(root, 'unavailable-git'), path.join(root, '.git'));
      await tree.dispose();
    }
  });
  it('preserves tracked deletions when seeding from HEAD', async () => {
    // * ARRANGE
    const root = await repository();
    const treeId = execFileSync('git', ['-C', root, 'write-tree']).toString().trim();
    const commit = `tree ${treeId}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nFixture\n`;
    const oid = execFileSync('git', ['-C', root, 'hash-object', '-t', 'commit', '-w', '--stdin'], { input: commit })
      .toString()
      .trim();
    execFileSync('git', ['-C', root, 'update-ref', 'HEAD', oid]);
    await rm(path.join(root, 'approved.txt'));
    // * ACT
    const seeded = await createLegWorktree(root);
    try {
      // * ASSERT
      await expect(readFile(path.join(seeded.path, 'approved.txt'))).rejects.toThrow(/ENOENT/);
    } finally {
      await seeded.dispose();
    }
  });
  it('rejects symlink baselines instead of copying their targets', async () => {
    // * ARRANGE
    const root = await repository();
    const outside = await repository();
    await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    // * ACT / ASSERT
    await expect(createLegWorktree(root)).rejects.toThrow(/non-regular|Invalid declared path/);
  });
  it('rejects submodule directories rather than silently omitting their contents', async () => {
    // * ARRANGE
    const root = await repository();
    await mkdir(path.join(root, 'submodule'));
    const oid = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD']).toString().trim();
    execFileSync('git', ['-C', root, 'update-index', '--add', '--cacheinfo', `160000,${oid},submodule`]);
    // * ACT / ASSERT
    await expect(createLegWorktree(root)).rejects.toThrow(/non-regular/);
  });
  it('does not materialize a HEAD symlink replaced by an uncommitted regular file', async () => {
    // * ARRANGE
    const root = await repository();
    const outside = await repository();
    const external = path.join(outside, 'approved.txt');
    execFileSync('git', ['-C', root, 'config', '--local', 'core.symlinks', 'true']);
    const linkBlob = execFileSync('git', ['-C', root, 'hash-object', '-w', '--stdin'], { input: external })
      .toString()
      .trim();
    execFileSync('git', ['-C', root, 'update-index', '--cacheinfo', `120000,${linkBlob},approved.txt`]);
    const treeId = execFileSync('git', ['-C', root, 'write-tree']).toString().trim();
    const commit = `tree ${treeId}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nFixture\n`;
    const oid = execFileSync('git', ['-C', root, 'hash-object', '-t', 'commit', '-w', '--stdin'], { input: commit })
      .toString()
      .trim();
    execFileSync('git', ['-C', root, 'update-ref', 'HEAD', oid]);
    const actual = await vi.importActual('node:fs/promises');
    vi.mocked(copyFile).mockImplementation(async (source, destination) => {
      let stat;
      try {
        stat = await actual.lstat(destination);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (stat?.isSymbolicLink()) throw new Error('Unsafe inherited destination symlink; copy intercepted');
      await actual.copyFile(source, destination);
    });
    let seeded;
    try {
      // * ACT
      seeded = await createLegWorktree(root);
      // * ASSERT
      expect((await actual.lstat(path.join(seeded.path, 'approved.txt'))).isSymbolicLink()).toBe(false);
      expect(await readFile(external, 'utf8')).toBe('reviewed uncommitted tree');
    } finally {
      vi.mocked(copyFile).mockImplementation(actual.copyFile);
      if (seeded) await seeded.dispose();
    }
  });
  it('cleans up failed worktree creation without inventing a baseline commit', async () => {
    // * ARRANGE
    const root = await mkdtemp(path.join(os.tmpdir(), 'loop-unborn-'));
    roots.push(root);
    execFileSync('git', ['init', '--quiet', root]);
    // * ACT / ASSERT
    await expect(createLegWorktree(root)).rejects.toThrow(/HEAD/);
    expect(
      execFileSync('git', ['-C', root, 'worktree', 'list', '--porcelain'])
        .toString()
        .match(/worktree /g)
    ).toHaveLength(1);
  });
  it('rejects a parent changed while seeding and removes the partial child', async () => {
    // * ARRANGE
    const root = await repository();
    const realCopy = await vi.importActual('node:fs/promises');
    vi.mocked(copyFile).mockImplementationOnce(async (source, destination) => {
      await realCopy.copyFile(source, destination);
      await writeFile(path.join(root, 'approved.txt'), 'concurrent change');
    });
    // * ACT / ASSERT
    await expect(createLegWorktree(root)).rejects.toThrow(/Baseline changed/);
    expect(
      execFileSync('git', ['-C', root, 'worktree', 'list', '--porcelain'])
        .toString()
        .match(/worktree /g)
    ).toHaveLength(1);
  });
  it('seeds two independent worktrees from the same uncommitted tree, without new commits', async () => {
    // * ARRANGE
    const root = await repository();
    const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD']).toString();
    await writeFile(path.join(root, 'untracked.txt'), 'also approved');
    // * ACT
    const first = await createLegWorktree(root);
    const second = await createLegWorktree(root);
    try {
      // * ASSERT
      for (const tree of [first, second]) {
        expect(await readFile(path.join(tree.path, 'approved.txt'), 'utf8')).toBe('reviewed uncommitted tree');
        expect(await readFile(path.join(tree.path, 'untracked.txt'), 'utf8')).toBe('also approved');
        expect(execFileSync('git', ['-C', tree.path, 'rev-parse', 'HEAD']).toString()).toBe(head);
      }
      await writeFile(path.join(first.path, 'approved.txt'), 'isolated mutation');
      expect(await readFile(path.join(second.path, 'approved.txt'), 'utf8')).toBe('reviewed uncommitted tree');
      expect(await readFile(path.join(root, 'approved.txt'), 'utf8')).toBe('reviewed uncommitted tree');
    } finally {
      await first.dispose();
      await second.dispose();
    }
  });
  it('audits a fresh decompose context and persists only index and computed plan before Gate 1', async () => {
    // * ARRANGE
    const root = await repository();
    const agent = vi.fn(async ({ worktree, prompt }) => {
      expect(prompt).toContain('"indexPath":".loop/criteria/42.json"');
      expect(prompt).not.toContain('"criteria":[{"anchor"');
      expect(JSON.parse(await readFile(path.join(worktree, '.loop/criteria/42.json'), 'utf8')).criteria[0].text).toBe(
        'One timer runs.'
      );
      const file = path.join(worktree, '.loop/plans/42.plan.json');
      await writeFile(file, JSON.stringify(proposed));
      return outcome([file]);
    });
    // * ACT
    const result = await prepareAttended({
      root,
      issue,
      specPath: 'spec/x.html',
      target: 'react-vitest',
      acceptanceKinds: ['Rule'],
      gate1: async () => ({ decision: 'approve' }),
      agent,
    });
    // * ASSERT
    expect(result.status).toBe('planned');
    expect(JSON.parse(await readFile(path.join(root, '.loop/plans/42.plan.json'), 'utf8')).waves).toEqual([['A']]);
    expect(await readFile(path.join(root, 'approved.txt'), 'utf8')).toBe('reviewed uncommitted tree');
    expect(agent.mock.calls[0][0].leg).toBe('decompose');
    expect(await readdir(path.join(root, '.loop'))).toEqual(
      expect.arrayContaining(['criteria', 'plans', 'targets.json'])
    );
  });
  it('re-enters Gate 1 on reviewed decomposition findings without dispatching another agent', async () => {
    const root = await repository();
    const agent = vi.fn(async ({ worktree }) => {
      const file = path.join(worktree, '.loop/plans/42.plan.json');
      await writeFile(file, JSON.stringify(proposed));
      return outcome([file]);
    });
    const gate1 = vi.fn().mockResolvedValueOnce({ decision: 'approve' }).mockResolvedValueOnce({ decision: 'stop' });
    const prepared = await prepareAttended({
      root,
      issue,
      specPath: 'spec/x.html',
      target: 'react-vitest',
      acceptanceKinds: ['Rule'],
      gate1,
      agent,
    });
    const finding = {
      code: 'ownership_conflict',
      fault_domain: 'decompose',
      criteria: ['spec/x.html#rule-a'],
      files: ['src/a.js'],
      message: 'The approved owner of src/a.js conflicts with a sibling',
    };
    const result = await prepared.reenter({
      status: 'gate1',
      findings: [finding],
      tasks: [{ taskId: 'A', status: 'ready', findings: [], delta: { changes: [] } }],
    });
    expect(result.status).toBe('stopped');
    expect(result.affectedTaskIds).toEqual(['A']);
    expect(gate1).toHaveBeenCalledTimes(2);
    expect(agent).toHaveBeenCalledTimes(1);
  }, 30_000);
  it.each(['completed', 'failed', 'throw'])(
    'audits and rejects undeclared writes even when transport is %s',
    async (status) => {
      // * ARRANGE
      const root = await repository();
      const gate1 = vi.fn();
      const agent = async ({ worktree }) => {
        await writeFile(path.join(worktree, 'forbidden.js'), 'bad');
        if (status === 'throw') throw new Error('transport failed');
        return { ...outcome(), status };
      };
      // * ACT / ASSERT
      await expect(
        prepareAttended({
          root,
          issue,
          specPath: 'spec/x.html',
          target: 'react-vitest',
          acceptanceKinds: ['Rule'],
          gate1,
          agent,
        })
      ).rejects.toThrow(/undeclared/);
      expect(gate1).not.toHaveBeenCalled();
      await expect(readFile(path.join(root, 'forbidden.js'))).rejects.toThrow(/ENOENT/);
    }
  );
  it('does not dispatch an unexercised target or traversal spec path', async () => {
    // * ARRANGE
    const root = await repository();
    const agent = vi.fn();
    // * ACT / ASSERT
    await expect(
      prepareAttended({ root, issue, specPath: '../secret', target: 'react-vitest', acceptanceKinds: ['Rule'], agent })
    ).rejects.toThrow();
    await expect(
      prepareAttended({
        root,
        issue,
        specPath: 'spec/x.html',
        target: 'dotnet-xunit',
        acceptanceKinds: ['Rule'],
        agent,
      })
    ).rejects.toThrow(/target/i);
    expect(agent).not.toHaveBeenCalled();
  });
  it.each([undefined, '../outside', 'main --force'])(
    'rejects publication base %s before decompose or Gate 1',
    async (base) => {
      const root = await repository();
      const config = path.join(root, '.loop/targets.json');
      const targets = JSON.parse(await readFile(config, 'utf8'));
      targets.targets['react-vitest'].publication_base = base;
      await writeFile(config, JSON.stringify(targets));
      const agent = vi.fn();
      const gate1 = vi.fn();
      await expect(
        prepareAttended({
          root,
          issue,
          specPath: 'spec/x.html',
          target: 'react-vitest',
          acceptanceKinds: ['Rule'],
          agent,
          gate1,
        })
      ).rejects.toThrow(/publication base/i);
      expect(agent).not.toHaveBeenCalled();
      expect(gate1).not.toHaveBeenCalled();
    }
  );
  it('retains transport diagnostics when a completed leg produces no valid JSON artifact', async () => {
    // * ARRANGE
    const root = await repository();
    // * ACT / ASSERT
    await expect(
      prepareAttended({
        root,
        issue,
        specPath: 'spec/x.html',
        target: 'react-vitest',
        acceptanceKinds: ['Rule'],
        gate1: vi.fn(),
        agent: async () => ({ ...outcome(), messages: ['Unable to produce plan'] }),
      })
    ).rejects.toThrow(/Unable to produce plan/);
  });
});
