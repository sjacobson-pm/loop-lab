import { writeFile } from 'node:fs/promises';

function describeError(error) {
  const boundary = (typeof error.stack === 'string' ? error.stack : '')
    .split('\n')
    .filter((line) => line.replaceAll('\\', '/').includes('/node_modules/@vitest/runner/'))
    .map((line) => line.match(/\bat (?:async )?(runTest|callCleanupHooks|callTestHooks|callSuiteHook|runHook)\s*\(/))
    .find(Boolean)?.[1];
  return {
    name: typeof error.name === 'string' ? error.name : 'UnknownError',
    message: error.message,
    hasComparison: Object.hasOwn(error, 'actual') && Object.hasOwn(error, 'expected'),
    origin: boundary === 'runTest' ? 'test' : boundary ? 'hook' : 'unknown',
  };
}

/** Supplement stock JSON's formatted failure strings with runner-owned error fields. */
export default class LoopReporter {
  onInit(context) {
    if (typeof context.config.outputFile !== 'string' || !context.config.outputFile)
      throw new Error('Loop reporter requires a harness-owned outputFile.');
    this.output = `${context.config.outputFile}.loop.json`;
  }

  async onFinished(files, unhandledErrors) {
    const tests = [];
    const suites = { total: 0, passed: 0, failed: 0, pending: 0 };
    const errors = unhandledErrors.map(describeError);
    function visit(task, file, parents) {
      for (const [hook, state] of Object.entries(task.result?.hooks ?? {})) {
        if (state !== 'pass')
          errors.push({
            name: 'HookError',
            message: `${hook} did not complete for ${task.name}`,
            hasComparison: false,
            origin: 'hook',
          });
      }
      if (task.type === 'test') {
        tests.push({
          file,
          name: [...parents, task.name].join(' '),
          state: task.result?.state ?? task.mode ?? 'run',
          errors: (task.result?.errors ?? []).map(describeError),
        });
      } else {
        suites.total += 1;
        if (task.result?.state === 'fail') suites.failed += 1;
        if (task.result?.state === 'run' || task.result?.state === 'queued' || task.mode === 'todo')
          suites.pending += 1;
        errors.push(...(task.result?.errors ?? []).map(describeError));
        for (const child of task.tasks) visit(child, file, task.filepath ? parents : [...parents, task.name]);
      }
    }
    for (const file of files) visit(file, file.filepath, []);
    suites.passed = suites.total - suites.failed - suites.pending;
    await writeFile(this.output, JSON.stringify({ schema: 1, suites, tests, errors }), { flag: 'wx' });
  }
}
