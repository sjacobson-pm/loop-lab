import { createHash } from 'node:crypto';

/** Collapse incidental failure details without erasing asserted values. */
export function normalizeText(input) {
  return String(input ?? '')
    .replace(/[A-Za-z]:\\[^\s:"']+/g, '<path>')
    .replace(/(?:\/[^\s:"'/]+){2,}\/?/g, '<path>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<guid>')
    .replace(/\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/gi, '<hex>')
    .replace(
      /\b(in|after|took|elapsed|duration:?)\s+\d+(?:\.\d+)?\s?(?:ms|s|sec|secs|seconds|m|min|mins|minutes)\b/gi,
      '$1 <duration>'
    )
    .replace(/[[(]\s*\d+(?:\.\d+)?\s?(?:ms|s|sec|seconds)\s*[\])]/g, '<duration>')
    .replace(/(<path>|[\w.-]+\.(?:cs|js|mjs|ts|tsx|jsx|razor))(?::\d+){1,2}\b/gi, '$1:<line>')
    .replace(/\bline \d+\b/gi, 'line <line>')
    .replace(/\b\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?/g, '<timestamp>')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const canonicalSet = (items, normalize) => [...new Set(items.map(normalize))].sort();

/** The at-fault leg, anchored criterion, code and file identity are never incidental text. */
export function findingSignature(leg, findings) {
  if (!['decompose', 'test', 'implement'].includes(leg) || !Array.isArray(findings) || !findings.length)
    throw new Error('A destination leg and nonempty findings are required.');
  const canonical = canonicalSet(findings, (finding) => {
    if (
      !finding ||
      typeof finding.code !== 'string' ||
      typeof finding.message !== 'string' ||
      !Array.isArray(finding.criteria) ||
      !Array.isArray(finding.files) ||
      finding.criteria.some((criterion) => typeof criterion !== 'string') ||
      finding.files.some((file) => typeof file !== 'string')
    )
      throw new Error('Invalid findings for signature.');
    return JSON.stringify({
      code: finding.code.trim().toLowerCase(),
      criteria: canonicalSet(finding.criteria, (criterion) => criterion),
      files: canonicalSet(finding.files, (file) => file),
      message: normalizeText(finding.message),
    });
  });
  return `${leg}:${createHash('sha256').update(JSON.stringify(canonical)).digest('hex')}`;
}

function validateLimits(limits) {
  if (
    !limits ||
    !Number.isSafeInteger(limits.cycle) ||
    limits.cycle < 0 ||
    !Number.isSafeInteger(limits.total) ||
    limits.total < 1
  )
    throw new Error('Invalid repair or execution budget limits.');
}

/** Resolve explicit target limits before dispatch; optional call-site overrides preserve the other cap. */
export function resolveLimits(target, overrides = {}) {
  const configured = target && Object.hasOwn(target, 'budgets') ? target.budgets : { cycle: 3, total: 15 };
  validateLimits(configured);
  const limits = {
    cycle: overrides.cycle === undefined ? configured.cycle : overrides.cycle,
    total: overrides.total === undefined ? configured.total : overrides.total,
  };
  validateLimits(limits);
  return limits;
}

function verify(state, limits) {
  validateLimits(limits);
  if (
    !state ||
    !Number.isSafeInteger(state.total) ||
    state.total < 0 ||
    !state.cycles ||
    typeof state.cycles !== 'object' ||
    Array.isArray(state.cycles) ||
    !state.signatures ||
    typeof state.signatures !== 'object' ||
    Array.isArray(state.signatures) ||
    Object.values(state.cycles).some((count) => !Number.isSafeInteger(count) || count < 0) ||
    Object.values(state.signatures).some(
      (values) => !Array.isArray(values) || values.some((v) => typeof v !== 'string')
    )
  )
    throw new Error('Invalid termination state.');
}

/** Count the next agent call, including initial legs; trusted tests consume no slots. */
export function beginExecution(state, limits) {
  verify(state, limits);
  if (state.total >= limits.total)
    return { decision: 'park', reason: `Total limit of ${limits.total} agent executions exhausted.`, state };
  return { decision: 'run', reason: null, state: { ...state, total: state.total + 1 } };
}

/** Prioritize the per-leg breaker over a cycle or total cap; never consume a slot here. */
export function nextRepair(state, repair, limits) {
  verify(state, limits);
  if (!repair || !['decompose', 'test', 'implement', 'review'].includes(repair.from))
    throw new Error('Invalid repair route.');
  const signature = findingSignature(repair.to, repair.findings);
  const seen = state.signatures[repair.to] ?? [];
  if (seen.includes(signature))
    return { decision: 'park', reason: `Repeated ${repair.to} signature (breaker).`, state };
  const recorded = {
    ...state,
    signatures: { ...state.signatures, [repair.to]: [...seen, signature] },
  };
  const key = `${repair.to}<-${repair.from}`;
  const used = state.cycles[key] ?? 0;
  if (used >= limits.cycle)
    return {
      decision: 'park',
      reason: `Repair cycle ${key} exhausted after ${limits.cycle} attempts.`,
      state: recorded,
    };
  if (state.total >= limits.total)
    return { decision: 'park', reason: `Total limit of ${limits.total} agent executions exhausted.`, state: recorded };
  return {
    decision: 'run',
    reason: null,
    state: { ...recorded, cycles: { ...state.cycles, [key]: used + 1 } },
  };
}

/** Merge terminal usage only; checkpoints and output files are alternative views, not new charges. */
export function mergeUsage(current, usage) {
  if (usage == null) {
    return {
      ...current,
      complete: false,
      missingExecutions: current.missingExecutions + 1,
      apiDurationMs: null,
      durationMs: null,
    };
  }
  if (
    !Array.isArray(usage.counters) ||
    usage.counters.some(
      ({ name, unit, value } = {}) =>
        typeof name !== 'string' ||
        !name ||
        typeof unit !== 'string' ||
        !unit ||
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0
    )
  )
    throw new Error('Invalid agent usage counters.');
  const counters = current.counters.map((counter) => ({ ...counter }));
  for (const counter of usage.counters) {
    const previous = counters.find(({ name, unit }) => name === counter.name && unit === counter.unit);
    if (previous) previous.value += counter.value;
    else counters.push({ ...counter });
  }
  for (const duration of ['apiDurationMs', 'durationMs'])
    if (usage[duration] != null && (!Number.isFinite(usage[duration]) || usage[duration] < 0))
      throw new Error(`Invalid agent ${duration}.`);
  return {
    counters,
    complete: current.complete && usage.complete !== false,
    missingExecutions: current.missingExecutions + (usage.missingExecutions ?? 0),
    apiDurationMs:
      current.apiDurationMs === null || usage.apiDurationMs == null
        ? null
        : current.apiDurationMs + usage.apiDurationMs,
    durationMs: current.durationMs === null || usage.durationMs == null ? null : current.durationMs + usage.durationMs,
  };
}
