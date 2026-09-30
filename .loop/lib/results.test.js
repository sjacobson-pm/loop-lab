// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { judgeGreen, judgeRed, judgeSuite } from './results.mjs';

const binding = {
  id: 'src/a.test.js::rules rejects zero',
  file: 'src/a.test.js',
  name: 'rules rejects zero',
  criteria: ['spec/x.html#rule-a'],
};
const assertion = {
  id: binding.id,
  file: binding.file,
  name: binding.name,
  status: 'failed',
  failureKind: 'assertion',
  message: 'expected 0 to be 1',
};
const red = () => ({ exitCode: 1, complete: true, errors: [], tests: [{ ...assertion }] });
const green = () => ({
  exitCode: 0,
  complete: true,
  errors: [],
  tests: [{ ...assertion, status: 'passed', failureKind: null, message: '' }],
});

describe('target-neutral verdicts', () => {
  it('rejects a nonempty report that omits the designated target identity', () => {
    // * ARRANGE
    const run = green();
    run.tests[0] = { ...run.tests[0], id: 'other::test', file: 'other', name: 'test' };
    // * ACT / ASSERT
    expect(judgeGreen(run, [binding]).status).toBe('INVALID_GREEN');
  });
  it('judges a complete baseline suite without inventing criterion bindings', () => {
    // * ARRANGE / ACT / ASSERT
    expect(judgeSuite(green())).toEqual({ status: 'GREEN', reasons: [] });
    expect(judgeSuite(red()).status).toBe('INVALID_GREEN');
    expect(judgeSuite({ ...green(), tests: [] }).status).toBe('INVALID_GREEN');
    expect(judgeSuite(null).status).toBe('INVALID_GREEN');
  });
  it('allows duplicate unbound passes but rejects ambiguity for a bound identity', () => {
    const duplicate = { ...green().tests[0], id: 'b::other', file: 'b', name: 'other' };
    const greenRun = green();
    greenRun.tests.push(duplicate, { ...duplicate });
    const redRun = red();
    redRun.tests.push(duplicate, { ...duplicate });

    expect(judgeSuite(greenRun).status).toBe('GREEN');
    expect(judgeGreen(greenRun, [binding]).status).toBe('GREEN');
    expect(judgeRed(redRun, [binding]).status).toBe('RED');
    greenRun.tests.push({ ...greenRun.tests[0] });
    redRun.tests.push({ ...redRun.tests[0] });
    expect(judgeGreen(greenRun, [binding]).status).toBe('INVALID_GREEN');
    expect(judgeRed(redRun, [binding]).status).toBe('INVALID_RED');
  });
  it('rejects any failing duplicate in a baseline or integration suite', () => {
    const run = green();
    run.tests.push({ ...run.tests[0] }, { ...assertion });
    run.exitCode = 1;
    expect(judgeSuite(run).status).toBe('INVALID_GREEN');
  });
  it('accepts only named behavioral RED and then a complete passing GREEN', () => {
    // * ARRANGE / ACT / ASSERT
    expect(judgeRed(red(), [binding])).toEqual({ status: 'RED', reasons: [] });
    expect(judgeGreen(green(), [binding])).toEqual({ status: 'GREEN', reasons: [] });
    expect(judgeRed(green(), [binding]).status).toBe('INVALID_RED');
    expect(judgeGreen(red(), [binding]).status).toBe('INVALID_GREEN');
  });
  it('identifies a bound test that passed RED instead of reporting a normal exit as abnormal', () => {
    const verdict = judgeRed(green(), [binding]);
    expect(verdict.status).toBe('INVALID_RED');
    expect(verdict.reasons.join(' ')).toContain(binding.id);
    expect(verdict.reasons.join(' ')).toContain(binding.criteria[0]);
    expect(verdict.reasons.join(' ')).toMatch(/passed/i);
    expect(verdict.reasons.join(' ')).not.toMatch(/did not exit normally/i);
  });
  it('accepts behavioral RED for the bound test while unrelated tests pass', () => {
    const run = red();
    run.tests.push({ ...green().tests[0], id: 'other::healthy', file: 'other', name: 'healthy' });
    expect(judgeRed(run, [binding])).toEqual({ status: 'RED', reasons: [] });
  });
  it('names missing bound acceptance tests even when other tests pass', () => {
    const run = green();
    run.tests[0] = { ...run.tests[0], id: 'other::healthy', file: 'other', name: 'healthy' };
    const verdict = judgeRed(run, [binding]);
    expect(verdict.status).toBe('INVALID_RED');
    expect(verdict.reasons.join(' ')).toContain(binding.id);
    expect(verdict.reasons.join(' ')).toContain(binding.criteria[0]);
    expect(verdict.reasons.join(' ')).toMatch(/not discovered|missing/i);
  });
  it('explains collection-only RED as missing behavioral assertion evidence', () => {
    const run = {
      exitCode: 1,
      complete: true,
      errors: [{ kind: 'collection', message: 'Cannot import source' }],
      tests: [],
    };
    const verdict = judgeRed(run, [binding]);
    expect(verdict.status).toBe('INVALID_RED');
    expect(verdict.reasons.join(' ')).toContain(binding.id);
    expect(verdict.reasons.join(' ')).toContain(binding.criteria[0]);
    expect(verdict.reasons.join(' ')).toMatch(/collection|import/i);
  });

  it.each([
    ['missing tests', (run) => (run.tests = [])],
    ['runtime throw', (run) => (run.tests[0].failureKind = 'runtime')],
    ['unknown failure', (run) => (run.tests[0].failureKind = null)],
    ['unexpected pass', (run) => (run.tests[0] = green().tests[0])],
    ['skipped target', (run) => (run.tests[0].status = 'skipped')],
    ['empty failure message', (run) => (run.tests[0].message = '')],
    ['unrelated failure', (run) => run.tests.push({ ...assertion, id: 'b::other', file: 'b', name: 'other' })],
  ])('rejects RED with %s', (_, change) => {
    // * ARRANGE
    const run = red();
    change(run);
    // * ACT
    const verdict = judgeRed(run, [binding]);
    // * ASSERT
    expect(verdict.status).toBe('INVALID_RED');
    expect(verdict.reasons.length).toBeGreaterThan(0);
  });

  it.each([
    ['missing named test', (run) => (run.tests = [])],
    ['skipped named test', (run) => (run.tests[0].status = 'skipped')],
    ['unrelated failure', (run) => run.tests.push({ ...assertion, id: 'b::other', file: 'b', name: 'other' })],
    [
      'unrelated skip',
      (run) => run.tests.push({ ...assertion, id: 'b::other', file: 'b', name: 'other', status: 'skipped' }),
    ],
    ['passed result carrying a failure', (run) => (run.tests[0].failureKind = 'assertion')],
  ])('rejects GREEN with %s', (_, change) => {
    // * ARRANGE
    const run = green();
    change(run);
    // * ACT / ASSERT
    expect(judgeGreen(run, [binding]).status).toBe('INVALID_GREEN');
  });

  it.each([
    ['incomplete report', (run) => (run.complete = false)],
    ['infrastructure error', (run) => run.errors.push({ kind: 'setup', message: 'fixture crashed' })],
    ['signal or timeout exit', (run) => (run.exitCode = null)],
    ['abnormal failing exit', (run) => (run.exitCode = 2)],
    ['duplicate ID', (run) => run.tests.push({ ...run.tests[0] })],
    ['ambiguous ID', (run) => (run.tests[0].name = 'different name')],
    ['invalid test status', (run) => (run.tests[0].status = 'unknown')],
    ['missing errors', (run) => delete run.errors],
    ['missing test data', (run) => (run.tests = null)],
  ])('rejects both verdicts with %s', (_, change) => {
    // * ARRANGE
    const redRun = red();
    const greenRun = green();
    change(redRun);
    change(greenRun);
    // * ACT / ASSERT
    expect(judgeRed(redRun, [binding]).status).toBe('INVALID_RED');
    expect(judgeGreen(greenRun, [binding]).status).toBe('INVALID_GREEN');
  });

  it.each([
    null,
    [],
    [binding, binding],
    [{ ...binding, criteria: [] }],
    [{ ...binding, criteria: ['restated criterion'] }],
    [{ ...binding, id: 'not the named test' }],
    [{ ...binding, name: '' }],
  ])('rejects missing or ambiguous criterion bindings: %j', (bindings) => {
    // * ARRANGE / ACT / ASSERT
    expect(judgeRed(red(), bindings).status).toBe('INVALID_RED');
    expect(judgeGreen(green(), bindings).status).toBe('INVALID_GREEN');
  });

  it('allows unrelated passes without confusing same-named tests in different files', () => {
    // * ARRANGE
    const extra = { ...green().tests[0], id: `b::${binding.name}`, file: 'b' };
    const redRun = red();
    const greenRun = green();
    redRun.tests.push(extra);
    greenRun.tests.push(extra);
    // * ACT / ASSERT
    expect(judgeRed(redRun, [binding]).status).toBe('RED');
    expect(judgeGreen(greenRun, [binding]).status).toBe('GREEN');
  });

  it('requires every named target to fail, not merely one failing test in its suite', () => {
    // * ARRANGE
    const second = { ...binding, id: 'b::second', file: 'b', name: 'second' };
    const run = red();
    run.tests.push({ ...green().tests[0], id: second.id, file: second.file, name: second.name });
    // * ACT / ASSERT
    expect(judgeRed(run, [binding, second]).status).toBe('INVALID_RED');
  });

  it.each([null, {}, { tests: [null] }])('fails closed on malformed input %j', (run) => {
    // * ARRANGE / ACT / ASSERT
    expect(judgeRed(run, [binding]).status).toBe('INVALID_RED');
    expect(judgeGreen(run, [binding]).status).toBe('INVALID_GREEN');
  });

  it('does not mutate frozen evidence or bindings', () => {
    // * ARRANGE
    const run = Object.freeze({ ...red(), tests: Object.freeze([Object.freeze({ ...assertion })]) });
    const bindings = Object.freeze([Object.freeze({ ...binding, criteria: Object.freeze([...binding.criteria]) })]);
    // * ACT / ASSERT
    expect(judgeRed(run, bindings).status).toBe('RED');
  });
});
