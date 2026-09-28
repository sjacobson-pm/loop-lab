import { execFile } from 'node:child_process';
import { lstat, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { hash, prepareFence } from './workspace.mjs';
import { validateRelativePath } from './plan.mjs';

function git(root, args, input, index) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      ['-C', root, '-c', 'core.fsmonitor=false', ...args],
      {
        encoding: 'buffer',
        windowsHide: true,
        timeout: 60_000,
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', ...(index ? { GIT_INDEX_FILE: index } : {}) },
      },
      (error, stdout) => (error ? reject(error) : resolve(stdout))
    );
    child.stdin.end(input);
  });
}

async function version(root, file) {
  try {
    const absolute = path.join(root, file);
    const stat = await lstat(absolute);
    if (!stat.isFile()) throw new Error(`Patch path is not a regular file: ${file}`);
    const bytes = await readFile(absolute);
    return { bytes, mode: stat.mode, fingerprint: `${stat.mode}:${hash(bytes)}` };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function checkPaths(root, files) {
  if (!Array.isArray(files) || new Set(files).size !== files.length)
    throw new Error('Patch paths must be a unique array.');
  files.forEach(validateRelativePath);
  await prepareFence({ worktree: root, leg: 'review', declaredFiles: files, testPathspecs: [], protectedFiles: [] });
}

/** Capture only audited paths through raw Git blobs and private indexes; never create a commit. */
export async function capturePatch(before, after, files) {
  await checkPaths(before.root, files);
  await checkPaths(after.root, files);
  const changes = [];
  const versions = { before: [], after: [] };
  for (const file of files) {
    const old = await version(before.root, file);
    const next = await version(after.root, file);
    if (
      (old?.fingerprint ?? null) !== (before.files[file] ?? null) ||
      (next?.fingerprint ?? null) !== (after.files[file] ?? null)
    )
      throw new Error(`Audited snapshot changed while capturing patch: ${file}`);
    if (old?.fingerprint === next?.fingerprint) continue;
    changes.push({ path: file, before: old?.fingerprint ?? null, after: next?.fingerprint ?? null });
    versions.before.push({ file, value: old });
    versions.after.push({ file, value: next });
  }
  if (!changes.length) return { changes, bytes: Buffer.alloc(0) };
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'loop-index-'));
  try {
    const trees = [];
    for (const side of ['before', 'after']) {
      const index = path.join(temporary, `${side}.index`);
      await git(after.root, ['read-tree', '--empty'], undefined, index);
      const entries = [];
      for (const { file, value } of versions[side]) {
        if (!value) continue;
        const blob = (await git(after.root, ['hash-object', '-w', '--no-filters', '--stdin'], value.bytes))
          .toString()
          .trim();
        const snapshot = side === 'before' ? before : after;
        const mode = value.mode & 0o111 || snapshot.index[file]?.startsWith('100755 ') ? '100755' : '100644';
        entries.push(`${mode} ${blob}\t${file}\0`);
      }
      await git(after.root, ['update-index', '-z', '--index-info'], Buffer.from(entries.join('')), index);
      trees.push((await git(after.root, ['write-tree'], undefined, index)).toString().trim());
    }
    const bytes = await git(after.root, [
      'diff',
      '--binary',
      '--no-ext-diff',
      '--no-textconv',
      '--no-renames',
      ...trees,
      '--',
    ]);
    return { changes, bytes };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

/** Apply only to a disposable integration candidate; the caller owns publication of the verified result. */
export async function applyPatch(root, patch) {
  if (!Buffer.isBuffer(patch?.bytes) || !Array.isArray(patch.changes)) throw new Error('Invalid binary patch.');
  const files = patch.changes.map((change) => change.path);
  await checkPaths(root, files);
  for (const change of patch.changes) {
    if ((await version(root, change.path))?.fingerprint !== (change.before ?? undefined))
      throw new Error(`Patch baseline mismatch: ${change.path}`);
  }
  if (!patch.bytes.length) {
    if (files.length) throw new Error('Empty patch has declared changes.');
    return;
  }
  const records = (await git(root, ['apply', '--numstat', '-z', '--binary'], patch.bytes))
    .toString()
    .split('\0')
    .filter(Boolean);
  const actual = records.map((record) => record.split('\t').slice(2).join('\t'));
  if (
    actual.length !== files.length ||
    new Set(actual).size !== actual.length ||
    actual.some((file) => !files.includes(file))
  )
    throw new Error('Patch bytes do not match their declared paths.');
  await git(root, ['apply', '--check', '--binary', '--whitespace=nowarn'], patch.bytes);
  await git(root, ['apply', '--binary', '--whitespace=nowarn'], patch.bytes);
  for (const change of patch.changes) {
    if ((await version(root, change.path))?.fingerprint !== (change.after ?? undefined))
      throw new Error(`Applied patch does not match audited content: ${change.path}`);
  }
}
