import path from 'node:path';
import { validateRelativePath } from './plan.mjs';

const parse = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
const text = (value) => typeof value === 'string' && value.length > 0;
const count = (value) => Number.isSafeInteger(value) && value >= 0;
function requireEvidence(condition, message) {
  if (!condition) throw new Error(message);
}

function relativeFile(file, root) {
  requireEvidence(typeof file === 'string' && path.isAbsolute(file), 'Report file must be absolute.');
  const relative = path.relative(root, file).split(path.sep).join('/');
  validateRelativePath(relative);
  return relative;
}

function validError(error) {
  return (
    text(error?.name) &&
    text(error.message) &&
    typeof error.hasComparison === 'boolean' &&
    ['test', 'hook', 'unknown'].includes(error.origin)
  );
}

/** Combine stock JSON and supplemental reporter evidence; neither test metadata nor prose supplies verdicts. */
export function parseVitestResults(json, processResult, repoRoot) {
  const result = { exitCode: processResult?.exitCode ?? null, complete: false, errors: [], tests: [] };
  if (
    !processResult ||
    ![0, 1].includes(processResult.exitCode) ||
    processResult.signal !== null ||
    processResult.timedOut !== false ||
    !count(processResult.startedAt) ||
    !count(processResult.finishedAt) ||
    processResult.finishedAt < processResult.startedAt
  )
    return { ...result, errors: [{ kind: 'process', message: 'Test process evidence is incomplete or abnormal.' }] };
  try {
    requireEvidence(typeof repoRoot === 'string' && path.isAbsolute(repoRoot), 'Repository root must be absolute.');
    const report = parse(json);
    const evidence = parse(processResult.evidence);
    requireEvidence(report && Array.isArray(report.testResults), 'Missing Vitest test results.');
    requireEvidence(
      evidence?.schema === 1 && Array.isArray(evidence.tests) && Array.isArray(evidence.errors),
      'Missing structured runner evidence.'
    );
    requireEvidence(
      count(report.startTime) &&
        report.startTime >= processResult.startedAt &&
        report.startTime <= processResult.finishedAt,
      'Report is stale or outside this invocation.'
    );
    const keys = [
      'numTotalTests',
      'numPassedTests',
      'numFailedTests',
      'numPendingTests',
      'numTodoTests',
      'numTotalTestSuites',
      'numPassedTestSuites',
      'numFailedTestSuites',
      'numPendingTestSuites',
    ];
    requireEvidence(
      keys.every((key) => count(report[key])),
      'Invalid aggregate counts.'
    );
    requireEvidence(
      report.numTotalTestSuites ===
        report.numPassedTestSuites + report.numFailedTestSuites + report.numPendingTestSuites &&
        report.numTotalTestSuites >= report.testResults.length,
      'Suite aggregate counts disagree.'
    );
    requireEvidence(
      evidence.suites &&
        ['total', 'passed', 'failed', 'pending'].every(
          (key) => evidence.suites[key] === report[`num${key[0].toUpperCase()}${key.slice(1)}TestSuites`]
        ),
      'Structured suite counts disagree with JSON.'
    );
    requireEvidence(evidence.errors.every(validError), 'Invalid suite error evidence.');
    result.errors.push(
      ...evidence.errors.map((error) => ({
        kind: error.origin === 'hook' ? 'hook' : 'suite',
        message: error.message,
      }))
    );
    const details = new Map();
    for (const test of evidence.tests) {
      requireEvidence(
        text(test?.name) && Array.isArray(test.errors) && test.errors.every(validError),
        'Invalid structured test evidence.'
      );
      const id = `${relativeFile(test.file, repoRoot)}::${test.name}`;
      if (!details.has(id)) details.set(id, []);
      details.get(id).push(test);
    }
    const totals = { passed: 0, failed: 0, skipped: 0, todo: 0 };
    const states = { passed: 'pass', failed: 'fail', skipped: 'skip', todo: 'todo' };
    for (const suite of report.testResults) {
      const file = relativeFile(suite?.name, repoRoot);
      requireEvidence(
        Array.isArray(suite.assertionResults) &&
          ['passed', 'failed'].includes(suite.status) &&
          typeof suite.message === 'string',
        'Malformed suite detail.'
      );
      if (suite.message) result.errors.push({ kind: 'suite', message: suite.message });
      for (const test of suite.assertionResults) {
        requireEvidence(
          text(test?.title) &&
            Array.isArray(test.ancestorTitles) &&
            test.ancestorTitles.every(text) &&
            test.fullName === [...test.ancestorTitles, test.title].join(' '),
          'Ambiguous full test name.'
        );
        const id = `${file}::${test.fullName}`;
        const candidates = details.get(id);
        requireEvidence(candidates?.length, 'Duplicate or unmatched test identity.');
        requireEvidence(
          Array.isArray(test.failureMessages) && test.failureMessages.every(text),
          'Failure evidence disagrees.'
        );
        const index = candidates.findIndex(
          (detail) =>
            detail.state === states[test.status] &&
            detail.errors.length === test.failureMessages.length &&
            detail.errors.every((error, errorIndex) => test.failureMessages[errorIndex].includes(error.message)) &&
            (test.status === 'failed' ? detail.errors.length > 0 : detail.errors.length === 0)
        );
        requireEvidence(index !== -1, 'Incomplete or contradictory test state or failure evidence.');
        const [detail] = candidates.splice(index, 1);
        requireEvidence(
          Object.hasOwn(states, test.status) && detail.state === states[test.status],
          'Incomplete or contradictory test state.'
        );
        requireEvidence(
          Array.isArray(test.failureMessages) &&
            test.failureMessages.every(text) &&
            test.failureMessages.length === detail.errors.length,
          'Failure evidence disagrees.'
        );
        requireEvidence(
          detail.errors.every((error, index) => test.failureMessages[index].includes(error.message)),
          'Failure messages disagree across reports.'
        );
        requireEvidence(
          test.status === 'failed' ? detail.errors.length > 0 : detail.errors.length === 0,
          'Test status contradicts its errors.'
        );
        totals[test.status] += 1;
        const assertion = detail.errors.every(
          (error) => error.name === 'AssertionError' && error.hasComparison && error.origin === 'test'
        );
        result.tests.push({
          id,
          file,
          name: test.fullName,
          status: ['skipped', 'todo'].includes(test.status) ? 'skipped' : test.status,
          failureKind: test.status === 'failed' ? (assertion ? 'assertion' : 'runtime') : null,
          message: detail.errors.map(({ message }) => message).join('\n'),
        });
      }
      requireEvidence(
        suite.status === 'failed' || !suite.assertionResults.some((test) => test.status === 'failed'),
        'Suite status contradicts failed tests.'
      );
    }
    requireEvidence(
      [...details.values()].every((tests) => tests.length === 0),
      'Extra structured test evidence.'
    );
    requireEvidence(
      report.numTotalTests === result.tests.length &&
        report.numPassedTests === totals.passed &&
        report.numFailedTests === totals.failed &&
        report.numPendingTests === totals.skipped &&
        report.numTodoTests === totals.todo,
      'Test aggregate counts disagree.'
    );
    const success = report.testResults.length > 0 && report.numFailedTestSuites === 0 && totals.failed === 0;
    requireEvidence(report.success === success, 'Success flag contradicts the report.');
    requireEvidence(
      processResult.exitCode === (success && result.errors.length === 0 ? 0 : 1),
      'Process exit contradicts the report.'
    );
    if (result.tests.length === 0) result.errors.push({ kind: 'discovery', message: 'No tests discovered.' });
    result.complete = true;
    return result;
  } catch (error) {
    return {
      ...result,
      complete: false,
      errors: [...result.errors, { kind: 'parser', message: error.message }],
      tests: [],
    };
  }
}
