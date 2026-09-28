import { groupPullRequests, validRepository } from './plan.mjs';
import { judgeGreen, judgeRed, judgeSuite } from './results.mjs';

const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;

function requireReviewed(run, groups) {
  if (
    !run?.issue ||
    !Number.isSafeInteger(run.issue.number) ||
    run.issue.number !== run.plan?.issue ||
    !validRepository(run.issue.repository) ||
    !nonempty(run.issue.title) ||
    !nonempty(run.base) ||
    !run.hashes ||
    !['spec', 'target', 'plan'].every((key) => nonempty(run.hashes[key])) ||
    !Array.isArray(run.waves) ||
    !equal(
      groups.map(({ taskIds }) => taskIds),
      groupPullRequests(run.plan.tasks)
    ) ||
    !equal(
      run.waves.map(({ tasks }) => tasks?.map(({ taskId }) => taskId)),
      run.plan.waves
    )
  )
    throw new Error('Publication requires the approved issue, plan, hashes, waves, and PR groups.');
  for (const wave of run.waves) {
    if (
      wave.status !== 'ready' ||
      wave.integration?.verdict?.status !== 'GREEN' ||
      judgeSuite(wave.integration?.run).status !== 'GREEN'
    )
      throw new Error('Publication requires every wave barrier to be GREEN.');
    for (const outcome of wave.tasks) {
      const evidence = outcome.evidence;
      if (
        outcome.status !== 'ready' ||
        outcome.findings?.length !== 0 ||
        judgeRed(evidence?.red, evidence?.bindings).status !== 'RED' ||
        judgeGreen(evidence?.green, evidence?.bindings).status !== 'GREEN' ||
        !evidence.reviews?.length ||
        evidence.reviews.at(-1)?.route !== 'done' ||
        evidence.reviews.at(-1)?.findings?.length !== 0
      )
        throw new Error(`Task ${outcome.taskId} lacks reviewed RED/GREEN evidence.`);
    }
  }
}

function checkReceipt(receipt, group, published, repository) {
  const url = receipt?.url;
  const [owner, name] = repository.split('/');
  if (
    typeof url !== 'string' ||
    !new RegExp(
      `^https://github\\.com/${owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/pull/[1-9]\\d*$`
    ).test(url) ||
    receipt.headOid !== published.headOid ||
    receipt.base !== group.base
  )
    throw new Error('PR response does not match the published head, base, and repository.');
  return url;
}

function description(run, group) {
  const selected = new Set(group.taskIds);
  const tasks = run.plan.tasks.filter(({ id }) => selected.has(id));
  const anchors = [...new Set(tasks.flatMap(({ criteria }) => criteria))];
  const standards = [
    ...new Set(
      run.waves.flatMap(({ tasks: outcomes }) =>
        outcomes
          .filter(({ taskId }) => selected.has(taskId))
          .flatMap(({ evidence }) => evidence.reviewStandards?.references?.map(({ kind, id }) => `${kind}:${id}`) ?? [])
      )
    ),
  ];
  const waves = run.plan.waves
    .map((wave, index) => ({ wave: index + 1, tasks: wave.filter((id) => selected.has(id)) }))
    .filter(({ tasks: ids }) => ids.length)
    .map(({ wave, tasks: ids }) => `- Wave ${wave}: ${ids.join(', ')} — GREEN`);
  return [
    `Issue: ${run.issue.repository}#${run.issue.number}`,
    '',
    '## Tasks',
    ...tasks.map(({ id }) => `- Task ${id}: assertion RED, candidate GREEN, independent review complete`),
    '',
    '## Source anchors',
    ...anchors.map((anchor) => `- \`${anchor}\``),
    '',
    '## Integration',
    ...waves,
    '',
    '## Review standards',
    ...(standards.length ? standards.map((value) => `- \`${value}\``) : ['- None resolved']),
    '',
  ].join('\n');
}

/** One human publication gate; no commit, push, merge, or agent publication port. */
export async function publishReviewedRun({ run, groups }, ports) {
  requireReviewed(run, groups);
  if (!equal(await ports.readInputs(), run.hashes)) return { status: 'stale', pullRequests: [] };
  const prepared = [];
  for (const group of groups) {
    if (!Array.isArray(group.taskIds) || !nonempty(group.head) || group.base !== run.base)
      throw new Error('Invalid publication group.');
    const candidate = await ports.prepareGroup(group);
    if (candidate?.tree == null || judgeSuite(candidate.suite).status !== 'GREEN')
      throw new Error('Final full suite must be GREEN on every staged PR group.');
    if ((await ports.readStagedTree(candidate)) !== candidate.tree) return { status: 'stale', pullRequests: [] };
    prepared.push(candidate);
  }
  const evidence = { hashes: run.hashes, waves: run.waves, issue: run.issue };
  const reply = await ports.gate2({
    groups: prepared,
    treeDigests: prepared.map(({ tree }) => tree),
    evidence,
  });
  if (reply?.decision === 'stop') return { status: 'stopped', pullRequests: [] };
  if (reply?.decision !== 'publish') throw new Error('Gate 2 requires an explicit publish or stop decision.');
  if (!equal(await ports.readInputs(), run.hashes)) return { status: 'stale', pullRequests: [] };
  for (const group of prepared) {
    if ((await ports.readStagedTree(group)) !== group.tree) return { status: 'stale', pullRequests: [] };
  }
  const local = [];
  for (const group of prepared) {
    const commit = await ports.readCommittedTree(group);
    if (commit?.head !== group.head) return { status: 'stale', pullRequests: [] };
    if (commit.tree !== group.tree) return { status: 'awaiting-publication', pullRequests: [] };
    if (!nonempty(commit.headOid)) throw new Error('Committed branch lacks a commit identity.');
    local.push(commit);
  }
  const published = [];
  for (const [index, group] of prepared.entries()) {
    const branch = await ports.readPublishedTree(group);
    if (!branch) return { status: 'awaiting-publication', pullRequests: [] };
    if (branch.tree !== group.tree || branch.headOid !== local[index].headOid)
      return { status: 'stale', pullRequests: [] };
    published.push(branch);
  }
  const pullRequests = [];
  for (const [index, group] of prepared.entries()) {
    const branch = published[index];
    const existing = await ports.findPullRequest(group, branch);
    const receipt = existing ?? (await ports.openPullRequest(group, branch, { body: description(run, group) }));
    pullRequests.push(checkReceipt(receipt, group, branch, run.issue.repository));
  }
  return { status: 'pr-opened', pullRequests };
}
