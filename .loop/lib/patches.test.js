// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { captureWorkspace } from './workspace.mjs';
import { capturePatch, applyPatch } from './patches.mjs';

const roots = [];
async function repository(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loop-patch-'));
  roots.push(root);
  execFileSync('git', ['init', '--quiet', root]);
  for (const [name, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), content);
  }
  return root;
}
afterEach(async () => {
  const cleanups = await Promise.allSettled(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  const failed = cleanups.find(({ status }) => status === 'rejected');
  if (failed) throw failed.reason;
});

describe('binary-safe working-tree patches', { timeout: 30_000 }, () => {
  it('rejects directories, duplicate paths, traversal and malformed patches', async () => {
    // * ARRANGE
    const root = await repository({ 'dir/a': 'old' });
    const snapshot = await captureWorkspace(root);
    // * ACT / ASSERT
    await expect(capturePatch(snapshot, snapshot, ['dir'])).rejects.toThrow(/regular file/);
    await expect(capturePatch(snapshot, snapshot, ['dir/a', 'dir/a'])).rejects.toThrow(/unique/);
    await expect(capturePatch(snapshot, snapshot, ['../outside'])).rejects.toThrow(/path/i);
    await expect(applyPatch(root, {})).rejects.toThrow(/Invalid binary patch/);
    await expect(
      applyPatch(root, { bytes: Buffer.alloc(0), changes: [{ path: 'missing', before: null, after: 'new' }] })
    ).rejects.toThrow(/Empty patch/);
    await expect(applyPatch(root, { bytes: Buffer.from('not a patch'), changes: [] })).rejects.toThrow();
  });
  it('cross-checks patch payload paths and resulting content instead of trusting metadata alone', async () => {
    // * ARRANGE
    const beforeRoot = await repository({ a: 'old', b: 'old' });
    const afterRoot = await repository({ a: 'new', b: 'new' });
    const patch = await capturePatch(await captureWorkspace(beforeRoot), await captureWorkspace(afterRoot), ['a', 'b']);
    const candidate = await repository({ a: 'old', b: 'old' });
    // * ACT / ASSERT
    await expect(applyPatch(candidate, { ...patch, changes: patch.changes.slice(0, 1) })).rejects.toThrow(
      /declared paths/
    );
    expect(await readFile(path.join(candidate, 'a'), 'utf8')).toBe('old');
    await expect(
      applyPatch(candidate, { ...patch, changes: patch.changes.map((change) => ({ ...change, after: 'incorrect' })) })
    ).rejects.toThrow(/audited content/);
  });
  it('preserves tracked executable modes and non-UTF8 text without content filters', async () => {
    // * ARRANGE
    const beforeRoot = await repository({ script: Buffer.from([128, 13, 10]) });
    const afterRoot = await repository({ script: Buffer.from([254, 13, 10]) });
    for (const root of [beforeRoot, afterRoot]) {
      execFileSync('git', ['-C', root, 'add', '--', 'script']);
      execFileSync('git', ['-C', root, 'update-index', '--chmod=+x', '--', 'script']);
    }
    const patch = await capturePatch(await captureWorkspace(beforeRoot), await captureWorkspace(afterRoot), ['script']);
    const candidate = await repository({ script: Buffer.from([128, 13, 10]) });
    // * ACT
    await applyPatch(candidate, patch);
    // * ASSERT
    expect(await readFile(path.join(candidate, 'script'))).toEqual(Buffer.from([254, 13, 10]));
    expect(patch.bytes.toString('latin1')).toContain('100755');
  });
  it('preserves exact bytes, additions, deletions and both rename endpoints without commits or index changes', async () => {
    // * ARRANGE
    const original = { 'src/a.js': 'old\r\n', 'src/deleted.js': 'deleted', 'old.bin': Buffer.from([0, 255, 1]) };
    const updated = {
      'src/a.js': 'new\r\n',
      'nested/new.bin': Buffer.from([0, 254, 128]),
      'renamed.bin': Buffer.from([0, 255, 1]),
    };
    const beforeRoot = await repository(original);
    const afterRoot = await repository(updated);
    const candidate = await repository(original);
    const before = await captureWorkspace(beforeRoot);
    const after = await captureWorkspace(afterRoot);
    // * ACT
    const patch = await capturePatch(before, after, [
      'src/a.js',
      'src/deleted.js',
      'old.bin',
      'nested/new.bin',
      'renamed.bin',
    ]);
    await applyPatch(candidate, patch);
    // * ASSERT
    expect(Buffer.isBuffer(patch.bytes)).toBe(true);
    expect(patch.changes.map(({ path }) => path)).toEqual([
      'src/a.js',
      'src/deleted.js',
      'old.bin',
      'nested/new.bin',
      'renamed.bin',
    ]);
    for (const [name, content] of Object.entries(updated))
      expect(await readFile(path.join(candidate, name))).toEqual(Buffer.from(content));
    await expect(readFile(path.join(candidate, 'src/deleted.js'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(candidate, 'old.bin'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await captureWorkspace(afterRoot)).index).toEqual(after.index);
    expect((await captureWorkspace(beforeRoot)).digest).toBe(before.digest);
    expect((await captureWorkspace(candidate)).head).toBe('unborn');
  });
  it('detects baseline drift before any file in a patch is applied', async () => {
    // * ARRANGE
    const beforeRoot = await repository({ a: 'old', b: 'old' });
    const afterRoot = await repository({ a: 'new', b: 'new' });
    const patch = await capturePatch(await captureWorkspace(beforeRoot), await captureWorkspace(afterRoot), ['a', 'b']);
    const candidate = await repository({ a: 'old', b: 'human change' });
    // * ACT / ASSERT
    await expect(applyPatch(candidate, patch)).rejects.toThrow(/baseline/i);
    expect(await readFile(path.join(candidate, 'a'), 'utf8')).toBe('old');
    expect(await readFile(path.join(candidate, 'b'), 'utf8')).toBe('human change');
  });
  it.each(['before', 'after'])('rejects a %s source that changed after its audited snapshot', async (side) => {
    // * ARRANGE
    const beforeRoot = await repository({ a: 'old' });
    const afterRoot = await repository({ a: 'new' });
    const before = await captureWorkspace(beforeRoot);
    const after = await captureWorkspace(afterRoot);
    await writeFile(path.join(side === 'before' ? beforeRoot : afterRoot, 'a'), 'changed after audit');
    // * ACT / ASSERT
    await expect(capturePatch(before, after, ['a'])).rejects.toThrow(/snapshot/i);
  });
  it('accepts an empty change set without invoking git apply on an empty patch', async () => {
    // * ARRANGE
    const root = await repository({ a: 'same' });
    const snapshot = await captureWorkspace(root);
    // * ACT
    const patch = await capturePatch(snapshot, snapshot, ['a']);
    await applyPatch(root, patch);
    // * ASSERT
    expect(patch.changes).toEqual([]);
    expect(patch.bytes.length).toBe(0);
    expect((await captureWorkspace(root)).digest).toBe(snapshot.digest);
  });
});
