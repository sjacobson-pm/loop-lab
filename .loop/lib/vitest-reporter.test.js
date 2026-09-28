// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import LoopReporter from './vitest-reporter.mjs';

describe('harness assertion evidence reporter', () => {
  it.each([
    { state: 'run', pending: 1 },
    { state: 'queued', pending: 1 },
    { state: 'skip', pending: 0 },
    { mode: 'skip', pending: 0 },
    { mode: 'todo', pending: 1 },
  ])('matches measured JSON suite counters for %j', async ({ state, mode, pending }) => {
    // * ARRANGE
    const root = await mkdtemp(path.join(os.tmpdir(), 'loop-reporter-'));
    const reporter = new LoopReporter();
    reporter.onInit({ config: { outputFile: path.join(root, 'results.json') } });
    try {
      // * ACT
      await reporter.onFinished([{ type: 'suite', filepath: 'case.test.js', tasks: [], mode, result: { state } }], []);
      const evidence = JSON.parse(await readFile(reporter.output, 'utf8'));
      // * ASSERT
      expect(evidence.suites).toEqual({ total: 1, passed: 1 - pending, failed: 0, pending });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it.each(['callCleanupHooks', 'callTestHooks', 'runTest'])(
    'records the measured %s runner boundary',
    async (method) => {
      // * ARRANGE
      const root = await mkdtemp(path.join(os.tmpdir(), 'loop-reporter-'));
      const report = path.join(root, 'results.json');
      const reporter = new LoopReporter();
      reporter.onInit({ config: { outputFile: report } });
      try {
        // * ACT
        await reporter.onFinished(
          [
            {
              type: 'suite',
              filepath: 'case.test.js',
              tasks: [
                {
                  type: 'test',
                  name: 'rule-a',
                  result: {
                    state: 'fail',
                    errors: [
                      {
                        name: 'AssertionError',
                        message: 'expected 0 to be 1',
                        actual: 0,
                        expected: 1,
                        stack: `AssertionError: mismatch\n at runTest (src/user.js:1:1)\n at ${method} (file:///repo/node_modules/@vitest/runner/dist/chunk-hooks.js:1:1)\n at runTest (file:///repo/node_modules/@vitest/runner/dist/chunk-hooks.js:2:1)`,
                      },
                    ],
                  },
                },
              ],
            },
          ],
          []
        );
        const evidence = JSON.parse(await readFile(`${report}.loop.json`, 'utf8'));
        // * ASSERT
        expect(evidence.tests[0].errors[0].origin).toBe(method === 'runTest' ? 'test' : 'hook');
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  );
  it('preserves structured assertion errors and suite failures without trusting test metadata', async () => {
    // * ARRANGE
    const root = await mkdtemp(path.join(os.tmpdir(), 'loop-reporter-'));
    const report = path.join(root, 'results.json');
    const reporter = new LoopReporter();
    reporter.onInit({ config: { outputFile: report } });
    const file = {
      type: 'suite',
      name: 'case.test.js',
      filepath: path.join(root, 'case.test.js'),
      result: { state: 'fail', errors: [{ name: 'Error', message: 'afterAll crashed' }] },
      tasks: [
        {
          type: 'suite',
          name: 'rules',
          tasks: [
            {
              type: 'test',
              name: 'rule-a',
              meta: { failureKind: 'assertion' },
              result: {
                state: 'fail',
                errors: [{ name: 'AssertionError', message: 'expected 0 to be 1', actual: 0, expected: 1 }],
              },
            },
            {
              type: 'test',
              name: 'throws',
              result: { state: 'fail', errors: [{ name: 'Error', message: 'AssertionError: fake message' }] },
            },
            {
              type: 'test',
              name: 'skips',
              mode: 'skip',
            },
          ],
        },
      ],
    };
    try {
      // * ACT
      await reporter.onFinished([file], [{ name: 'Error', message: 'unhandled rejection' }]);
      const evidence = JSON.parse(await readFile(`${report}.loop.json`, 'utf8'));
      // * ASSERT
      expect(evidence).toEqual({
        schema: 1,
        suites: { total: 2, passed: 1, failed: 1, pending: 0 },
        tests: [
          {
            file: file.filepath,
            name: 'rules rule-a',
            state: 'fail',
            errors: [{ name: 'AssertionError', message: 'expected 0 to be 1', hasComparison: true, origin: 'unknown' }],
          },
          {
            file: file.filepath,
            name: 'rules throws',
            state: 'fail',
            errors: [
              { name: 'Error', message: 'AssertionError: fake message', hasComparison: false, origin: 'unknown' },
            ],
          },
          { file: file.filepath, name: 'rules skips', state: 'skip', errors: [] },
        ],
        errors: [
          { name: 'Error', message: 'unhandled rejection', hasComparison: false, origin: 'unknown' },
          { name: 'Error', message: 'afterAll crashed', hasComparison: false, origin: 'unknown' },
        ],
      });
      await expect(reporter.onFinished([file], [])).rejects.toMatchObject({ code: 'EEXIST' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails explicitly without the harness report destination', () => {
    // * ARRANGE / ACT / ASSERT
    expect(() => new LoopReporter().onInit({ config: {} })).toThrow(/outputFile/);
  });

  it.each(['run', 'fail'])('rejects a hook left %s even when its error resembles a test assertion', async (state) => {
    // * ARRANGE
    const root = await mkdtemp(path.join(os.tmpdir(), 'loop-reporter-'));
    const report = path.join(root, 'results.json');
    const reporter = new LoopReporter();
    reporter.onInit({ config: { outputFile: report } });
    try {
      // * ACT
      await reporter.onFinished(
        [
          {
            type: 'suite',
            filepath: 'case.test.js',
            tasks: [
              {
                type: 'test',
                name: 'rule-a',
                result: {
                  state: 'fail',
                  hooks: { beforeEach: state, afterEach: 'pass' },
                  errors: [{ name: 'AssertionError', message: 'fixture assertion', actual: 0, expected: 1 }],
                },
              },
            ],
          },
        ],
        []
      );
      const evidence = JSON.parse(await readFile(`${report}.loop.json`, 'utf8'));
      // * ASSERT
      expect(evidence.errors).toEqual([
        {
          name: 'HookError',
          message: 'beforeEach did not complete for rule-a',
          hasComparison: false,
          origin: 'hook',
        },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('records empty and not-run tasks rather than inventing assertion failures', async () => {
    // * ARRANGE
    const root = await mkdtemp(path.join(os.tmpdir(), 'loop-reporter-'));
    const report = path.join(root, 'results.json');
    const reporter = new LoopReporter();
    reporter.onInit({ config: { outputFile: report } });
    try {
      // * ACT
      await reporter.onFinished(
        [
          {
            type: 'suite',
            filepath: 'case.test.js',
            tasks: [
              {
                type: 'suite',
                name: 'outer',
                tasks: [
                  {
                    type: 'test',
                    name: 'unrun',
                    result: { state: 'fail', errors: [{ message: 'unknown error' }] },
                  },
                  { type: 'test', name: 'not-run' },
                ],
              },
            ],
          },
        ],
        []
      );
      const evidence = JSON.parse(await readFile(`${report}.loop.json`, 'utf8'));
      // * ASSERT
      expect(evidence.tests[0]).toMatchObject({
        name: 'outer unrun',
        errors: [{ name: 'UnknownError', message: 'unknown error', hasComparison: false }],
      });
      expect(evidence.tests[1]).toMatchObject({ name: 'outer not-run', state: 'run', errors: [] });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
