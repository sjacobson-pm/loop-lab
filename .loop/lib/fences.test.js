// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { auditWrites, classifyPaths } from './fences.mjs';

const policy = {
  leg: 'implement',
  declaredFiles: ['src/a.js', 'src/a.test.js'],
  testFiles: ['src/a.test.js'],
  protectedFiles: ['.loop/targets.json', 'vite.config.js'],
};
describe('classifyPaths', () => {
  it('uses the supplied shared matcher, not a second glob implementation', () => {
    // * ARRANGE / ACT
    const result = classifyPaths(
      ['src/a.test.js', 'src/a.js'],
      ['*.test.js'],
      (file, patterns) => patterns.includes('*.test.js') && file.endsWith('.test.js')
    );
    // * ASSERT
    expect(result).toEqual({ test: ['src/a.test.js'], source: ['src/a.js'] });
  });
});
describe('auditWrites', () => {
  it.each([
    ['implement', 'src/a.js', []],
    ['test', 'src/a.test.js', []],
    ['implement', 'src/a.test.js', ['test_fence']],
    ['test', 'src/a.js', ['source_fence']],
    ['implement', 'src/new.js', ['undeclared']],
    ['test', 'src/new.test.js', ['undeclared']],
    ['review', 'src/a.js', ['review_write']],
    ['implement', '.loop/targets.json', ['protected']],
  ])('enforces %s ownership on %s', (leg, file, codes) => {
    // * ARRANGE / ACT
    const violations = auditWrites({ ...policy, leg, changes: [{ path: file, status: 'modified' }] });
    // * ASSERT
    expect(violations.map(({ code }) => code)).toEqual(codes);
  });
  it('includes the old test endpoint when an implementer renames it into source', () => {
    // * ARRANGE / ACT
    const violations = auditWrites({
      ...policy,
      changes: [{ status: 'renamed', oldPath: 'src/a.test.js', path: 'src/a.js' }],
    });
    // * ASSERT
    expect(violations).toEqual([{ code: 'test_fence', path: 'src/a.test.js' }]);
  });
  it('permits only the exact decomposition output, even under protected .loop', () => {
    // * ARRANGE
    const config = {
      ...policy,
      leg: 'decompose',
      declaredFiles: ['.loop/plans/42.plan.json'],
      protectedFiles: ['.loop/plans/42.plan.json', '.loop/targets.json'],
    };
    // * ACT / ASSERT
    expect(auditWrites({ ...config, changes: [{ path: '.loop/plans/42.plan.json' }] })).toEqual([]);
    expect(auditWrites({ ...config, changes: [{ path: '.loop/targets.json' }] })).toEqual([
      { code: 'protected', path: '.loop/targets.json' },
    ]);
  });
  it('rejects unknown legs and missing audit evidence', () => {
    // * ARRANGE / ACT / ASSERT
    expect(() => auditWrites({ ...policy, leg: 'unknown', changes: [] })).toThrow();
    expect(auditWrites({ ...policy, changes: null })).toEqual([{ code: 'incomplete_evidence', path: null }]);
  });
});
