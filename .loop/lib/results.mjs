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
    (phase !== 'RED' && run.tests.length === 0) ||
    !run.tests.every(hasIdentity) ||
    !run.tests.every(
      ({ status, failureKind, message }) =>
        ['passed', 'failed', 'skipped'].includes(status) &&
        ['assertion', 'runtime', null].includes(failureKind) &&
        typeof message === 'string'
    )
  )
    return invalid('Test evidence is incomplete, malformed, or has ambiguous identities.');
  if (run.errors.length > 0)
    return invalid(
      phase === 'RED'
        ? `Collection/import or suite errors are not behavioral RED for ${bindings.map(({ id, criteria }) => `${id} (${criteria.join(', ')})`).join('; ')}. Write a failing acceptance assertion in the declared test file.`
        : 'The run contains infrastructure or suite errors.'
    );
  if (phase !== 'RED' && run.exitCode !== 0) return invalid('The test process did not exit normally for this phase.');

  const targets = new Set(bindings.map(({ id }) => id));
  const counts = new Map();
  for (const test of run.tests) if (targets.has(test.id)) counts.set(test.id, (counts.get(test.id) ?? 0) + 1);
  for (const { id, criteria } of bindings)
    if (counts.get(id) !== 1)
      return invalid(
        `Bound acceptance test ${id} (${criteria.join(', ')}) was ${counts.has(id) ? 'discovered more than once' : 'not discovered'}. Write a behavioral assertion in the declared test file.`
      );
  for (const test of run.tests) {
    if (phase === 'RED' && targets.has(test.id)) {
      if (test.status !== 'failed' || test.failureKind !== 'assertion' || !test.message.trim())
        return invalid(
          `Bound acceptance test ${test.id} (${bindings.find(({ id }) => id === test.id).criteria.join(', ')}) ${test.status === 'passed' ? 'passed RED' : 'did not fail on a behavioral assertion'}. Modify the declared test file to assert the required behavior.`
        );
    } else if (test.status !== 'passed' || test.failureKind !== null || test.message !== '')
      return invalid(`Test ${test.id} was not a clean pass.`);
  }
  if (phase === 'RED' && run.exitCode !== 1)
    return invalid('The RED test process exit code does not agree with its failing assertions.');
  return { status: phase, reasons: [] };
}

/** Only complete, named assertion failures authorize an implementation leg. */
export const judgeRed = (run, bindings) => judge(run, bindings, 'RED');

/** A clean process exit is insufficient without all named tests and the rest of the suite passing. */
export const judgeGreen = (run, bindings) => judge(run, bindings, 'GREEN');

/** Baseline/integration suites have no new criterion bindings but still require actual passing tests. */
export const judgeSuite = (run) => judge(run, [], 'GREEN', false);
