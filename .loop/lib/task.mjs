import { judgeGreen, judgeRed, judgeSuite } from './results.mjs';
import { routeFindings, validateFindings } from './review.mjs';
import { beginExecution, mergeUsage, nextRepair, resolveLimits } from './termination.mjs';

/** Test authors identify tests and anchors; they cannot return a verdict or claim source ownership. */
export function validateBindings(bindings, task, testFiles) {
  if (!Array.isArray(bindings) || !bindings.length || !Array.isArray(testFiles))
    throw new Error('Nonempty test bindings and harness-classified test files are required.');
  const ids = new Set();
  const covered = new Set();
  const result = [];
  for (const binding of bindings) {
    if (
      !binding ||
      Object.keys(binding).sort().join(',') !== 'criteria,file,id,name' ||
      typeof binding.name !== 'string' ||
      !binding.name.trim() ||
      !task.files_modified.includes(binding.file) ||
      !testFiles.includes(binding.file) ||
      binding.id !== `${binding.file}::${binding.name}` ||
      ids.has(binding.id) ||
      !Array.isArray(binding.criteria) ||
      !binding.criteria.length ||
      new Set(binding.criteria).size !== binding.criteria.length ||
      binding.criteria.some((anchor) => !task.criteria.includes(anchor))
    )
      throw new Error('Invalid, duplicate, unowned, or non-anchor-only test binding.');
    ids.add(binding.id);
    for (const anchor of binding.criteria) covered.add(anchor);
    result.push(Object.freeze({ ...binding, criteria: Object.freeze([...binding.criteria]) }));
  }
  if (task.criteria.some((anchor) => !covered.has(anchor)))
    throw new Error('Test bindings do not cover all task criteria.');
  return Object.freeze(result);
}

