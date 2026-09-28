// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  beginExecution,
  findingSignature,
  mergeUsage,
  nextRepair,
  normalizeText,
  resolveLimits,
} from './termination.mjs';

const state = (total = 0) => ({ total, cycles: {}, signatures: {} });
const limits = { cycle: 3, total: 15 };
const finding = (message, fault_domain = 'implement', criteria = ['spec/x.html#a']) => ({
  fault_domain,
  code: 'wrong_behavior',
  criteria,
  files: ['src/a.js'],
  message,
});
const repair = (to, message, from = 'review') => ({
  from,
  to,
  findings: [finding(message, to)],
});

describe('failure signature normalization', () => {
  it('collapses paths, locations, qualified timings, GUIDs, mixed hexadecimal IDs, and timestamps', () => {
    // * ARRANGE
    const first = 'at C:\\repo\\a.js:42 took 11ms 123e4567-e89b-12d3-a456-426614174000 ab12cd34 2026-09-24';
    const second = 'at C:\\other\\a.js:99 took 32ms 765e4321-e89b-12d3-a456-426614174000 de34fa56 2026-09-25';
    // * ACT / ASSERT
    expect(normalizeText(first)).toBe(normalizeText(second));
    expect(normalizeText('at /one/two/file.cs:47')).toBe(normalizeText('at /three/four/file.cs:112'));
    expect(normalizeText('at View.razor:47')).toBe(normalizeText('at View.razor:112'));
  });

  it('does not collapse asserted bare numbers, bare durations, or ordinary English words', () => {
    // * ACT / ASSERT
    expect(normalizeText(null)).toBe('');
    expect(normalizeText('expected 100')).not.toBe(normalizeText('expected 101'));
    expect(normalizeText('expected 25m')).not.toBe(normalizeText('expected 30m'));
    expect(normalizeText('failed')).not.toBe(normalizeText('decafed'));
  });

  it('deduplicates and sorts canonical findings without losing leg, code, anchor, or path identity', () => {
    // * ARRANGE
    const a = finding('wrong at src/a.js:42', 'implement', ['spec/x.html#a']);
    const b = finding('different', 'implement', ['spec/x.html#b']);
    // * ACT / ASSERT
    expect(findingSignature('implement', [a, b, a])).toBe(findingSignature('implement', [b, a]));
    expect(findingSignature('implement', [a])).toBe(findingSignature('implement', [finding('wrong at src/a.js:99')]));
    expect(findingSignature('test', [a])).not.toBe(findingSignature('implement', [a]));
    expect(findingSignature('implement', [a])).not.toBe(findingSignature('implement', [b]));
    expect(findingSignature('implement', [a])).not.toBe(
      findingSignature('implement', [{ ...a, code: 'missing_test' }])
    );
    expect(findingSignature('implement', [a])).not.toBe(findingSignature('implement', [{ ...a, files: ['src/b.js'] }]));
    expect(findingSignature('implement', [a])).not.toBe(findingSignature('implement', [{ ...a, files: ['src/A.js'] }]));
  });

  it('rejects missing leg identity and malformed finding fields before hashing', () => {
    // * ACT / ASSERT
    expect(() => findingSignature('review', [finding('bad')])).toThrow(/destination leg/i);
    expect(() => findingSignature('test', [])).toThrow(/findings/i);
    expect(() => findingSignature('implement', [{ ...finding('bad'), criteria: [null] }])).toThrow(/findings/i);
  });
});

