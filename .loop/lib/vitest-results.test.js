// @vitest-environment node
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseVitestResults } from './vitest-results.mjs';
import { judgeGreen, judgeRed, judgeSuite } from './results.mjs';

const root = path.resolve('fixture');
const file = path.join(root, 'src/a.test.js');
const binding = {
  id: 'src/a.test.js::rules rule-a',
  file: 'src/a.test.js',
  name: 'rules rule-a',
  criteria: ['spec/x.html#rule-a'],
};
function fixture(failed = true) {
  const error = { name: 'AssertionError', message: 'expected 0 to be 1', hasComparison: true, origin: 'test' };
  return {
    report: {
      startTime: 1000,
      success: !failed,
      numTotalTestSuites: 2,
      numPassedTestSuites: failed ? 0 : 2,
      numFailedTestSuites: failed ? 2 : 0,
      numPendingTestSuites: 0,
      numTotalTests: 1,
      numPassedTests: failed ? 0 : 1,
      numFailedTests: failed ? 1 : 0,
      numPendingTests: 0,
      numTodoTests: 0,
      testResults: [
        {
          name: file,
          status: failed ? 'failed' : 'passed',
          message: '',
          assertionResults: [
            {
              title: 'rule-a',
              ancestorTitles: ['rules'],
              fullName: 'rules rule-a',
              status: failed ? 'failed' : 'passed',
              failureMessages: failed ? ['AssertionError: expected 0 to be 1'] : [],
            },
          ],
        },
      ],
    },
    process: {
      exitCode: failed ? 1 : 0,
      signal: null,
      timedOut: false,
      startedAt: 900,
      finishedAt: 1200,
      evidence: {
        schema: 1,
        suites: { total: 2, passed: failed ? 0 : 2, failed: failed ? 2 : 0, pending: 0 },
        errors: [],
        tests: [{ file, name: 'rules rule-a', state: failed ? 'fail' : 'pass', errors: failed ? [error] : [] }],
      },
    },
  };
}

