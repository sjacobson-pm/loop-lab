// @vitest-environment node
import { execFile, execFileSync } from 'node:child_process';
import { lstat, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditWorkspace, auditWorkspaceDetails, captureWorkspace, matchPathspecs, prepareFence } from './workspace.mjs';

vi.mock('node:child_process', async (original) => {
  const childProcess = await original();
  return { ...childProcess, execFile: vi.fn(childProcess.execFile) };
});

vi.mock('node:fs/promises', async (original) => {
  const fs = await original();
  return { ...fs, lstat: vi.fn(fs.lstat) };
});

const roots = [];
async function repo() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loop-test-'));
  roots.push(root);
  execFileSync('git', ['init', '--quiet', root]);
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/a.js'), 'original');
  await writeFile(path.join(root, 'src/a.test.js'), 'test');
  await writeFile(path.join(root, '.gitignore'), 'ignored/\n');
  execFileSync('git', ['-C', root, 'add', '.']);
  return root;
}
const policy = {
  leg: 'test',
  declaredFiles: ['src/a.js', 'src/a.test.js'],
  testFiles: ['src/a.test.js'],
  protectedFiles: [],
};
afterEach(async () => {
  const removals = await Promise.allSettled(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  const failure = removals.find(({ status }) => status === 'rejected');
  if (failure) throw failure.reason;
});

describe('Git pathspec matching', { timeout: 30_000 }, () => {
  it('matches the actual target rules including nested, untracked, and excluded paths without touching a real index', async () => {
    // * ARRANGE
    const paths = [
      'src/feature/a.test.js',
      'src/feature/a.test.jsx',
      'src/__testing__/render.js',
      'src/feature/__mocks__/api.js',
      'vite.config.js',
      'src/feature/a.js',
      'space dir/new.test.js',
    ];
    // * ACT
    const matches = await matchPathspecs(paths, [
      '*.test.js',
      '*.test.jsx',
      'src/__testing__/**',
      '**/__mocks__/**',
      'vite.config.*',
    ]);
    // * ASSERT
    expect([...matches]).toEqual([...paths.filter((file) => file !== 'src/feature/a.js')].sort());
    expect([...(await matchPathspecs(paths, ['*.test.js', ':(exclude)space dir/**']))]).toEqual([
      'src/feature/a.test.js',
    ]);
    expect([...(await matchPathspecs(paths, []))]).toEqual([]);
  });
});

describe('workspace audit', { timeout: 30_000 }, () => {
  it('checks the real root alongside other Git probes and drains them before rejecting an invalid root', async () => {
    // * ARRANGE
    const root = await repo();
    const childProcess = await vi.importActual('node:child_process');
    const topReady = Promise.withResolvers();
    const statusReady = Promise.withResolvers();
    const started = [];
    let delayedTop;
    let delayedStatus;
    vi.mocked(execFile).mockImplementation((...args) => {
      if (args[1].includes('--porcelain=v1')) started.push('status');
      return childProcess.execFile(...args.slice(0, 3), (...result) => {
        if (args[1].includes('--show-toplevel')) {
          delayedTop = () => args[3](...result);
          topReady.resolve();
        } else if (args[1].includes('--porcelain=v1')) {
          delayedStatus = () => args[3](...result);
          statusReady.resolve();
        } else args[3](...result);
      });
    });
    const pending = captureWorkspace(path.join(root, 'src'));
    let settled = false;
    pending.then(
      () => (settled = true),
      () => (settled = true)
    );
    try {
      // * ACT / ASSERT
      await topReady.promise;
      expect(started).toContain('status');
      await statusReady.promise;
      delayedTop();
      await new Promise((resolve) => setImmediate(resolve));
      expect(settled).toBe(false);
      delayedStatus();
      await expect(pending).rejects.toThrow(/exact worktree root/);
    } finally {
      delayedTop?.();
      delayedStatus?.();
      await pending.catch(() => {});
      vi.mocked(execFile).mockImplementation(childProcess.execFile);
    }
  });
  it('propagates a real Git root-inspection failure after draining the other probes', async () => {
    // * ARRANGE
    const root = await mkdtemp(path.join(os.tmpdir(), 'loop-test-'));
    roots.push(root);
    await writeFile(path.join(root, 'file.txt'), 'not a Git worktree');
    // * ACT / ASSERT
    await expect(captureWorkspace(root)).rejects.toThrow(/not a git repository/i);
  });
  it('hands off the completed physical after-capture without trusting later workspace changes', async () => {
    // * ARRANGE
    const root = await repo();
    const before = await captureWorkspace(root);
    await writeFile(path.join(root, 'src/a.test.js'), 'new test');
    // * ACT
    const evidence = await auditWorkspaceDetails(
      before,
      { reportedWrites: [path.join(root, 'src/a.test.js')] },
      policy
    );
    // * ASSERT
    expect(evidence.violations).toEqual([]);
    expect(evidence.after.files['src/a.test.js']).not.toBe(before.files['src/a.test.js']);
    await writeFile(path.join(root, 'src/a.js'), 'external write after audit');
    expect((await captureWorkspace(root)).digest).not.toBe(evidence.after.digest);
    expect(evidence.after.files['src/a.js']).toBe(before.files['src/a.js']);
  });
  it('does not lose files named like object prototype properties', async () => {
    // * ARRANGE
    const root = await repo();
    const before = await captureWorkspace(root);
    await writeFile(path.join(root, '__proto__'), 'unexpected write');
    // * ACT / ASSERT
    expect(await auditWorkspace(before, { reportedWrites: [] }, policy)).toContainEqual({
      code: 'undeclared',
      path: '__proto__',
    });
  });
  it('rejects a non-root working directory and failed HEAD inspection', async () => {
    // * ARRANGE
    const root = await repo();
    // * ACT / ASSERT
    await expect(captureWorkspace(path.join(root, 'src'))).rejects.toThrow(/exact worktree root/);
    const reference = execFileSync('git', ['-C', root, 'symbolic-ref', 'HEAD']).toString().trim();
    await writeFile(path.join(root, '.git', reference), 'not-a-hash\n');
    await expect(captureWorkspace(root)).rejects.toThrow();
  });
  it('rejects special files rather than reporting an incomplete inventory as empty', async () => {
    // * ARRANGE
    const root = await repo();
    await writeFile(path.join(root, 'device'), '');
    const actual = await vi.importActual('node:fs/promises');
    const childProcess = await vi.importActual('node:child_process');
    const active = new Map();
    const closures = [];
    vi.mocked(execFile).mockImplementation((...args) => {
      const child = childProcess.execFile(...args);
      active.set(child.pid, args[1]);
      closures.push(
        new Promise((resolve) =>
          child.once('close', () => {
            active.delete(child.pid);
            resolve();
          })
        )
      );
      return child;
    });
    vi.mocked(lstat).mockImplementation(async (file) =>
      file.endsWith(`${path.sep}device`)
        ? { isSymbolicLink: () => false, isDirectory: () => false, isFile: () => false }
        : actual.lstat(file)
    );
    // * ACT / ASSERT
    try {
      await expect(captureWorkspace(root)).rejects.toThrow(/special file/);
      expect([...active.values()], 'Git children still using the worktree after capture rejected').toEqual([]);
    } finally {
      // Drain real children even on RED so this diagnostic cannot race its own teardown.
      await Promise.all(closures);
      vi.mocked(execFile).mockImplementation(childProcess.execFile);
      vi.mocked(lstat).mockImplementation(actual.lstat);
    }
  });
  it('propagates an operational HEAD failure instead of treating it as an unborn branch', async () => {
    // * ARRANGE
    const root = await repo();
    const childProcess = await vi.importActual('node:child_process');
    const headFailed = Promise.withResolvers();
    const configFinished = Promise.withResolvers();
    const releaseConfig = Promise.withResolvers();
    vi.mocked(execFile).mockImplementation((command, args, options, callback) =>
      childProcess.execFile(
        command,
        args.includes('--verify') ? ['-C', path.join(root, 'missing'), ...args.slice(2)] : args,
        options,
        (...result) => {
          if (args.includes('--verify')) headFailed.resolve(result[0]);
          if (args.includes('config')) {
            configFinished.resolve();
            releaseConfig.promise.then(() => callback(...result));
          } else callback(...result);
        }
      )
    );
    let settled = false;
    const outcome = captureWorkspace(root).then(
      (value) => {
        settled = true;
        return { value };
      },
      (error) => {
        settled = true;
        return { error };
      }
    );
    // * ACT / ASSERT
    try {
      const error = await headFailed.promise;
      await configFinished.promise;
      await new Promise(setImmediate);
      expect(error).toMatchObject({ code: 128 });
      expect(settled, 'HEAD failure must wait for the config sibling before rejecting').toBe(false);
      releaseConfig.resolve();
      expect(await outcome).toEqual({ error });
    } finally {
      releaseConfig.resolve();
      await outcome;
      vi.mocked(execFile).mockImplementation(childProcess.execFile);
    }
  });
  it('rejects Git metadata changes and invalid telemetry names even with clean file bytes', async () => {
    // * ARRANGE
    const root = await repo();
    const before = await captureWorkspace(root);
    execFileSync('git', ['-C', root, 'config', '--local', 'loop.probe', 'changed']);
    // * ACT
    const violations = await auditWorkspace(before, { reportedWrites: [path.join(root, 'bad*.js')] }, policy);
    // * ASSERT
    expect(violations).toContainEqual({ code: 'git_metadata', path: '.git' });
    expect(violations).toContainEqual({ code: 'invalid_path', path: 'bad*.js' });
  });
  it('does not blame already dirty/staged baseline files but catches their later changes', async () => {
    // * ARRANGE
    const root = await repo();
    await writeFile(path.join(root, 'src/a.js'), 'dirty baseline');
    const before = await captureWorkspace(root);
    // * ACT
    const unchanged = await auditWorkspace(before, { reportedWrites: [] }, policy);
    await writeFile(path.join(root, 'src/a.js'), 'changed dirty');
    const changed = await auditWorkspace(before, { reportedWrites: [] }, policy);
    // * ASSERT
    expect(unchanged).toEqual([]);
    expect(changed).toContainEqual({ code: 'source_fence', path: 'src/a.js' });
  });
  it('unions Git-only, ignored, deleted, and telemetry-only paths', async () => {
    // * ARRANGE
    const root = await repo();
    const before = await captureWorkspace(root);
    await mkdir(path.join(root, 'ignored'));
    await writeFile(path.join(root, 'ignored/new.js'), 'ignored write');
    await writeFile(path.join(root, 'src/new.js'), 'untracked');
    await rm(path.join(root, 'src/a.js'));
    // * ACT
    const violations = await auditWorkspace(
      before,
      {
        reportedWrites: [path.join(root, 'reverted.js')],
      },
      policy
    );
    // * ASSERT
    expect(violations).toEqual(
      expect.arrayContaining([
        { code: 'undeclared', path: 'ignored/new.js' },
        { code: 'undeclared', path: 'src/new.js' },
        { code: 'undeclared', path: 'reverted.js' },
        { code: 'source_fence', path: 'src/a.js' },
      ])
    );
  });
  it('detects index-only changes even when worktree bytes are restored', async () => {
    // * ARRANGE
    const root = await repo();
    const before = await captureWorkspace(root);
    await writeFile(path.join(root, 'src/a.js'), 'staged mutation');
    execFileSync('git', ['-C', root, 'add', 'src/a.js']);
    await writeFile(path.join(root, 'src/a.js'), 'original');
    // * ACT / ASSERT
    expect(await auditWorkspace(before, { reportedWrites: [] }, policy)).toContainEqual({
      code: 'source_fence',
      path: 'src/a.js',
    });
  });
  it('captures both sides of a rename', async () => {
    // * ARRANGE
    const root = await repo();
    const treeId = execFileSync('git', ['-C', root, 'write-tree']).toString().trim();
    const commit = `tree ${treeId}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nFixture\n`;
    const oid = execFileSync('git', ['-C', root, 'hash-object', '-t', 'commit', '-w', '--stdin'], { input: commit })
      .toString()
      .trim();
    execFileSync('git', ['-C', root, 'update-ref', 'HEAD', oid]);
    const before = await captureWorkspace(root);
    execFileSync('git', ['-C', root, 'mv', 'src/a.test.js', 'src/renamed.js']);
    // * ACT
    const violations = await auditWorkspace(
      before,
      { reportedWrites: [] },
      { ...policy, leg: 'implement', declaredFiles: [...policy.declaredFiles, 'src/renamed.js'] }
    );
    // * ASSERT
    expect(violations).toContainEqual({ code: 'test_fence', path: 'src/a.test.js' });
  });
  it('rejects missing telemetry, relative telemetry, outside-worktree writes and unreadable worktrees', async () => {
    // * ARRANGE
    const root = await repo();
    const before = await captureWorkspace(root);
    // * ACT / ASSERT
    expect(await auditWorkspace(before, { reportedWrites: null }, policy)).toContainEqual({
      code: 'incomplete_evidence',
      path: null,
    });
    expect(await auditWorkspace(before, { reportedWrites: ['relative'] }, policy)).toContainEqual(
      expect.objectContaining({ code: 'invalid_path' })
    );
    expect(
      await auditWorkspace(before, { reportedWrites: [path.resolve(root, '..', 'outside')] }, policy)
    ).toContainEqual(expect.objectContaining({ code: 'outside_worktree' }));
    await rm(path.join(root, '.git'), { recursive: true, force: true });
    expect(await auditWorkspace(before, { reportedWrites: [] }, policy)).toContainEqual(
      expect.objectContaining({ code: 'incomplete_evidence' })
    );
  });
  it('rejects symlink/junction escape paths before dispatch and after telemetry reports a write', async () => {
    // * ARRANGE
    const root = await repo();
    const outside = await repo();
    await symlink(outside, path.join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    const before = await captureWorkspace(root);
    // * ACT / ASSERT
    await expect(
      prepareFence({
        worktree: root,
        leg: 'test',
        declaredFiles: ['escape/new.test.js'],
        testPathspecs: ['*.test.js'],
        protectedFiles: [],
      })
    ).rejects.toThrow(/symlink/i);
    expect(
      await auditWorkspace(before, { reportedWrites: [path.join(root, 'escape/new.test.js')] }, policy)
    ).toContainEqual(expect.objectContaining({ code: 'symlink_path' }));
  });
  it('builds exact future-file denials and preserves the caller index', async () => {
    // * ARRANGE
    const root = await repo();
    const index = await readFile(path.join(root, '.git/index'));
    // * ACT
    const fence = await prepareFence({
      worktree: root,
      leg: 'test',
      declaredFiles: ['src/future.js', 'src/future.test.js'],
      testPathspecs: ['*.test.js'],
      protectedFiles: ['vite.config.js'],
    });
    // * ASSERT
    const canonicalRoot = await realpath(root);
    expect(fence.deniedPaths).toEqual([
      path.join(canonicalRoot, 'src/future.js'),
      path.join(canonicalRoot, 'vite.config.js'),
    ]);
    expect(fence.policy.testFiles).toEqual(['src/future.test.js']);
    expect(await readFile(path.join(root, '.git/index'))).toEqual(index);
    const implement = await prepareFence({
      worktree: root,
      leg: 'implement',
      declaredFiles: ['src/future.js', 'src/future.test.js'],
      testPathspecs: ['*.test.js'],
      protectedFiles: [],
    });
    expect(implement.deniedPaths).toEqual([path.join(canonicalRoot, 'src/future.test.js')]);
  });
});