describe('repair ordering and execution limits', () => {
  it('resolves target budgets and explicit overrides without silently accepting malformed config', () => {
    // * ACT / ASSERT
    expect(resolveLimits({})).toEqual({ cycle: 3, total: 15 });
    expect(resolveLimits({ budgets: { cycle: 1, total: 2 } })).toEqual({ cycle: 1, total: 2 });
    expect(resolveLimits({ budgets: { cycle: 1, total: 2 } }, { cycle: 0 })).toEqual({ cycle: 0, total: 2 });
    for (const budgets of [null, {}, { cycle: -1, total: 2 }, { cycle: 1, total: 0 }])
      expect(() => resolveLimits({ budgets })).toThrow(/limit|budget/i);
    expect(() => resolveLimits({}, { total: 0 })).toThrow(/limit|budget/i);
  });
  it('breaks an A -> B -> A repeat within the entire destination-leg history before checking exhausted budgets', () => {
    // * ARRANGE
    const a = repair('implement', 'expected 2');
    const b = repair('implement', 'expected 3');
    const first = nextRepair(state(3), a, limits);
    const second = nextRepair(first.state, b, limits);
    // * ACT
    const repeated = nextRepair(second.state, a, { cycle: 2, total: 3 });
    // * ASSERT
    expect([first.decision, second.decision, repeated.decision]).toEqual(['run', 'run', 'park']);
    expect(repeated.reason).toMatch(/repeat|breaker/i);
    expect(repeated.state.cycles['implement<-review']).toBe(2);
    expect(repeated.state.total).toBe(3);
  });

  it('isolates signatures by destination leg and task-local state', () => {
    // * ARRANGE
    const a = repair('implement', 'expected 2');
    const first = nextRepair(state(3), a, limits);
    // * ACT / ASSERT
    expect(nextRepair(first.state, repair('test', 'expected 2'), limits).decision).toBe('run');
    expect(nextRepair(state(3), a, limits).decision).toBe('run');
  });

  it('charges only backward repairs, preserves exact cycle boundaries and leaves rejected repairs uncharged', () => {
    // * ARRANGE
    const first = nextRepair(state(3), repair('test', 'invalid binding', 'test'), { cycle: 1, total: 15 });
    // * ACT
    const exhausted = nextRepair(first.state, repair('test', 'invalid RED', 'test'), { cycle: 1, total: 15 });
    // * ASSERT
    expect(first.decision).toBe('run');
    expect(first.state.cycles['test<-test']).toBe(1);
    expect(exhausted).toMatchObject({ decision: 'park', state: { cycles: { 'test<-test': 1 }, total: 3 } });
    expect(exhausted.reason).toMatch(/cycle/i);
  });

  it('does not authorize a repair when the next agent execution would exceed the total limit', () => {
    // * ACT
    const result = nextRepair(state(15), repair('implement', 'expected 2'), limits);
    // * ASSERT
    expect(result.decision).toBe('park');
    expect(result.reason).toMatch(/total/i);
    expect(result.state.cycles).toEqual({});
  });

  it('counts initial and repaired agent invocations, never deterministic test commands', () => {
    // * ACT
    const first = beginExecution(state(), { cycle: 3, total: 2 });
    const second = beginExecution(first.state, { cycle: 3, total: 2 });
    const exhausted = beginExecution(second.state, { cycle: 3, total: 2 });
    // * ASSERT
    expect([first.decision, second.decision, exhausted.decision]).toEqual(['run', 'run', 'park']);
    expect(exhausted.state.total).toBe(2);
    expect(exhausted.reason).toMatch(/total/i);
  });

  it('rejects malformed limits and state rather than interpreting them as unlimited', () => {
    // * ACT / ASSERT
    expect(() => beginExecution(state(), { cycle: 3, total: 0 })).toThrow(/limit/i);
    expect(() => nextRepair({ total: -1, cycles: {}, signatures: {} }, repair('test', 'x'), limits)).toThrow(/state/i);
    expect(() => nextRepair(state(), null, limits)).toThrow(/repair route/i);
  });
  it('rejects invalid usage rather than reporting it as a measured zero', () => {
    // * ARRANGE
    const current = { counters: [], apiDurationMs: 0, durationMs: 0, complete: true, missingExecutions: 0 };
    // * ACT / ASSERT
    expect(() =>
      mergeUsage(current, { counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: -1 }] })
    ).toThrow(/usage counters/i);
    expect(() => mergeUsage(current, { counters: [], apiDurationMs: -1 })).toThrow(/apiDurationMs/i);
  });
});
