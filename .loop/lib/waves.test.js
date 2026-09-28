// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { computeWaves } from './waves.mjs';

const task = (id, depends_on = [], files_modified = []) => ({ id, depends_on, files_modified });

describe('computeWaves', () => {
  it('partitions within dependency levels and never advances a dependent across a level barrier', () => {
    // * ARRANGE
    const tasks = [
      task('A', [], ['src/shared.js']),
      task('B', [], ['src/shared.js']),
      task('C', [], ['src/other.js']),
      task('D', ['A'], ['src/d.js']),
    ];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([['A', 'C'], ['B'], ['D']]);
  });

  it('uses greedy first-fit rather than placing a task only against the last stage', () => {
    // * ARRANGE
    const tasks = [task('A', [], ['a']), task('B', [], ['a', 'b']), task('C', [], ['b']), task('D', [], ['a', 'b'])];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([['A', 'C'], ['B'], ['D']]);
  });

  it('checks the union of every file in an existing stage', () => {
    // * ARRANGE
    const tasks = [task('A', [], ['a']), task('B', [], ['b']), task('C', [], ['b'])];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([['A', 'B'], ['C']]);
  });

  it('coalesces empty file declarations into the first stage in stable input order', () => {
    // * ARRANGE
    const tasks = [task('empty-first'), task('A', [], ['a']), task('B', [], ['a']), task('empty-last')];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([['empty-first', 'A', 'empty-last'], ['B']]);
  });

  it('compares paths using exact strings without case, separator, dot-segment, or Unicode normalization', () => {
    // * ARRANGE
    const tasks = [
      task('slash', [], ['src/a.js']),
      task('backslash', [], ['src\\a.js']),
      task('case', [], ['src/A.js']),
      task('dot', [], ['./src/a.js']),
      task('composed', [], ['src/\u00e9.js']),
      task('decomposed', [], ['src/e\u0301.js']),
      task('same', [], ['src/a.js']),
    ];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([['slash', 'backslash', 'case', 'dot', 'composed', 'decomposed'], ['same']]);
  });

  it('treats repeated file entries as one claim rather than a self-conflict', () => {
    // * ARRANGE
    const tasks = [task('A', [], ['a', 'a']), task('B', [], ['b']), task('C', [], ['a'])];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([['A', 'B'], ['C']]);
  });

  it('orders a diamond and a transitive dependency by maximum parent depth', () => {
    // * ARRANGE
    const tasks = [task('D', ['B', 'C', 'A']), task('C', ['A']), task('A'), task('B', ['A']), task('E', ['D'])];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([['A'], ['C', 'B'], ['D'], ['E']]);
  });

  it('preserves input order within a level even when Kahn releases tasks in a different order', () => {
    // * ARRANGE
    const tasks = [task('first', ['root-B']), task('second', ['root-A']), task('root-A'), task('root-B')];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([
      ['root-A', 'root-B'],
      ['first', 'second'],
    ]);
  });

  it('handles disconnected components and permits file reuse after a dependency barrier', () => {
    // * ARRANGE
    const tasks = [task('A', [], ['shared']), task('B', ['A'], ['shared']), task('X'), task('Y', ['X'])];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([
      ['A', 'X'],
      ['B', 'Y'],
    ]);
  });

  it('returns no waves for no tasks and one wave for a singleton', () => {
    // * ARRANGE / ACT / ASSERT
    expect(computeWaves([])).toEqual([]);
    expect(computeWaves([task('only')])).toEqual([['only']]);
  });

  it('does not mutate frozen input or share mutable output across calls', () => {
    // * ARRANGE
    const tasks = Object.freeze([
      Object.freeze(task('A', Object.freeze([]), Object.freeze(['shared']))),
      Object.freeze(task('B', Object.freeze(['A']), Object.freeze(['shared']))),
    ]);
    // * ACT
    const first = computeWaves(tasks);
    first[0].push('caller-only');
    // * ASSERT
    expect(computeWaves(tasks)).toEqual([['A'], ['B']]);
    expect(tasks).toEqual([task('A', [], ['shared']), task('B', ['A'], ['shared'])]);
  });

  it.each([undefined, null, {}, 'tasks'])('rejects a nonarray task collection: %j', (tasks) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => computeWaves(tasks)).toThrow(/tasks.*array/i);
  });

  it.each([
    null,
    undefined,
    {},
    { id: '' },
    { id: '   ' },
    { id: 1 },
    task('A', null),
    task('A', 'B'),
    task('A', [null]),
    task('A', ['']),
    task('A', [' ']),
    task('A', [42]),
    task('A', [], null),
    task('A', [], 'a'),
    task('A', [], [null]),
    task('A', [], [42]),
    task('A', [], ['']),
  ])('rejects malformed task data: %j', (value) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => computeWaves([value])).toThrow(/task|depends_on|files_modified/i);
  });

  it('rejects duplicate IDs instead of silently overwriting one graph node', () => {
    // * ARRANGE / ACT / ASSERT
    expect(() => computeWaves([task('A'), task('A')])).toThrow(/duplicate.*A/i);
  });

  it('rejects unknown dependencies instead of incorrectly promoting their dependents to roots', () => {
    // * ARRANGE / ACT / ASSERT
    expect(() => computeWaves([task('A', ['missing'])])).toThrow(/A.*unknown.*missing/i);
  });

  it('rejects self-dependencies explicitly', () => {
    // * ARRANGE / ACT / ASSERT
    expect(() => computeWaves([task('A', ['A'])])).toThrow(/self.*A/i);
  });

  it('rejects repeated dependency edges', () => {
    // * ARRANGE / ACT / ASSERT
    expect(() => computeWaves([task('A'), task('B', ['A', 'A'])])).toThrow(/duplicate.*depend.*B/i);
  });

  it('reports cyclic and downstream blocked tasks rather than returning a runnable partial plan', () => {
    // * ARRANGE
    const tasks = [task('root'), task('A', ['B']), task('B', ['A']), task('C', ['B'])];
    // * ACT / ASSERT
    expect(() => computeWaves(tasks)).toThrow(/cycle.*A, B, C/i);
  });

  it('preserves task identity without prototype-key collisions', () => {
    // * ARRANGE
    const tasks = [task('__proto__'), task('constructor', ['__proto__'])];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([['__proto__'], ['constructor']]);
  });

  it('schedules each task once, dependencies strictly earlier, and disjoint files across a larger DAG', () => {
    // * ARRANGE
    const tasks = Array.from({ length: 40 }, (_, i) =>
      task(
        `T${i}`,
        i < 4 ? [] : [`T${i - 4}`, ...(i % 3 === 0 ? [`T${i - 1}`] : [])],
        i % 7 === 0 ? [] : [`file-${i % 5}`, `other-${i % 3}`]
      )
    );
    const frozenBefore = JSON.stringify(tasks);
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves.flat().sort()).toEqual(tasks.map(({ id }) => id).sort());
    const waveOf = new Map(waves.flatMap((ids, wave) => ids.map((id) => [id, wave])));
    for (const current of tasks) {
      for (const dependency of current.depends_on) {
        expect(waveOf.get(dependency)).toBeLessThan(waveOf.get(current.id));
      }
    }
    for (const ids of waves) {
      const paths = ids.flatMap((id) => tasks.find((current) => current.id === id).files_modified);
      expect(new Set(paths).size).toBe(paths.length);
    }
    expect(JSON.stringify(tasks)).toBe(frozenBefore);
    expect(computeWaves(tasks)).toEqual(waves);
  });
});
