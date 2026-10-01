import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { createLegWorktree } from './attended.mjs';
import { runAgent } from './host.mjs';
import { collapseTaskDenyPaths, protectedTaskPath } from './lib/fences.mjs';
import { capturePatch, applyPatch } from './lib/patches.mjs';
import { validateRelativePath } from './lib/plan.mjs';
import { judgeSuite } from './lib/results.mjs';
import { resolveStandards, reviewTask } from './lib/review.mjs';
import { runTarget } from './lib/runner.mjs';
import { runTask } from './lib/task.mjs';
import { resolveLimits } from './lib/termination.mjs';
import { runWave } from './lib/wave-runner.mjs';
import { auditWorkspaceDetails, captureWorkspace, prepareFence } from './lib/workspace.mjs';

const contextPath = '.loop/task-context.json';
const execute = promisify(execFile);
const git = async (root, args) =>
  (
    await execute('git', ['-C', root, ...args], {
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    })
  ).stdout.trim();
function unchangedInputs(before, after) {
  if (before.head !== after.head || before.config !== after.config) return false;
  const visible = new Set([
    ...Object.keys(before.index),
    ...Object.keys(before.status),
    ...Object.keys(after.index),
    ...Object.keys(after.status),
  ]);
  return [...visible].every(
    (file) =>
      before.files[file] === after.files[file] &&
      before.index[file] === after.index[file] &&
      before.status[file] === after.status[file]
  );
}

function unchangedWorkspace(before, after, except = []) {
  if (before.head !== after.head || before.config !== after.config) return false;
  const excluded = new Set(except);
  return ['files', 'index', 'status'].every((key) =>
    [...new Set([...Object.keys(before[key]), ...Object.keys(after[key])])].every(
      (file) => excluded.has(file) || before[key][file] === after[key][file]
    )
  );
}

