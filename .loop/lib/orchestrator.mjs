import { createHash } from 'node:crypto';
import { extractCriteria } from './criteria.mjs';
import { groupPullRequests, validatePlan } from './plan.mjs';
import { validateFindings } from './review.mjs';
import { beginExecution, resolveLimits } from './termination.mjs';

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Prepare an attended run through Gate 1 only. All side effects use trusted ports.
 * @returns {Promise<{status:string, plan:object, prGroups:string[][], warnings:string[], usage:object[], approvalDigest:string}>}
 */
export async function prepareLoop(
  { issue, html, specPath, target, acceptanceKinds, targetConfig, reentryFeedback = '', maxPreparationExecutions },
  ports
) {
  if (!targetConfig?.exercised) throw new Error(`Target is not exercised: ${target}`);
  const limits = resolveLimits(targetConfig, { total: maxPreparationExecutions });
  if (
    !issue ||
    !Number.isSafeInteger(issue.number) ||
    issue.number <= 0 ||
    typeof issue.title !== 'string' ||
    typeof issue.body !== 'string' ||
    typeof issue.repository !== 'string'
  )
    throw new Error('Invalid prose issue');
  const outputPath = `.loop/plans/${issue.number}.plan.json`;
  const index = extractCriteria(html, specPath, { acceptanceKinds });
  await ports.writeArtifact(`.loop/criteria/${issue.number}.json`, index);
  const baseline = await ports.readContext();
  let feedback = reentryFeedback;
  let plan;
  let caveats = [];
  const usage = [];
  let preparation = { total: 0, cycles: {}, signatures: {} };
  while (true) {
    if (!plan) {
      const slot = beginExecution(preparation, limits);
      if (slot.decision === 'park')
        throw new Error(
          `Preparation agent budget exhausted: ${JSON.stringify({ executions: preparation.total, usage })}`
        );
      preparation = slot.state;
      const result = await ports.decompose({ issue, index, target, outputPath, feedback });
      caveats = (result.outcome.messages ?? [])
        .filter((message) => message.trim())
        .map((message) => `Decomposer: ${message}`);
      for (const counter of result.outcome.usage.counters) {
        const previous = usage.find(({ name, unit }) => name === counter.name && unit === counter.unit);
        if (previous) previous.value += counter.value;
        else usage.push({ ...counter });
      }

      if (result.outcome.status !== 'completed' || !Array.isArray(result.violations) || result.violations.length) {
        throw new Error(
          `Decomposition rejected: ${JSON.stringify({ outcome: result.outcome, violations: result.violations })}`
        );
      }
      plan = result.plan;
    }
    plan = validatePlan(plan, index, [target]);
    if (plan.issue !== issue.number) throw new Error('Plan issue does not match requested issue');
    await ports.writeArtifact(outputPath, plan);
    const context = await ports.readContext();
    if (
      digest(context) !== digest(baseline) ||
      context.html !== html ||
      digest(context.targetConfig) !== digest(targetConfig)
    ) {
      return { status: 'stale', plan, usage };
    }
    const prGroups = groupPullRequests(plan.tasks);
    const warnings = [
      ...caveats,
      ...plan.tasks
        .filter(({ files_modified }) => files_modified.length === 0)
        .map(({ id }) => `Task ${id} declares no files; overlap safety cannot be inferred.`),
    ];
    const approvalDigest = digest({ context, plan, acceptanceKinds, issue });
    const review = { plan, prGroups, warnings, usage: structuredClone(usage), approvalDigest };
    const reply = await ports.gate1(structuredClone(review));
    if (!['approve', 'revise', 'stop'].includes(reply?.decision)) throw new Error('Invalid Gate 1 decision');
    if (reply.decision === 'stop') return { ...review, status: 'stopped' };
    const current = await ports.readContext();
    if (
      digest(current) !== digest(context) ||
      current.html !== html ||
      digest(current.targetConfig) !== digest(targetConfig)
    ) {
      return { ...review, status: 'stale' };
    }
    if (reply.decision === 'revise') {
      feedback = reply.feedback;
      plan = null;
      continue;
    }
    const edited = await ports.readPlan();
    if (digest(edited) !== digest(plan)) {
      plan = edited;
      continue;
    }
    return { ...review, status: 'planned' };
  }
}

