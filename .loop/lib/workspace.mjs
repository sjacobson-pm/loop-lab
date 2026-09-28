import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdtemp, readFile, readdir, readlink, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { auditWrites, classifyPaths } from './fences.mjs';
import { validateRelativePath } from './plan.mjs';

export const hash = (value) => createHash('sha256').update(value).digest('hex');

function git(root, args, input) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      ['-C', root, ...args],
      {
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      },
      (error, stdout) => (error ? reject(error) : resolve(stdout))
    );
    child.stdin.end(input);
  });
}

/** Evaluate real Git pathspecs in a throwaway repository; never touch the caller index. */
export async function matchPathspecs(paths, pathspecs) {
  if (paths.length === 0 || pathspecs.length === 0) return new Set();
  paths.forEach(validateRelativePath);
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'loop-pathspec-'));
  try {
    await git(temporary, ['init', '--quiet']);
    const blob = (await git(temporary, ['hash-object', '-w', '--stdin'], '')).trim();
    await git(
      temporary,
      ['update-index', '-z', '--index-info'],
      [...new Set(paths)].map((file) => `100644 ${blob}\t${file}\0`).join('')
    );
    const output = await git(temporary, ['-c', 'core.ignorecase=false', 'ls-files', '-z', '--', ...pathspecs]);
    return new Set(output.split('\0').filter(Boolean));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function containedPath(root, relative) {
  validateRelativePath(relative);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error(`Symlink path is not an independent file: ${relative}`);
    } catch (error) {
      if (error.code === 'ENOENT') return current;
      throw error;
    }
  }
  return current;
}

/** Resolve future declarations without treating a directory as a CLI write prefix. */
export async function prepareFence({ worktree, leg, declaredFiles, testPathspecs, protectedFiles }) {
  const root = await realpath(worktree);
  for (const file of [...declaredFiles, ...protectedFiles]) await containedPath(root, file);
  const matches = await matchPathspecs(declaredFiles, testPathspecs);
  const { test, source } = classifyPaths(declaredFiles, testPathspecs, (file) => matches.has(file));
  const forbidden = leg === 'test' ? source : leg === 'implement' ? test : [];
  const denied = [...new Set([...forbidden, ...protectedFiles])].filter(
    (file) => !(leg === 'decompose' && declaredFiles.length === 1 && file === declaredFiles[0])
  );
  return {
    deniedPaths: denied.map((file) => path.resolve(root, file)),
    policy: { leg, declaredFiles: [...declaredFiles], testFiles: test, protectedFiles: [...protectedFiles] },
  };
}

async function inventory(root, prefix = '', files = Object.create(null)) {
  const entries = await readdir(path.join(root, prefix), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!prefix && entry.name === '.git') continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(root, relative);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) files[relative] = `link:${await readlink(absolute)}`;
    else if (stat.isDirectory()) await inventory(root, relative, files);
    else if (stat.isFile()) files[relative] = `${stat.mode}:${hash(await readFile(absolute))}`;
    else throw new Error(`Cannot inventory special file: ${relative}`);
  }
  return files;
}

function indexEntries(output) {
  const entries = Object.create(null);
  for (const line of output.split('\0').filter(Boolean)) {
    const tab = line.indexOf('\t');
    const file = line.slice(tab + 1);
    entries[file] = `${entries[file] ?? ''}${line.slice(0, tab)};`;
  }
  return entries;
}

function statusEntries(output) {
  const fields = output.split('\0');
  const entries = Object.create(null);
  for (let offset = 0; offset < fields.length && fields[offset]; offset += 1) {
    const record = fields[offset];
    const status = record.slice(0, 2);
    entries[record.slice(3)] = status;
    if (/[RC]/.test(status)) entries[fields[++offset]] = status;
  }
  return entries;
}

/** Content/index/status snapshot includes ignored files and never follows links. */
export async function captureWorkspace(worktree) {
  const root = await realpath(worktree);
  const operations = await Promise.allSettled([
    git(root, ['rev-parse', '--show-toplevel']).then((top) => realpath(top.trim())),
    inventory(root),
    git(root, ['ls-files', '--stage', '-z']).then(indexEntries),
    git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).then(statusEntries),
    git(root, ['rev-parse', '--verify', '--quiet', 'HEAD']).catch(async (error) => {
      if (error.code === 1) {
        await git(root, ['show-ref', '--head']).catch((refError) => {
          if (refError.code !== 1) throw refError;
        });
        return 'unborn';
      }
      throw error;
    }),
    git(root, ['config', '--local', '--list']),
  ]);
  // Invalid roots and failed inventories must not release a worktree while sibling Git processes still use it.
  const [top, ...evidence] = operations;
  if (top.status === 'rejected') throw top.reason;
  if (top.value !== root) throw new Error('Audit requires the exact worktree root');
  const failure = evidence.find(({ status }) => status === 'rejected');
  if (failure) throw failure.reason;
  const [files, index, status, head, config] = evidence.map(({ value }) => value);
  const state = { root, inputRoot: path.resolve(worktree), files, index, status, head, config };
  return { ...state, digest: hash(JSON.stringify(state)) };
}

/** Preserve the exact audited after-capture for trusted consumers that freeze a delta. */
export async function auditWorkspaceDetails(before, outcome, policy) {
  const violations = [];
  if (!Array.isArray(outcome.reportedWrites)) violations.push({ code: 'incomplete_evidence', path: null });
  let after;
  try {
    after = await captureWorkspace(before.root);
  } catch (error) {
    return {
      after: null,
      violations: [...violations, { code: 'incomplete_evidence', path: null, message: error.message }],
    };
  }
  const paths = new Set();
  if (before.head !== after.head || before.config !== after.config)
    violations.push({ code: 'git_metadata', path: '.git' });
  for (const key of ['files', 'index', 'status']) {
    for (const file of new Set([...Object.keys(before[key]), ...Object.keys(after[key])])) {
      if (before[key][file] !== after[key][file]) paths.add(file);
    }
  }
  for (const absolute of outcome.reportedWrites ?? []) {
    if (typeof absolute !== 'string' || !path.isAbsolute(absolute)) {
      violations.push({ code: 'invalid_path', path: absolute });
      continue;
    }
    let relative = path.relative(before.root, absolute);
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      relative = path.relative(before.inputRoot, absolute);
    }
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
      violations.push({ code: 'outside_worktree', path: absolute });
      continue;
    }
    paths.add(relative.split(path.sep).join('/'));
  }
  for (const file of paths) {
    try {
      await containedPath(before.root, file);
    } catch (error) {
      violations.push({ code: error.message.startsWith('Symlink') ? 'symlink_path' : 'invalid_path', path: file });
    }
  }
  return {
    after,
    violations: [...violations, ...auditWrites({ ...policy, changes: [...paths].map((file) => ({ path: file })) })],
  };
}

/** Audit failures as well as successes. Null telemetry and unreadable Git are never empty evidence. */
export async function auditWorkspace(before, outcome, policy) {
  return (await auditWorkspaceDetails(before, outcome, policy)).violations;
}