/** Explicit post-approval execution API; importing it does not extend the attended CLI's Gate 1 lifecycle. */
export async function createExecution({
  root,
  target,
  index,
  agent = runAgent,
  runner = runTarget,
  profiles = {},
  availableStandards = { organization: [], local: [], guidelines: [] },
  signal,
}) {
  resolveLimits(target);
  const snapshots = new Map();
  const trees = new Set();
  const active = new Set();
  let closed = false;
  let closing = false;
  const acquire = async (source) => {
    const tree = await createLegWorktree(source);
    trees.add(tree);
    return tree;
  };
  const release = async (tree) => {
    trees.delete(tree);
    await tree.dispose();
  };
  const scoped = async (source, operation) => {
    const tree = await acquire(source);
    let failure;
    let failed = false;
    let value;
    try {
      value = await operation(tree);
    } catch (error) {
      failure = error;
      failed = true;
    }
    try {
      await release(tree);
    } catch (error) {
      throw new AggregateError(failed ? [failure, error] : [error], `Cannot dispose ${tree.path}: ${error.message}`);
    }
    if (failed) throw failure;
    return value;
  };
  const checked = async (tree, phase) => {
    const before = await captureWorkspace(tree.path);
    const result = await runner({ target, cwd: tree.path, phase, signal });
    const after = await captureWorkspace(tree.path);
    if (!unchangedInputs(before, after)) throw new Error(`Trusted runner mutated Git-visible inputs during ${phase}.`);
    return { report: result, after };
  };
  const installBaseline = async (tree) => {
    const { report, after } = await checked(tree, 'baseline');
    const verdict = judgeSuite(report);
    if (verdict.status !== 'GREEN') throw new Error(`Replay baseline is not GREEN: ${verdict.reasons.join(' ')}`);
    return { report, after };
  };
  const remember = async (tree, snapshot) => {
    const id = randomUUID();
    snapshots.set(id, { tree, snapshot: snapshot ?? (await captureWorkspace(tree.path)) });
    return id;
  };
  const get = async (id) => {
    if (closed) throw new Error('Execution is closed.');
    const record = snapshots.get(id);
    if (!record) throw new Error('Unknown baseline snapshot.');
    if ((await captureWorkspace(record.tree.path)).digest !== record.snapshot.digest)
      throw new Error('Frozen baseline changed.');
    return record;
  };
  const initialTree = await acquire(root);
  let initial;
  try {
    initial = await remember(initialTree);
  } catch (error) {
    await release(initialTree);
    throw error;
  }
  const executeTask = async (task, baseline, maxRepairs) => {
    const base = await get(baseline);
    return scoped(base.tree.path, async (tree) => {
      let lastSnapshot;
      let lastAudit;
      let frozenTests;
      let sourcePatch;
      let testFiles;
      const tokens = new Map();
      const authorize = async (leg, input) => {
        await mkdir(path.join(tree.path, '.loop'), { recursive: true });
        await writeFile(
          path.join(tree.path, contextPath),
          JSON.stringify({
            task,
            index,
            feedback: input.feedback,
            ...(leg === 'implement' ? { bindings: input.evidence.bindings, red: input.evidence.red } : {}),
          })
        );
        const before = await captureWorkspace(tree.path);
        if (lastSnapshot && !unchangedWorkspace(lastSnapshot, before, [contextPath]))
          throw new Error('Author worktree changed after its last audited leg.');
        const protectedFiles = [
          ...new Set([
            contextPath,
            index.spec_path,
            ...Object.keys(before.files).filter((file) => protectedTaskPath(file, task.files_modified)),
          ]),
        ];
        const fence = await prepareFence({
          worktree: tree.path,
          leg,
          declaredFiles: task.files_modified,
          testPathspecs: target.test_pathspecs,
          protectedFiles,
        });
        testFiles = fence.policy.testFiles;
        const permitted = task.files_modified.filter((file) =>
          leg === 'test' ? testFiles.includes(file) : !testFiles.includes(file)
        );
        for (const file of permitted) await mkdir(path.dirname(path.join(tree.path, file)), { recursive: true });
        const template = await readFile(new URL(`./prompts/${leg}.md`, import.meta.url), 'utf8');
        let prompt = `${template}\n\nRead harness input from ${contextPath}.`;
        if (leg === 'test') {
          prompt += `\n\nDeclared test files to write:\n${permitted.join('\n')}`;
          if (typeof input.feedback === 'string' && input.feedback.trim())
            prompt += `\n\nRepair feedback from the previous attempt:\n${input.feedback}`;
        }
        let outcome;
        try {
          outcome = await agent({
            worktree: tree.path,
            leg,
            prompt,
            deniedPaths: [
              ...collapseTaskDenyPaths({
                root: tree.path,
                protectedFiles,
                deniedPaths: fence.deniedPaths,
                declaredFiles: task.files_modified,
                contextPath,
                specPath: index.spec_path,
              }),
              path.join(tree.path, '.git'),
            ],
            profile: profiles[leg] ?? {},
            signal,
          });
        } catch (error) {
          outcome = {
            status: 'failed',
            reportedWrites: null,
            messages: [],
            diagnostics: [{ code: 'transport', message: error.message }],
          };
        }
        const audit = await auditWorkspaceDetails(before, outcome, fence.policy);
        lastAudit = audit.violations;
        lastSnapshot = audit.after;
        if (leg === 'implement' && outcome.status === 'completed' && lastAudit.length === 0) {
          sourcePatch = await capturePatch(
            base.snapshot,
            lastSnapshot,
            task.files_modified.filter((file) => !fence.policy.testFiles.includes(file))
          );
        }
        let bindings;
        let bindingError;
        if (leg === 'test' && outcome.status === 'completed' && lastAudit.length === 0) {
          try {
            bindings = JSON.parse(outcome.messages.at(-1));
          } catch (error) {
            bindingError = `Test author returned invalid binding JSON: ${error.message}`;
          }
        }
        const changedTestFiles =
          leg === 'test' && audit.after
            ? testFiles.filter(
                (file) => Object.hasOwn(audit.after.files, file) && before.files[file] !== audit.after.files[file]
              )
            : undefined;
        return { outcome, bindings, bindingError, testFiles, changedTestFiles };
      };
      const replay = async (phase, token) => {
        const testPatch = tokens.get(token);
        if (!testPatch) throw new Error('Unknown immutable test snapshot.');
        await get(baseline);
        return scoped(base.tree.path, async (replayTree) => {
          await installBaseline(replayTree);
          await applyPatch(replayTree.path, testPatch);
          if (phase === 'green') await applyPatch(replayTree.path, sourcePatch);
          return (await checked(replayTree, phase)).report;
        });
      };
      const review = async ({ evidence, delta, feedback, reportUsage }) =>
        scoped(base.tree.path, async (reviewTree) => {
          await applyPatch(reviewTree.path, delta);
          const configured = target.review_standards;
          if (!configured || !Array.isArray(configured.repository))
            throw new Error('Missing review standards configuration.');
          const repository = [];
          for (const file of configured.repository) {
            validateRelativePath(file);
            const absolute = path.join(reviewTree.path, file);
            try {
              if ((await lstat(absolute)).isFile()) repository.push(file);
            } catch (error) {
              if (error.code !== 'ENOENT') throw error;
            }
          }
          const standards = resolveStandards({
            stack: target.stack,
            configured,
            available: { ...availableStandards, repository },
          });
          evidence.reviewStandards = standards;
          if (standards.missingRequired.length)
            throw new Error(`Missing required review standards: ${standards.missingRequired.join(', ')}`);
          await mkdir(path.join(reviewTree.path, '.loop'), { recursive: true });
          await writeFile(
            path.join(reviewTree.path, contextPath),
            JSON.stringify({ task, index, evidence, standards, delta: { changes: delta.changes } })
          );
          const before = await captureWorkspace(reviewTree.path);
          const template = await readFile(new URL('./prompts/review.md', import.meta.url), 'utf8');
          let outcome;
          try {
            outcome = await agent({
              worktree: reviewTree.path,
              leg: 'review',
              prompt: `${template}\n\nRead harness input from ${contextPath}.${feedback ? `\n\nReview retry feedback: ${feedback}` : ''}`,
              deniedPaths: [path.join(reviewTree.path, '.git')],
              profile: profiles.review ?? {},
              signal,
            });
          } catch (error) {
            outcome = {
              status: 'failed',
              reportedWrites: null,
              toolRequests: [],
              messages: [],
              diagnostics: [{ code: 'transport', message: error.message }],
            };
          }
          reportUsage(outcome.usage);
          const { violations } = await auditWorkspaceDetails(before, outcome, {
            leg: 'review',
            declaredFiles: [],
            testFiles: [],
            protectedFiles: [contextPath, index.spec_path],
          });
          return reviewTask(
            { task, index, evidence, delta, standards, worktree: reviewTree.path },
            { review: async () => ({ outcome, violations }) }
          );
        });
      return runTask(
        { task, target, baseline, index, maxRepairs },
        {
          baseline: async () => (await checked(tree, 'baseline')).report,
          test: (input) => authorize('test', input),
          implement: (input) => authorize('implement', input),
          audit: async () => lastAudit,
          freezeTests: async () => {
            if (!unchangedWorkspace(lastSnapshot, await captureWorkspace(tree.path)))
              throw new Error('Author worktree changed after its last audited leg.');
            frozenTests = randomUUID();
            tokens.set(frozenTests, await capturePatch(base.snapshot, lastSnapshot, testFiles));
            return frozenTests;
          },
          red: ({ tests }) => replay('red', tests),
          green: ({ tests }) => replay('green', tests),
          delta: async ({ tests }) => {
            if (tests !== frozenTests) throw new Error('Test snapshot changed during implementation.');
            await get(baseline);
            if (!unchangedWorkspace(lastSnapshot, await captureWorkspace(tree.path)))
              throw new Error('Author worktree changed after its last audited leg.');
            return capturePatch(base.snapshot, lastSnapshot, task.files_modified);
          },
          review,
        }
      );
    });
  };
  const managed = async (operation) => {
    if (closed || closing) throw new Error('Execution is closed.');
    const pending = Promise.withResolvers();
    active.add(pending.promise);
    try {
      return await operation();
    } finally {
      active.delete(pending.promise);
      pending.resolve();
    }
  };
  return {
    baseline: initial,
    pathFor: async (id) => (await get(id)).tree.path,
    runTask: (task, { baseline = initial, maxRepairs } = {}) => managed(() => executeTask(task, baseline, maxRepairs)),
    runWave: (tasks, { baseline = initial, maxRepairs } = {}) =>
      managed(() =>
        runWave(
          { tasks, target, baseline },
          {
            runTask: ({ task }) => executeTask(task, baseline, maxRepairs),
            createCandidate: async (id) => {
              const record = await get(id);
              const tree = await acquire(record.tree.path);
              try {
                const { after } = await installBaseline(tree);
                return await remember(tree, after);
              } catch (error) {
                await release(tree);
                throw error;
              }
            },
            apply: async (id, patch) => {
              const record = await get(id);
              await applyPatch(record.tree.path, patch);
              record.snapshot = await captureWorkspace(record.tree.path);
            },
            fullSuite: async (id) => {
              const record = await get(id);
              const { report, after } = await checked(record.tree, 'integration');
              record.snapshot = after;
              return report;
            },
            acceptCandidate: async (id, original) => {
              await get(original);
              await get(id);
              return id;
            },
            discardCandidate: async (id) => {
              const record = snapshots.get(id);
              snapshots.delete(id);
              await release(record.tree);
            },
          }
        )
      ),
    stageGroup: (group) =>
      managed(async () => {
        if (
          !/^loop\/[1-9]\d*-[A-Za-z0-9-]+$/.test(group?.head) ||
          !Array.isArray(group.tasks) ||
          !group.tasks.length ||
          new Set(group.tasks.map(({ task }) => task?.id)).size !== group.tasks.length ||
          group.tasks.some(
            ({ task, delta }) =>
              !Array.isArray(task?.files_modified) ||
              !Buffer.isBuffer(delta?.bytes) ||
              !Array.isArray(delta?.changes) ||
              delta.changes.some((change) => !change || !task.files_modified.includes(change.path))
          )
        )
          throw new Error('Invalid reviewed PR group deltas.');
        if (!group.tasks.some(({ delta }) => delta.changes.length))
          throw new Error('A reviewed PR group has no audited changes to publish.');
        const base = await get(initial);
        const tree = await acquire(base.tree.path);
        try {
          await installBaseline(tree);
          const issue = group.head.match(/^loop\/([1-9]\d*)-/)[1];
          const generated = [`.loop/criteria/${issue}.json`, `.loop/plans/${issue}.plan.json`];
          const tracked = new Set((await git(tree.path, ['ls-files', '-z', '--', ...generated])).split('\0'));
          for (const file of generated) {
            if (tracked.has(file)) await git(tree.path, ['restore', '--worktree', '--', file]);
            else await rm(path.join(tree.path, file), { force: true });
          }
          for (const { delta } of group.tasks) await applyPatch(tree.path, delta);
          const { report } = await checked(tree, 'integration');
          const verdict = judgeSuite(report);
          if (verdict.status !== 'GREEN') throw new Error(`Final group suite failed: ${verdict.reasons.join(' ')}`);
          await git(tree.path, ['switch', '-c', group.head]);
          const files = [...new Set(group.tasks.flatMap(({ delta }) => delta.changes.map(({ path: file }) => file)))];
          if (files.length) await git(tree.path, ['add', '-A', '--', ...files]);
          const oid = await git(tree.path, ['write-tree']);
          return { head: group.head, path: tree.path, tree: oid, suite: report };
        } catch (error) {
          try {
            await release(tree);
          } catch (cleanup) {
            throw new AggregateError([error, cleanup], 'Group staging and Git cleanup both failed.');
          }
          throw error;
        }
      }),
    dispose: async () => {
      closing = true;
      await Promise.allSettled([...active]);
      closed = true;
      const results = await Promise.allSettled([...trees].map(release));
      snapshots.clear();
      const failures = results.filter(({ status }) => status === 'rejected').map(({ reason }) => reason);
      if (failures.length) throw new AggregateError(failures, 'Execution workspace cleanup failed.');
    },
  };
}
