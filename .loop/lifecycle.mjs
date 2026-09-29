import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareAttended } from './attended.mjs';
import { createExecution } from './execution.mjs';
import { createGitHubPublication } from './lib/github-publication.mjs';
import { validRepository, validateRelativePath } from './lib/plan.mjs';
import { publishReviewedRun } from './lib/publication.mjs';
import { assertCleanPublicationBaseline, createLocalPublication, publicationGroups } from './lib/publication-local.mjs';

async function loadApproved({ root, issue, target }) {
  const [index, plan, targets] = await Promise.all([
    readFile(path.join(root, `.loop/criteria/${issue.number}.json`), 'utf8').then(JSON.parse),
    readFile(path.join(root, `.loop/plans/${issue.number}.plan.json`), 'utf8').then(JSON.parse),
    readFile(path.join(root, '.loop/targets.json'), 'utf8').then(JSON.parse),
  ]);
  return { index, plan, targetConfig: targets.targets[target] };
}

/** Continue one approved, attended run without granting agents publication authority. */
async function continueApproved(input, approved, dependencies) {
  const {
    executionFactory = createExecution,
    publisher = publishReviewedRun,
    localFactory = createLocalPublication,
    githubFactory = createGitHubPublication,
    loadApproved: load = loadApproved,
  } = dependencies;
  const { plan, index, targetConfig } = await load(input);
  if (JSON.stringify(plan) !== JSON.stringify(approved.plan))
    throw new Error('The approved plan changed before execution.');
  if (plan.issue !== input.issue.number || plan.target !== input.target || index.spec_path !== input.specPath)
    throw new Error('Approved plan, criteria, and invocation do not agree.');
  const groups = publicationGroups(plan, input.issue, targetConfig.publication_base);
  const execution = await executionFactory({
    root: input.root,
    target: targetConfig,
    index,
    signal: input.signal,
    profiles: input.profiles,
    ...(input.agent ? { agent: input.agent } : {}),
    ...(input.runner ? { runner: input.runner } : {}),
  });
  try {
    const waves = [];
    const local = localFactory({
      root: input.root,
      specPath: input.specPath,
      issue: input.issue,
      plan,
      waves,
      execution,
      gate2: input.gate2,
    });
    if (JSON.stringify(await local.readInputs()) !== JSON.stringify(approved.hashes))
      return { status: 'stale', pullRequests: [] };
    let baseline = execution.baseline;
    for (const ids of plan.waves) {
      const tasks = ids.map((id) => {
        const task = plan.tasks.find((entry) => entry.id === id);
        if (!task) throw new Error(`Unknown task in approved wave: ${id}`);
        return task;
      });
      const wave = await execution.runWave(tasks, { baseline });
      waves.push(wave);
      const totals = wave.tasks?.map(({ evidence }) => evidence?.termination?.total);
      const agentExecutions =
        totals?.length && totals.every((total) => Number.isSafeInteger(total) && total >= 0)
          ? totals.reduce((sum, total) => sum + total, 0)
          : null;
      await input.reportWave?.({ index: waves.length, status: wave.status, usage: wave.usage, agentExecutions });
      if (wave.status !== 'ready') return { status: wave.status, wave, pullRequests: [] };
      baseline = wave.baseline;
    }
    const run = {
      issue: input.issue,
      plan,
      hashes: approved.hashes,
      base: targetConfig.publication_base,
      waves,
    };
    return await publisher({ run, groups }, { ...local, ...githubFactory(input.issue.repository) });
  } finally {
    await execution.dispose();
  }
}

export async function runAttended(input, dependencies = {}) {
  const prepare = dependencies.prepare ?? prepareAttended;
  validateRelativePath(input.specPath);
  if (!validRepository(input.issue?.repository)) throw new Error('Invalid issue repository.');
  await (dependencies.checkBaseline ?? assertCleanPublicationBaseline)(input.root);
  let approved = await prepare(input);
  while (approved.status === 'planned') {
    const result = await continueApproved(input, approved, dependencies);
    if (result.status !== 'gate1') return result;
    if (typeof approved.reenter !== 'function') throw new Error('Gate 1 re-entry is unavailable.');
    approved = await approved.reenter(result.wave);
  }
  return approved;
}