/** Surface drained decomposition faults to the human before a fresh, independently approved plan. */
export async function reenterGate1(
  { issue, html, specPath, target, acceptanceKinds, targetConfig, approved, wave },
  ports
) {
  if (approved?.status !== 'planned' || wave?.status !== 'gate1' || !Array.isArray(wave.tasks))
    throw new Error('Gate 1 re-entry requires an approved plan and a drained wave.');
  const index = extractCriteria(html, specPath, { acceptanceKinds });
  const plan = validatePlan(approved.plan, index, [target]);
  const context = await ports.readContext();
  if (
    context.html !== html ||
    digest(context.targetConfig) !== digest(targetConfig) ||
    digest({ context, plan, acceptanceKinds, issue }) !== approved.approvalDigest
  )
    throw new Error('Stale Gate 1 approval; cannot re-enter with changed inputs.');
  const findings = validateFindings(wave.findings);
  if (!findings.length || findings.some(({ fault_domain }) => fault_domain !== 'decompose'))
    throw new Error('Gate 1 re-entry requires decomposition findings.');
  const byId = new Map(plan.tasks.map((task) => [task.id, task]));
  const taskIds = wave.tasks.map(({ taskId }) => taskId);
  if (
    !wave.tasks.length ||
    new Set(taskIds).size !== taskIds.length ||
    wave.tasks.some(({ taskId, status }) => !byId.has(taskId) || !['ready', 'parked', 'gate1'].includes(status)) ||
    (!wave.tasks.some(({ status }) => status === 'gate1') &&
      (!wave.tasks.every(({ status }) => status === 'ready') ||
        findings.some(({ code }) => code !== 'ownership_conflict'))) ||
    findings.some(({ criteria }) => criteria.some((anchor) => !index.criteria.some((entry) => entry.anchor === anchor)))
  )
    throw new Error('Invalid Gate 1 wave or anchor evidence.');
  for (const task of wave.tasks.filter(({ status }) => status === 'gate1')) {
    const cited = validateFindings(task.findings, byId.get(task.taskId), index);
    if (!cited.length || cited.some(({ fault_domain }) => fault_domain !== 'decompose'))
      throw new Error('Invalid task decomposition findings.');
    if (cited.some((finding) => !findings.some((item) => digest(item) === digest(finding))))
      throw new Error('Missing task decomposition findings at the wave barrier.');
  }
  const affectedTaskIds = plan.tasks
    .filter((task) =>
      findings.some(
        ({ criteria, files }) =>
          criteria.some((anchor) => task.criteria.includes(anchor)) ||
          files.some((file) => task.files_modified.includes(file))
      )
    )
    .map(({ id }) => id);
  const response = await ports.gate1({
    plan,
    prGroups: groupPullRequests(plan.tasks),
    findings,
    affectedTaskIds,
    invalidatedApprovalDigest: approved.approvalDigest,
    diagnostics: wave.diagnostics ?? [],
  });
  if (response?.decision === 'stop') return { status: 'stopped', findings, affectedTaskIds };
  if (response?.decision !== 'revise') throw new Error('Gate 1 decomposition faults require human revision.');
  if (digest(await ports.readContext()) !== digest(context))
    throw new Error('Stale Gate 1 context after human revision.');
  const next = await prepareLoop(
    {
      issue,
      html,
      specPath,
      target,
      acceptanceKinds,
      targetConfig,
      reentryFeedback: `${findings.map(({ message }) => message).join('\n')}\n${response.feedback ?? ''}`,
    },
    ports
  );
  if (next.status === 'planned' && digest(next.plan) === digest(plan))
    throw new Error('Revised plan did not address Gate 1 findings.');
  return next;
}
