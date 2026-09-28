import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { groupPullRequests, validateRelativePath } from './plan.mjs';

const execute = promisify(execFile);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = async (root, args) =>
  (
    await execute('git', ['-C', root, ...args], {
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    })
  ).stdout.trim();

export async function assertCleanPublicationBaseline(root) {
  if (await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']))
    throw new Error('Publication requires a clean baseline checkout before any agent execution.');
}

export function publicationGroups(plan, issue, base) {
  if (
    !Number.isSafeInteger(issue?.number) ||
    issue.number <= 0 ||
    typeof issue.title !== 'string' ||
    !issue.title.trim() ||
    !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(base)
  )
    throw new Error('Invalid issue or configured publication base.');
  const components = groupPullRequests(plan.tasks);
  const owner = new Map();
  for (const [index, ids] of components.entries()) {
    for (const task of plan.tasks.filter(({ id }) => ids.includes(id))) {
      for (const file of task.files_modified) {
        if (owner.has(file) && owner.get(file) !== index)
          throw new Error(`Independent PR groups overlap on ${file}; revise dependencies at Gate 1.`);
        owner.set(file, index);
      }
    }
  }
  return components.map((taskIds, index) => ({
    taskIds,
    head: `loop/${issue.number}-${index + 1}`,
    base,
    title: issue.title,
  }));
}

/** Local Git is only an identity and staging port; human commits and pushes at Gate 2. */
export function createLocalPublication({ root, specPath, issue, plan, waves, execution, gate2 }) {
  validateRelativePath(specPath);
  if (!Number.isSafeInteger(issue?.number) || issue.number <= 0) throw new Error('Invalid issue number.');
  const paths = {
    spec: specPath,
    target: '.loop/targets.json',
    plan: `.loop/plans/${issue.number}.plan.json`,
  };
  return {
    readInputs: async () =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(paths).map(async ([key, relative]) => [key, digest(await readFile(path.join(root, relative)))])
        )
      ),
    prepareGroup: async (group) => {
      const selected = new Set(group.taskIds);
      const byId = new Map(plan.tasks.map((task) => [task.id, task]));
      const tasks = waves
        .flatMap(({ tasks: outcomes }) => outcomes)
        .filter(({ taskId }) => selected.has(taskId))
        .map((outcome) => {
          const task = byId.get(outcome.taskId);
          if (!task || outcome.status !== 'ready' || !outcome.delta)
            throw new Error(`No reviewed delta for ${outcome.taskId}.`);
          return { task, delta: outcome.delta };
        });
      if (tasks.length !== selected.size) throw new Error('Group references an unknown task.');
      return { ...group, ...(await execution.stageGroup({ head: group.head, tasks })) };
    },
    readStagedTree: async ({ path: candidate }) => {
      if (
        (await git(candidate, ['diff', '--name-only'])) ||
        (await git(candidate, ['ls-files', '--others', '--exclude-standard']))
      )
        throw new Error('Reviewed PR worktree has unstaged or untracked files.');
      return git(candidate, ['write-tree']);
    },
    readCommittedTree: async ({ path: candidate }) => ({
      tree: await git(candidate, ['rev-parse', 'HEAD^{tree}']),
      headOid: await git(candidate, ['rev-parse', 'HEAD']),
      head: await git(candidate, ['branch', '--show-current']),
    }),
    gate2,
  };
}
