// @vitest-environment node
import { realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as fences from './fences.mjs';

const { auditWrites, classifyPaths } = fences;

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

  describe('collapsed task denials', () => {
    it('covers every old exact denial in an installed issue-sized tree with bounded rules', () => {
      const root = path.join(realpathSync.native(os.tmpdir()), 'loop-leg-ABC123', 'worktree');
      const protectedFiles = [
        ...Array.from({ length: 80 }, (_, i) => `.loop/guard-${i}.json`),
        '.loop/task-context.json',
        'spec/session-readouts-acceptance.html',
        'README.md',
        'package.json',
        ...Array.from({ length: 1343 }, (_, i) => `node_modules/package-${i}/package.json`),
        'node_modules/tool/config.js',
      ];
      const deniedPaths = [
        path.join(root, 'src', 'formatSessionCount.js'),
        ...protectedFiles.map((file) => path.join(root, file)),
      ];
      const rules = fences.collapseTaskDenyPaths({
        root,
        protectedFiles,
        deniedPaths,
        declaredFiles: ['src/formatSessionCount.js', 'src/formatSessionCount.test.js'],
        contextPath: '.loop/task-context.json',
        specPath: 'spec/session-readouts-acceptance.html',
      });

      expect(rules).toHaveLength(86);
      expect(rules).toContain('package.json');
      expect(rules).toContain('config.js');
      expect(rules).toContain('README.md');
      expect(rules).toContain(path.join(root, '.loop', 'task-context.json'));
      expect(rules).toContain(path.join(root, 'spec', 'session-readouts-acceptance.html'));
      for (const oldPath of deniedPaths) {
        expect(rules.some((rule) => (path.isAbsolute(rule) ? rule === oldPath : rule === path.basename(oldPath)))).toBe(
          true
        );
      }
      const prompt = 'Read harness input from .loop/task-context.json.';
      const argv = ['-p', prompt, '-C', root, ...rules.flatMap((rule) => ['--deny-tool', `write(${rule})`])];
      const length = ['copilot', ...argv].reduce((n, arg) => n + arg.length + 3, 260);
      const previousLength = [
        'copilot',
        ...argv.slice(0, 4),
        ...deniedPaths.flatMap((file) => ['--deny-tool', `write(${file})`]),
      ].reduce((n, arg) => n + arg.length + 3, 260);
      expect(previousLength).toBeGreaterThan(32_000);
      expect(length).toBeLessThan(16_000);
    });
    it('rejects a declared file shadowed by a broad basename denial', () => {
      const root = path.join(os.tmpdir(), 'loop-leg-ABC123', 'worktree');
      expect(() =>
        fences.collapseTaskDenyPaths({
          root,
          protectedFiles: ['README.md'],
          deniedPaths: [path.join(root, 'README.md')],
          declaredFiles: ['docs/README.md'],
          contextPath: '.loop/task-context.json',
          specPath: 'spec/x.html',
        })
      ).toThrow(/write\(README\.md\).*docs\/README\.md/);
    });
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
