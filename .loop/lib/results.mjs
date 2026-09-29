function hasIdentity(value) {
  return (
    typeof value?.file === 'string' &&
    value.file.trim().length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    value.id === `${value.file}::${value.name}`
  );
}

function uniqueIdentities(values) {
  return values.every(hasIdentity) && new Set(values.map(({ id }) => id)).size === values.length;
}

function judge(run, bindings, phase, requireBindings = true) {
  const invalid = (reason) => ({ status: `INVALID_${phase}`, reasons: [reason] });
  if (
    !Array.isArray(bindings) ||
    (requireBindings && bindings.length === 0) ||
    !uniqueIdentities(bindings) ||
    !bindings.every(
      ({ criteria }) =>
        Array.isArray(criteria) &&
        criteria.length > 0 &&
        criteria.every((anchor) => typeof anchor === 'string' && /^[^#]+#[^#]+$/.test(anchor))
    )
  )
    return invalid('Named tests require unique identities and nonempty anchor citations.');
  if (
    run?.complete !== true ||
    !Array.isArray(run.errors) ||
    !Array.isArray(run.tests) ||
    run.tests.length === 0 ||
    !run.tests.every(hasIdentity) ||
    !run.tests.every(
      ({ status, failureKind, message }) =>
        ['passed', 'failed', 'skipped'].includes(status) &&
        ['assertion', 'runtime', null].includes(failureKind) &&
        typeof message === 'string'
    )
  )
    return invalid('Test evidence is incomplete, malformed, or has ambiguous identities.');
  if (run.errors.length > 0) return invalid('The run contains infrastructure or suite errors.');
  if (run.exitCode !== (phase === 'RED' ? 1 : 0))
    return invalid('The test process did not exit normally for this phase.');

  const targets = new Set(bindings.map(({ id }) => id));
  const counts = new Map();
  for (const test of run.tests) if (targets.has(test.id)) counts.set(test.id, (counts.get(test.id) ?? 0) + 1);
  if (bindings.some(({ id }) => counts.get(id) !== 1))
    return invalid('A named target test was not discovered exactly once.');
  for (const test of run.tests) {
    if (phase === 'RED' && targets.has(test.id)) {
      if (test.status !== 'failed' || test.failureKind !== 'assertion' || !test.message.trim())
        return invalid(`Named test ${test.id} did not fail on a behavioral assertion.`);
    } else if (test.status !== 'passed' || test.failureKind !== null || test.message !== '')
      return invalid(`Test ${test.id} was not a clean pass.`);
  }
  return { status: phase, reasons: [] };
}

/** Only complete, named assertion failures authorize an implementation leg. */
export const judgeRed = (run, bindings) => judge(run, bindings, 'RED');

/** A clean process exit is insufficient without all named tests and the rest of the suite passing. */
export const judgeGreen = (run, bindings) => judge(run, bindings, 'GREEN');

/** Baseline/integration suites have no new criterion bindings but still require actual passing tests. */
export const judgeSuite = (run) => judge(run, [], 'GREEN', false);