/** Ports own isolated workspaces; this controller alone authorizes RED -> implementation -> GREEN. */
export async function runTask({ task, target, baseline, index, standards, maxRepairs, maxAgentExecutions }, ports) {
  if (maxRepairs !== undefined && (!Number.isSafeInteger(maxRepairs) || maxRepairs < 0))
    throw new Error('Invalid repair limit.');
  const limits = resolveLimits(target, { cycle: maxRepairs, total: maxAgentExecutions });
  const evidence = {
    baseline: null,
    bindings: [],
    tests: null,
    red: null,
    green: null,
    history: [],
    legs: [],
    audits: [],
    reviews: [],
    diagnostics: [],
    termination: { total: 0, cycles: {}, signatures: {} },
    usage: { counters: [], apiDurationMs: 0, durationMs: 0, complete: true, missingExecutions: 0 },
  };
  const finding = (code, domain, message, files = []) => ({
    code,
    fault_domain: domain,
    criteria: [...task.criteria],
    files,
    message,
  });
  const outcome = (status, findings = [], delta = null) => ({ taskId: task.id, status, evidence, findings, delta });
  const budget = (decision, findings = []) => {
    evidence.termination = decision.state;
    if (decision.decision === 'run') return null;
    evidence.diagnostics.push({ phase: 'budget', message: decision.reason });
    return outcome('parked', findings);
  };
  const authorizeRepair = (from, to, findings) =>
    budget(nextRepair(evidence.termination, { from, to, findings }, limits), findings);
  const reportUsage = (usage) => {
    evidence.usage = mergeUsage(evidence.usage, usage);
  };
  let phase = 'baseline';
  const runTests = async (kind, input) => {
    phase = kind;
    const run = await ports[kind](input);
    evidence[kind] = run;
    const verdict =
      kind === 'baseline'
        ? judgeSuite(run)
        : kind === 'red'
          ? judgeRed(run, evidence.bindings)
          : judgeGreen(run, evidence.bindings);
    evidence.history.push({ phase: kind, run, verdict });
    return verdict;
  };
  const author = async (leg, input) => {
    phase = leg;
    const blocked = budget(beginExecution(evidence.termination, limits));
    if (blocked) return { rejected: blocked };
    let result;
    try {
      result = await ports[leg](input);
    } catch (error) {
      reportUsage(null);
      throw error;
    }
    reportUsage(result?.outcome?.usage);
    evidence.legs.push({ leg, outcome: result.outcome });
    const violations = await ports.audit(leg, result);
    if (!Array.isArray(violations)) throw new Error('Missing audit evidence.');
    evidence.audits.push({ leg, violations });
    if (violations.length) {
      evidence.diagnostics.push({ phase: leg, message: `Write audit rejected: ${JSON.stringify(violations)}` });
      if (violations.every(({ code }) => code === 'incomplete_evidence')) return { rejected: outcome('parked') };
      return {
        rejected: outcome('parked', [
          finding(
            'undeclared_file',
            'implement',
            'Write audit rejected.',
            violations.map(({ path }) => path).filter((file) => typeof file === 'string')
          ),
        ]),
      };
    }
    if (result.outcome?.status !== 'completed') throw new Error(`${leg} transport did not complete.`);
    return { result };
  };
  const authorTests = async (initialFeedback) => {
    let feedback = initialFeedback;
    for (;;) {
      const authored = await author('test', { task, target, baseline, feedback });
      if (authored.rejected) return authored.rejected;
      try {
        if (authored.result.bindingError) throw new Error(authored.result.bindingError);
        evidence.bindings = validateBindings(authored.result.bindings, task, authored.result.testFiles);
      } catch (error) {
        feedback = error.message;
        evidence.diagnostics.push({ phase: 'bindings', message: feedback });
        const blocked = authorizeRepair('test', 'test', [finding('unsupported_assertion', 'test', feedback)]);
        if (blocked) return blocked;
        continue;
      }
      evidence.tests = await ports.freezeTests({ task, bindings: evidence.bindings });
      if (!evidence.tests) throw new Error('Missing immutable test snapshot.');
      const verdict = await runTests('red', {
        task,
        target,
        baseline,
        tests: evidence.tests,
        bindings: evidence.bindings,
      });
      if (verdict.status === 'RED') return null;
      feedback = verdict.reasons.join(' ');
      const blocked = authorizeRepair('test', 'test', [finding('unsupported_assertion', 'test', feedback)]);
      if (blocked) return blocked;
    }
  };
  const authorImplementation = async (initialFeedback) => {
    let feedback = initialFeedback;
    for (;;) {
      const authored = await author('implement', { task, target, baseline, tests: evidence.tests, evidence, feedback });
      if (authored.rejected) return authored.rejected;
      const verdict = await runTests('green', { task, target, tests: evidence.tests, bindings: evidence.bindings });
      if (verdict.status === 'GREEN') return null;
      feedback = verdict.reasons.join(' ');
      const blocked = authorizeRepair('implement', 'implement', [finding('wrong_behavior', 'implement', feedback)]);
      if (blocked) return blocked;
    }
  };
  try {
    const baselineVerdict = await runTests('baseline', { task, target, baseline });
    if (baselineVerdict.status !== 'GREEN') {
      evidence.diagnostics.push({
        phase,
        message: `Baseline suite is not GREEN: ${baselineVerdict.reasons.join(' ')}`,
      });
      return outcome('parked');
    }
    const testFailure = await authorTests('');
    if (testFailure) return testFailure;
    const implementationFailure = await authorImplementation('');
    if (implementationFailure) return implementationFailure;
    for (;;) {
      phase = 'delta';
      const delta = await ports.delta({ task, baseline, tests: evidence.tests });
      if (!Buffer.isBuffer(delta?.bytes) || !Array.isArray(delta.changes))
        throw new Error('Missing captured delta evidence.');
      phase = 'review';
      if (typeof ports.review !== 'function') throw new Error('Independent review is required.');
      const reviewBlocked = budget(beginExecution(evidence.termination, limits));
      if (reviewBlocked) return reviewBlocked;
      let reported = false;
      let rawFindings;
      try {
        rawFindings = await ports.review({
          task,
          target,
          baseline,
          index,
          standards,
          evidence,
          delta,
          reportUsage: (usage) => {
            if (reported) throw new Error('Reviewer usage was reported twice.');
            reportUsage(usage);
            reported = true;
          },
        });
      } finally {
        if (!reported) reportUsage(null);
      }
      const findings = validateFindings(rawFindings, task, index);
      const route = routeFindings(findings);
      evidence.reviews.push({ findings, route });
      if (route === 'done') return outcome('ready', [], delta);
      if (route === 'decompose') return outcome('gate1', findings);
      const feedback = findings.map(({ message }) => message).join('\n');
      if (route === 'test') {
        const blocked = authorizeRepair('review', 'test', findings);
        if (blocked) return blocked;
        const testFailure = await authorTests(feedback);
        if (testFailure) return testFailure;
        const verdict = await runTests('green', {
          task,
          target,
          tests: evidence.tests,
          bindings: evidence.bindings,
        });
        if (verdict.status === 'GREEN') continue;
        const implementationFailure = await authorImplementation(verdict.reasons.join(' '));
        if (implementationFailure) return implementationFailure;
        continue;
      }
      const blocked = authorizeRepair('review', 'implement', findings);
      if (blocked) return blocked;
      const implementationFailure = await authorImplementation(feedback);
      if (implementationFailure) return implementationFailure;
    }
  } catch (error) {
    evidence.diagnostics.push({ phase, message: String(error?.message ?? error) });
    return outcome('parked');
  }
}
