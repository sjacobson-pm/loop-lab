// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { groupPullRequests, validatePlan, validateRelativePath } from './plan.mjs';

const anchor = 'spec/x.html#rule-a';
const index = { spec_path: 'spec/x.html', criteria: [{ anchor }], context: [{ anchor: 'spec/x.html#scope' }] };
const task = (id, depends_on = [], files_modified = [`src/${id}.js`]) => ({
  id,
  summary: `Deliver ${id}`,
  criteria: [anchor],
  depends_on,
  files_modified,
  public_surface: [],
});
const plan = (tasks = [task('A')]) => ({ issue: 42, target: 'react-vitest', tasks, waves: [['invented']] });

describe('validatePlan', () => {
  it('validates a prose-issue plan and recomputes waves without mutating agent output', () => {
    // * ARRANGE
    const input = plan([task('A'), task('B', ['A'])]);
    const before = structuredClone(input);
    // * ACT
    const result = validatePlan(input, index, ['react-vitest']);
    // * ASSERT
    expect(result.waves).toEqual([['A'], ['B']]);
    expect(input).toEqual(before);
    result.tasks[0].criteria.push('caller mutation');
    expect(input.tasks[0].criteria).toEqual([anchor]);
  });

  it.each([
    null,
    {},
    { ...plan(), issue: 0 },
    { ...plan(), issue: 1.5 },
    { ...plan(), target: 'dotnet-xunit' },
    { ...plan(), tasks: [] },
    { ...plan(), extra: 'criterion prose' },
    plan([{ ...task('A'), summary: '' }]),
    plan([{ ...task('A'), criteria: [] }]),
    plan([{ ...task('A'), criteria: ['spec/x.html#invented'] }]),
    plan([{ ...task('A'), criteria: ['spec/x.html#scope'] }]),
    plan([{ ...task('A'), criteria: [anchor, anchor] }]),
    plan([{ ...task('A'), criterion_text: 'Paraphrase' }]),
    plan([{ ...task('A'), public_surface: null }]),
    plan([{ ...task('A'), files_modified: null }]),
    plan([{ ...task('A'), files_modified: ['src/a.js', 'src/a.js'] }]),
    plan([task('A', [], ['src/a.js']), task('B', [], ['src/A.js'])]),
    plan([task('A', ['missing'])]),
  ])('rejects an invalid plan rather than approving partial work: %j', (input) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => validatePlan(input, index, ['react-vitest'])).toThrow();
  });

  it('allows exact shared ownership but rejects case aliases anywhere in the plan', () => {
    // * ARRANGE / ACT
    const result = validatePlan(plan([task('A', [], ['src/a.js']), task('B', [], ['src/a.js'])]), index, [
      'react-vitest',
    ]);
    // * ASSERT
    expect(result.waves).toEqual([['A'], ['B']]);
  });

  it('validates the declared public surface and its exact owning file', () => {
    // * ARRANGE
    const surface = {
      path: 'src/A.js',
      language: 'javascript',
      namespace: null,
      type: 'module',
      member: 'read',
      return_type: 'number',
      parameters: [{ name: 'id', type: 'string' }],
    };
    const input = plan([{ ...task('A'), public_surface: [surface] }]);
    // * ACT / ASSERT
    expect(validatePlan(input, index, ['react-vitest']).tasks[0].public_surface).toEqual([surface]);
    for (const invalid of [
      null,
      { ...surface, path: 'src/outside.js' },
      { ...surface, member: '' },
      { ...surface, namespace: 42 },
      { ...surface, parameters: null },
      { ...surface, parameters: [{ name: 'id', type: '' }] },
      {
        ...surface,
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'id', type: 'number' },
        ],
      },
    ]) {
      expect(() =>
        validatePlan(plan([{ ...task('A'), public_surface: [invalid] }]), index, ['react-vitest'])
      ).toThrow();
    }
  });
});

describe('validateRelativePath', () => {
  it.each(['src/a.js', 'src/nested/a.test.jsx', '.loop/plans/42.plan.json'])(
    'accepts literal canonical paths: %s',
    (path) => {
      // * ARRANGE / ACT / ASSERT
      expect(validateRelativePath(path)).toBe(path);
    }
  );
  it.each([
    null,
    '',
    ' ',
    'src\\a.js',
    '../outside',
    '/absolute',
    'C:/outside',
    'src/../a.js',
    'src/./a.js',
    'src//a.js',
    'src/*.js',
    'src/[a].js',
    '.git/config',
    'src/.git/config',
    'src/a.js ',
    'src/AUX.js',
    'src/a:stream',
    'src/a\0.js',
    'src/a\n.js',
    'src/CON',
    'src/a.',
    'src/(ambiguous).js',
  ])('rejects ambiguous or unsafe declarations: %j', (path) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => validateRelativePath(path)).toThrow(/path/i);
  });
});

describe('groupPullRequests', () => {
  it('uses undirected dependency connectivity with stable component and member order', () => {
    // * ARRANGE
    const tasks = [
      task('D', ['B', 'C']),
      task('X'),
      task('A'),
      task('B', ['A']),
      task('C', ['A']),
      task('Y', ['X']),
      task('Z'),
    ];
    // * ACT
    const groups = groupPullRequests(tasks);
    // * ASSERT
    expect(groups).toEqual([['D', 'A', 'B', 'C'], ['X', 'Y'], ['Z']]);
  });
  it('does not merge dependency-independent components just because they share a file', () => {
    // * ARRANGE / ACT / ASSERT
    expect(groupPullRequests([task('A', [], ['shared']), task('B', [], ['shared'])])).toEqual([['A'], ['B']]);
    expect(groupPullRequests([])).toEqual([]);
  });
  it('rejects invalid DAGs before grouping', () => {
    // * ARRANGE / ACT / ASSERT
    expect(() => groupPullRequests([task('A', ['missing'])])).toThrow(/unknown/i);
  });
});
