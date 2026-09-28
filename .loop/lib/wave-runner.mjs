import { judgeSuite } from './results.mjs';
import { validateFindings } from './review.mjs';
import { mergeUsage } from './termination.mjs';

/** A candidate remains disposable until every sibling and the integration suite have completed. */
export async function runWave({ tasks, target, baseline }, ports) {
  if (!tasks.length) throw new Error('A wave must be nonempty.');
  const diagnostics = [];
  const settled = await Promise.allSettled(
    tasks.map((task) => Promise.resolve().then(() => ports.runTask({ task, target, baseline })))
  );
  const outcomes = settled.map((result, index) => {
    const task = tasks[index];
    if (
      result.status === 'fulfilled' &&
      result.value?.taskId === task.id &&
      ['ready', 'parked', 'gate1'].includes(result.value.status) &&
      (result.value.status !== 'ready' ||
        (Buffer.isBuffer(result.value.delta?.bytes) &&
          Array.isArray(result.value.delta.changes) &&
          result.value.delta.changes.every((change) => change && typeof change.path === 'string')))
    ) {
      if (result.value.status === 'gate1') {
        try {
          const findings = validateFindings(result.value.findings, task, {
            criteria: task.criteria.map((anchor) => ({ anchor })),
          });
          if (!findings.length || findings.some(({ fault_domain }) => fault_domain !== 'decompose'))
            throw new Error('Gate 1 requires decomposition findings.');
          return { ...result.value, findings };
        } catch (error) {
          diagnostics.push({ phase: 'task', taskId: task.id, message: error.message });
          return { taskId: task.id, status: 'parked', delta: null };
        }
      }
      return result.value;
    }
    diagnostics.push({
      phase: 'task',
      taskId: task.id,
      message: result.status === 'rejected' ? String(result.reason?.message ?? result.reason) : 'Invalid task outcome.',
    });
    return { taskId: task.id, status: 'parked', delta: null };
  });
  const usage = outcomes.reduce((aggregate, outcome) => mergeUsage(aggregate, outcome.evidence?.usage), {
    counters: [],
    apiDurationMs: 0,
    durationMs: 0,
    complete: true,
    missingExecutions: 0,
  });
  const result = { status: 'parked', baseline, tasks: outcomes, findings: [], diagnostics, integration: null, usage };
  for (const outcome of outcomes.filter(({ status }) => status === 'parked')) {
    for (const entry of outcome.evidence?.diagnostics ?? []) {
      diagnostics.push({ phase: entry.phase, taskId: outcome.taskId, message: entry.message });
    }
  }
  if (outcomes.some(({ status }) => status !== 'ready')) {
    if (outcomes.some(({ status }) => status === 'gate1')) {
      result.status = 'gate1';
      result.findings.push(...outcomes.flatMap(({ status, findings }) => (status === 'gate1' ? findings : [])));
    }
    return result;
  }
  const owned = new Set();
  for (const [index, outcome] of outcomes.entries()) {
    for (const { path } of outcome.delta.changes) {
      if (owned.has(path) || !tasks[index].files_modified.includes(path)) {
        result.status = 'gate1';
        result.findings.push({
          code: 'ownership_conflict',
          fault_domain: 'decompose',
          criteria: [...new Set(tasks.flatMap((task) => task.criteria))],
          files: [path],
          message: `Conflicting or undeclared wave delta: ${path}`,
        });
      }
      owned.add(path);
    }
  }
  if (result.status === 'gate1') return result;
  let candidate;
  let accepted = false;
  try {
    candidate = await ports.createCandidate(baseline);
    if (!candidate) throw new Error('Missing integration candidate.');
    for (const outcome of outcomes) await ports.apply(candidate, outcome.delta);
    const run = await ports.fullSuite(candidate, target);
    const verdict = judgeSuite(run);
    result.integration = { run, verdict };
    if (verdict.status !== 'GREEN') {
      diagnostics.push({ phase: 'integration', message: verdict.reasons.join(' ') });
    } else {
      const nextBaseline = await ports.acceptCandidate(candidate, baseline);
      if (!nextBaseline) throw new Error('Missing accepted baseline receipt.');
      result.baseline = nextBaseline;
      result.status = 'ready';
      accepted = true;
    }
  } catch (error) {
    diagnostics.push({ phase: 'integration', message: String(error?.message ?? error) });
  } finally {
    if (candidate && !accepted) {
      try {
        await ports.discardCandidate(candidate);
      } catch (error) {
        diagnostics.push({ phase: 'cleanup', message: String(error?.message ?? error) });
      }
    }
  }
  return result;
}
