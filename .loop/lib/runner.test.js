// @vitest-environment node
import { access, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runTarget } from './runner.mjs';
import { judgeGreen, judgeRed } from './results.mjs';

vi.mock('node:fs/promises', async (original) => {
  const fs = await original();
  return { ...fs, rm: vi.fn(fs.rm) };
});

const roots = [];
async function fixture() {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'loop-runner-')));
  roots.push(root);
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  await writeFile(
    path.join(root, 'vitest.config.mjs'),
    'export default {test:{globals:true,environment:"node",include:["case.test.js"]}};'
  );
  return root;
}
afterEach(async () => {
  const results = await Promise.allSettled(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  const failed = results.find(({ status }) => status === 'rejected');
  if (failed) throw failed.reason;
});
const target = () => ({
  exercised: true,
  command_timeout_ms: 900_000,
  install: ['node', '-e', 'process.exit(0)'],
  build: null,
  test: [
    'node',
    fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)),
    'run',
    '--reporter=json',
    '--outputFile={{results}}',
  ],
  results_format: 'vitest-json',
  red_policy: { require_named_assertion_failure: true, allow_unrelated_failures: false },
});
const binding = { id: 'case.test.js::rule-a', file: 'case.test.js', name: 'rule-a', criteria: ['spec/x.html#rule-a'] };