describe('Vitest JSON and supplemental evidence parser', () => {
  it('pairs duplicate identities by state even when the reporter orders them differently', () => {
    const { report, process } = fixture();
    report.testResults[0].assertionResults.unshift({
      ...report.testResults[0].assertionResults[0],
      status: 'passed',
      failureMessages: [],
    });
    report.numTotalTests = 2;
    report.numPassedTests = 1;
    process.evidence.tests.push({ ...process.evidence.tests[0], state: 'pass', errors: [] });

    const run = parseVitestResults(report, process, root);

    expect(run.complete).toBe(true);
    expect(run.errors).toEqual([]);
    expect(run.tests.map(({ status, failureKind }) => [status, failureKind])).toEqual([
      ['passed', null],
      ['failed', 'assertion'],
    ]);
    expect(judgeSuite(run).status).toBe('INVALID_GREEN');
    expect(judgeRed(run, [binding]).status).toBe('INVALID_RED');
  });

  it('accepts duplicate passing identities even across repeated report files', () => {
    const { report, process } = fixture(false);
    report.testResults.push(structuredClone(report.testResults[0]));
    process.evidence.tests.push(structuredClone(process.evidence.tests[0]));
    report.numTotalTests = report.numPassedTests = 2;

    const run = parseVitestResults(report, process, root);

    expect(run.complete).toBe(true);
    expect(run.tests).toHaveLength(2);
    expect(judgeSuite(run).status).toBe('GREEN');
    expect(judgeGreen(run, [binding]).status).toBe('INVALID_GREEN');
  });

  it('matches reversed duplicate failures by their formatted messages', () => {
    const { report, process } = fixture();
    report.testResults[0].assertionResults.push({
      ...report.testResults[0].assertionResults[0],
      failureMessages: ['AssertionError: expected 2 to be 3'],
    });
    process.evidence.tests.unshift({
      ...process.evidence.tests[0],
      errors: [{ ...process.evidence.tests[0].errors[0], message: 'expected 2 to be 3' }],
    });
    report.numTotalTests = report.numFailedTests = 2;

    const run = parseVitestResults(report, process, root);

    expect(run.complete).toBe(true);
    expect(run.tests.map(({ message }) => message)).toEqual(['expected 0 to be 1', 'expected 2 to be 3']);
    expect(judgeSuite(run).status).toBe('INVALID_GREEN');
  });

  it.each(['state', 'failure message', 'extra counterpart'])(
    'rejects contradictory duplicate %s evidence',
    (difference) => {
      const { report, process } = fixture();
      report.testResults[0].assertionResults.push(structuredClone(report.testResults[0].assertionResults[0]));
      process.evidence.tests.push(structuredClone(process.evidence.tests[0]));
      report.numTotalTests = report.numFailedTests = 2;
      if (difference === 'state') process.evidence.tests[1].state = 'pass';
      if (difference === 'failure message') process.evidence.tests[1].errors[0].message = 'different failure';
      if (difference === 'extra counterpart') process.evidence.tests.push(structuredClone(process.evidence.tests[0]));

      const run = parseVitestResults(report, process, root);

      expect(run.complete).toBe(false);
      expect(run.errors).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'parser' })]));
    }
  );

  it('retains an unhandled process error even when every test passed', () => {
    // * ARRANGE
    const { report, process } = fixture(false);
    process.exitCode = 1;
    process.evidence.errors.push({
      name: 'Error',
      message: 'unhandled rejection',
      hasComparison: false,
      origin: 'unknown',
    });
    // * ACT
    const run = parseVitestResults(report, process, root);
    // * ASSERT
    expect(run.complete).toBe(true);
    expect(run.errors).toEqual([{ kind: 'suite', message: 'unhandled rejection' }]);
    expect(judgeGreen(run, [binding]).status).toBe('INVALID_GREEN');
  });
  it.each([true, false])('projects real report fields into neutral evidence (failed=%s)', (failed) => {
    // * ARRANGE
    const { report, process } = fixture(failed);
    process.evidence = JSON.stringify(process.evidence);
    // * ACT
    const run = parseVitestResults(JSON.stringify(report), process, root);
    // * ASSERT
    expect(run).toEqual({
      exitCode: failed ? 1 : 0,
      complete: true,
      errors: [],
      tests: [
        {
          id: binding.id,
          file: binding.file,
          name: binding.name,
          status: failed ? 'failed' : 'passed',
          failureKind: failed ? 'assertion' : null,
          message: failed ? 'expected 0 to be 1' : '',
        },
      ],
    });
    expect((failed ? judgeRed : judgeGreen)(run, [binding]).status).toBe(failed ? 'RED' : 'GREEN');
  });

  it.each([
    [
      'runtime',
      (error) => {
        error.name = 'Error';
      },
    ],
    [
      'impersonated assertion',
      (error) => {
        error.hasComparison = false;
      },
    ],
    [
      'cleanup assertion',
      (error) => {
        error.origin = 'hook';
      },
    ],
    [
      'unknown provenance',
      (error) => {
        error.origin = 'unknown';
      },
    ],
  ])('never certifies %s as a behavioral assertion', (_, mutate) => {
    // * ARRANGE
    const { report, process } = fixture();
    mutate(process.evidence.tests[0].errors[0]);
    // * ACT
    const run = parseVitestResults(report, process, root);
    // * ASSERT
    expect(run.complete).toBe(true);
    expect(run.tests[0].failureKind).toBe('runtime');
    expect(judgeRed(run, [binding]).status).toBe('INVALID_RED');
  });

  it.each([
    [
      'stale report',
      ({ report }) => {
        report.startTime = 899;
      },
    ],
    [
      'future report',
      ({ report }) => {
        report.startTime = 1201;
      },
    ],
    [
      'invalid report',
      (value) => {
        value.report = null;
      },
    ],
    [
      'truncated JSON',
      (value) => {
        value.report = '{"';
      },
    ],
    [
      'missing evidence',
      ({ process }) => {
        delete process.evidence;
      },
    ],
    [
      'malformed evidence',
      ({ process }) => {
        process.evidence = 'broken';
      },
    ],
    [
      'wrong schema',
      ({ process }) => {
        process.evidence.schema = 2;
      },
    ],
    [
      'missing test detail',
      ({ report }) => {
        report.testResults = null;
      },
    ],
    [
      'missing evidence detail',
      ({ process }) => {
        process.evidence.tests = null;
      },
    ],
    [
      'missing errors',
      ({ process }) => {
        process.evidence.errors = null;
      },
    ],
    [
      'duplicate test',
      ({ report }) => {
        report.testResults[0].assertionResults.push(report.testResults[0].assertionResults[0]);
      },
    ],
    [
      'duplicate evidence',
      ({ process }) => {
        process.evidence.tests.push(process.evidence.tests[0]);
      },
    ],
    [
      'missing counterpart',
      ({ process }) => {
        process.evidence.tests = [];
      },
    ],
    [
      'extra counterpart',
      ({ process }) => {
        process.evidence.tests.push({ ...process.evidence.tests[0], name: 'extra' });
      },
    ],
    [
      'outside file',
      ({ report }) => {
        report.testResults[0].name = path.resolve(root, '..', 'outside.test.js');
      },
    ],
    [
      'relative file',
      ({ report }) => {
        report.testResults[0].name = 'relative.test.js';
      },
    ],
    [
      'mismatched nested name',
      ({ report }) => {
        report.testResults[0].assertionResults[0].fullName = 'different';
      },
    ],
    [
      'unknown status',
      ({ report }) => {
        report.testResults[0].assertionResults[0].status = 'mystery';
      },
    ],
    [
      'state disagreement',
      ({ process }) => {
        process.evidence.tests[0].state = 'pass';
      },
    ],
    [
      'still-running state',
      ({ process }) => {
        process.evidence.tests[0].state = 'run';
      },
    ],
    [
      'missing failure message',
      ({ report }) => {
        report.testResults[0].assertionResults[0].failureMessages = [];
      },
    ],
    [
      'malformed error',
      ({ process }) => {
        process.evidence.tests[0].errors = [null];
      },
    ],
    [
      'no structured failure',
      ({ process }) => {
        process.evidence.tests[0].errors = [];
      },
    ],
    [
      'mismatched error message',
      ({ process }) => {
        process.evidence.tests[0].errors[0].message = 'a different failure';
      },
    ],
    [
      'count mismatch',
      ({ report }) => {
        report.numTotalTests = 2;
      },
    ],
    [
      'negative count',
      ({ report }) => {
        report.numFailedTests = -1;
      },
    ],
    [
      'suite count mismatch',
      ({ report }) => {
        report.numTotalTestSuites = 3;
      },
    ],
    [
      'invented suite',
      ({ report }) => {
        report.numTotalTestSuites = 3;
        report.numPassedTestSuites = 1;
      },
    ],
    [
      'exit contradiction',
      ({ process }) => {
        process.exitCode = 0;
      },
    ],
    [
      'success contradiction',
      ({ report }) => {
        report.success = true;
      },
    ],
  ])('fails closed on %s', (_, mutate) => {
    // * ARRANGE
    const value = fixture();
    mutate(value);
    // * ACT
    const run = parseVitestResults(value.report, value.process, root);
    // * ASSERT
    expect(run.complete).toBe(false);
    expect(run.errors.length).toBeGreaterThan(0);
    expect(judgeRed(run, [binding]).status).toBe('INVALID_RED');
  });

  it.each([
    { timedOut: true },
    { signal: 'SIGTERM' },
    { exitCode: null },
    { exitCode: 2 },
    { startedAt: null },
    { finishedAt: 1 },
  ])('rejects incomplete process evidence %j', (change) => {
    // * ARRANGE
    const { report, process } = fixture();
    // * ACT
    const run = parseVitestResults(report, { ...process, ...change }, root);
    // * ASSERT
    expect(run.complete).toBe(false);
    expect(run.errors[0].kind).toBe('process');
  });

  it('retains suite/hook errors and zero-test discovery as invalid evidence, not an assertion failure', () => {
    // * ARRANGE
    const { report, process } = fixture();
    report.testResults[0].message = 'fixture crashed';
    report.testResults[0].assertionResults = [];
    report.numTotalTests = report.numFailedTests = 0;
    process.evidence.tests = [];
    process.evidence.errors.push({
      name: 'HookError',
      message: 'fixture crashed',
      hasComparison: false,
      origin: 'hook',
    });
    // * ACT
    const run = parseVitestResults(report, process, root);
    // * ASSERT
    expect(run.complete).toBe(true);
    expect(run.errors).toEqual(
      expect.arrayContaining([
        { kind: 'hook', message: 'fixture crashed' },
        { kind: 'suite', message: 'fixture crashed' },
        { kind: 'discovery', message: 'No tests discovered.' },
      ])
    );
    expect(judgeRed(run, [binding]).status).toBe('INVALID_RED');
  });

  it.each(['skipped', 'todo'])('preserves %s as skipped, never passed', (status) => {
    // * ARRANGE
    const { report, process } = fixture(false);
    report.testResults[0].assertionResults[0].status = status;
    process.evidence.tests[0].state = status === 'todo' ? 'todo' : 'skip';
    report.numPassedTests = 0;
    report[status === 'todo' ? 'numTodoTests' : 'numPendingTests'] = 1;
    // * ACT
    const run = parseVitestResults(report, process, root);
    // * ASSERT
    expect(run.complete).toBe(true);
    expect(run.tests[0].status).toBe('skipped');
    expect(judgeGreen(run, [binding]).status).toBe('INVALID_GREEN');
  });
});