describe('trusted target runner', { timeout: 30_000 }, () => {
  it('invalidates otherwise-green evidence when report cleanup fails', async () => {
    // * ARRANGE
    const root = await fixture();
    await writeFile(path.join(root, 'case.test.js'), 'it("rule-a",()=>expect(1).toBe(1));');
    const fs = await vi.importActual('node:fs/promises');
    let reportDirectory;
    vi.mocked(rm).mockImplementation(async (directory, options) => {
      if (path.basename(directory).startsWith('loop-results-')) {
        reportDirectory = directory;
        throw new Error('cleanup fixture locked');
      }
      return fs.rm(directory, options);
    });
    try {
      // * ACT
      const run = await runTarget({ target: target(), cwd: root, phase: 'green' });
      // * ASSERT
      expect(run.complete).toBe(false);
      expect(run.errors).toContainEqual({
        kind: 'cleanup',
        message: expect.stringContaining('cleanup fixture locked'),
      });
      expect(judgeGreen(run, [binding]).status).toBe('INVALID_GREEN');
    } finally {
      vi.mocked(rm).mockImplementation(fs.rm);
      if (reportDirectory) await fs.rm(reportDirectory, { recursive: true, force: true });
    }
  });
  it('surfaces absent worktrees, invalid phases, incomplete command outcomes, and process diagnostics', async () => {
    // * ARRANGE
    const root = await fixture();
    // * ACT / ASSERT
    expect(
      (await runTarget({ target: target(), cwd: path.join(root, 'missing'), phase: 'green' })).errors[0].kind
    ).toBe('configuration');
    expect((await runTarget({ target: target(), cwd: root, phase: 'unknown' })).errors[0].kind).toBe('configuration');
    for (const outcome of [undefined, { exitCode: null, errors: [{ message: 'command deadline' }], stderr: '' }]) {
      const run = await runTarget({ target: target(), cwd: root, phase: 'red' }, async () => outcome);
      expect(run.complete).toBe(false);
      expect(run.errors[0].kind).toBe('test');
    }
  });
  it('extends only the exercised React profile with the strict RED policy', async () => {
    // * ARRANGE / ACT
    const profiles = JSON.parse(await readFile(new URL('../targets.json', import.meta.url), 'utf8')).targets;
    // * ASSERT
    expect(profiles['react-vitest']).toMatchObject({
      exercised: true,
      command_timeout_ms: 900_000,
      install: ['npm', 'ci'],
      build: null,
      results_format: 'vitest-json',
      red_policy: { require_named_assertion_failure: true, allow_unrelated_failures: false },
    });
    expect(profiles['dotnet-xunit'].exercised).toBe(false);
  });
  it.each([
    ['pass', 'it("rule-a",()=>expect(1).toBe(1));', 'INVALID_RED', 'GREEN'],
    ['assertion', 'it("rule-a",()=>expect(0).toBe(1));', 'RED', 'INVALID_GREEN'],
    ['runtime', 'it("rule-a",()=>{throw new Error("crashed")});', 'INVALID_RED', 'INVALID_GREEN'],
    [
      'setup',
      'beforeAll(()=>{throw new Error("fixture")});it("rule-a",()=>expect(0).toBe(1));',
      'INVALID_RED',
      'INVALID_GREEN',
    ],
    ['import', 'import "./missing.js";it("rule-a",()=>expect(0).toBe(1));', 'INVALID_RED', 'INVALID_GREEN'],
    ['empty', '', 'INVALID_RED', 'INVALID_GREEN'],
    ['skip', 'it.skip("rule-a",()=>expect(0).toBe(1));', 'INVALID_RED', 'INVALID_GREEN'],
    [
      'hook assertion',
      'beforeEach(()=>expect(0).toBe(1));it("rule-a",()=>expect(1).toBe(1));',
      'INVALID_RED',
      'INVALID_GREEN',
    ],
    [
      'returned cleanup',
      'beforeEach(()=>()=>expect(0).toBe(1));it("rule-a",()=>expect(1).toBe(1));',
      'INVALID_RED',
      'INVALID_GREEN',
    ],
    [
      'finished callback',
      'it("rule-a",({onTestFinished})=>{onTestFinished(()=>expect(0).toBe(1));expect(1).toBe(1)});',
      'INVALID_RED',
      'INVALID_GREEN',
    ],
  ])('runs the real %s case through process, reporters, parser, and verdicts', async (_, source, red, green) => {
    // * ARRANGE
    const root = await fixture();
    await writeFile(path.join(root, 'case.test.js'), source);
    // * ACT
    const run = await runTarget({ target: target(), cwd: root, phase: 'red' });
    // * ASSERT
    expect(run).toMatchObject({ complete: true });
    expect(judgeRed(run, [binding]).status).toBe(red);
    expect(judgeGreen(run, [binding]).status).toBe(green);
  });
  it.each([
    { exercised: false },
    { exercised: 'yes' },
    { results_format: 'trx' },
    { red_policy: null },
    { test: ['npx', 'vitest', 'run'] },
    { test: ['npx', 'vitest', '--outputFile={{results}}', '{{results}}'] },
    { test: ['npx', 'vitest', '--reporter=json', '--outputFile={{results}}', '{{unknown}}'] },
    { red_policy: { require_named_assertion_failure: false, allow_unrelated_failures: false } },
    { red_policy: { require_named_assertion_failure: true, allow_unrelated_failures: true } },
    { install: [] },
    { build: 'npm run build' },
    { command_timeout_ms: undefined },
    { command_timeout_ms: null },
    { command_timeout_ms: 0 },
    { command_timeout_ms: -1 },
    { command_timeout_ms: 1.5 },
    { command_timeout_ms: '900000' },
    { command_timeout_ms: Number.NaN },
    { command_timeout_ms: 2_147_483_648 },
  ])('rejects unsupported or ambiguous target configuration %j', async (change) => {
    // * ARRANGE
    const processPort = vi.fn();
    // * ACT
    const run = await runTarget(
      { target: { ...target(), ...change }, cwd: process.cwd(), phase: 'baseline' },
      processPort
    );
    // * ASSERT
    expect(run.complete).toBe(false);
    expect(run.errors[0].kind).toBe('configuration');
    expect(processPort).not.toHaveBeenCalled();
  });
  it('passes the target timeout to install, build, and test without using the five-minute default', async () => {
    const root = await fixture();
    const calls = [];
    const configured = { ...target(), build: ['node', '-e', 'process.exit(0)'] };
    const processPort = async (argv, options) => {
      calls.push({ argv, timeoutMs: options.timeoutMs });
      return { exitCode: 0, errors: [], stderr: '' };
    };
    const baseline = await runTarget({ target: configured, cwd: root, phase: 'baseline' }, processPort);
    expect(baseline.errors[0].kind).toBe('report');
    expect(calls.map(({ timeoutMs }) => timeoutMs)).toEqual([900_000, 900_000, 900_000]);
    expect(calls[0].argv).toEqual(configured.install);
    expect(calls[1].argv).toEqual(configured.build);
    expect(calls[2].argv.slice(0, -1)).toEqual(
      configured.test.map((part) => (part.includes('{{results}}') ? expect.stringMatching(/results\.json$/) : part))
    );
    calls.length = 0;
    await runTarget({ target: configured, cwd: root, phase: 'green' }, processPort);
    expect(calls.map(({ timeoutMs }) => timeoutMs)).toEqual([900_000, 900_000]);
  });
  it('runs install/build only as requested and never mistakes installation failure for RED', async () => {
    // * ARRANGE
    const root = await fixture();
    const profile = { ...target(), install: ['node', '-e', 'process.exit(12)'] };
    // * ACT
    const run = await runTarget({ target: profile, cwd: root, phase: 'baseline' });
    // * ASSERT
    expect(run.complete).toBe(false);
    expect(run.errors[0]).toMatchObject({ kind: 'install' });
    expect(judgeRed(run, [binding]).status).toBe('INVALID_RED');
  });
  it('surfaces missing reports, transport exceptions and build failures and cleans their unique report directories', async () => {
    // * ARRANGE
    const root = await fixture();
    const commands = [];
    const processPort = async (argv) => {
      commands.push(argv);
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        errors: [],
        stdout: '',
        stderr: '',
        startedAt: Date.now(),
        finishedAt: Date.now(),
      };
    };
    // * ACT
    const missing = await runTarget({ target: target(), cwd: root, phase: 'baseline' }, processPort);
    await runTarget({ target: target(), cwd: root, phase: 'integration' }, processPort);
    const thrown = await runTarget({ target: target(), cwd: root, phase: 'green' }, async () => {
      throw new Error('transport failed');
    });
    const build = await runTarget({
      target: { ...target(), build: ['node', '-e', 'process.exit(13)'] },
      cwd: root,
      phase: 'green',
    });
    // * ASSERT
    expect(commands[0]).toEqual(target().install);
    expect(missing.errors[0].kind).toBe('report');
    expect(thrown.errors[0]).toMatchObject({ kind: 'test', message: 'transport failed' });
    expect(build.errors[0].kind).toBe('build');
    const report = commands[1].find((arg) => arg.startsWith('--outputFile=')).slice('--outputFile='.length);
    await expect(access(path.dirname(report))).rejects.toMatchObject({ code: 'ENOENT' });
    const secondReport = commands[2].find((arg) => arg.startsWith('--outputFile=')).slice('--outputFile='.length);
    expect(secondReport).not.toBe(report);
    await expect(access(path.dirname(secondReport))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(commands[1].filter((arg) => arg.startsWith('--reporter=')).length).toBe(2);
  });
});
