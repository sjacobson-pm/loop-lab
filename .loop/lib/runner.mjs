import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeCommand, MAX_COMMAND_TIMEOUT_MS } from './process.mjs';
import { parseVitestResults } from './vitest-results.mjs';

const isArgv = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((part) => typeof part === 'string' && part.length > 0 && !part.includes('\0'));
const invalid = (kind, message, exitCode = null) => ({
  exitCode,
  complete: false,
  tests: [],
  errors: [{ kind, message }],
});

/** Install only at the baseline boundary; every test run gets fresh, single-use report files. */
export async function runTarget({ target, cwd, phase, signal }, processPort = executeCommand) {
  if (
    target?.exercised !== true ||
    !Number.isSafeInteger(target.command_timeout_ms) ||
    target.command_timeout_ms <= 0 ||
    target.command_timeout_ms > MAX_COMMAND_TIMEOUT_MS ||
    target.results_format !== 'vitest-json' ||
    !['baseline', 'red', 'green', 'integration'].includes(phase) ||
    !isArgv(target.install) ||
    !isArgv(target.test) ||
    !(target.build === null || isArgv(target.build)) ||
    target.red_policy?.require_named_assertion_failure !== true ||
    target.red_policy?.allow_unrelated_failures !== false ||
    !target.test.includes('--reporter=json') ||
    target.test.join('\0').match(/\{\{results\}\}/g)?.length !== 1 ||
    /\{\{[^}]*\}\}/.test(target.test.join('\0').replace('{{results}}', ''))
  )
    return invalid('configuration', 'Unsupported target, policy, phase, or results placeholder.');
  let directory;
  let stage = 'configuration';
  let result;
  let commandResult;
  try {
    const root = await realpath(cwd);
    directory = await mkdtemp(path.join(os.tmpdir(), 'loop-results-'));
    directory = await realpath(directory);
    const report = path.join(directory, 'results.json');
    const command = async (argv, kind) => {
      stage = kind;
      commandResult = await processPort(argv, { cwd: root, timeoutMs: target.command_timeout_ms, signal });
      if (!Array.isArray(commandResult?.errors)) throw new Error('Command returned incomplete process evidence.');
      if (
        commandResult.errors.length ||
        (commandResult.exitCode !== 0 && !(kind === 'test' && commandResult.exitCode === 1))
      )
        throw new Error(
          `${kind} exited ${commandResult.exitCode}: ${commandResult.errors.map(({ message }) => message).join('; ')} ${commandResult.stderr}`
        );
      return commandResult;
    };
    if (phase === 'baseline') await command(target.install, 'install');
    if (target.build !== null) await command(target.build, 'build');
    const argv = target.test.map((part) => part.replace('{{results}}', report));
    argv.push(`--reporter=${fileURLToPath(new URL('./vitest-reporter.mjs', import.meta.url))}`);
    const outcome = await command(argv, 'test');
    stage = 'report';
    const json = await readFile(report, 'utf8');
    const evidence = await readFile(`${report}.loop.json`, 'utf8');
    result = parseVitestResults(json, { ...outcome, evidence }, root);
  } catch (error) {
    result = invalid(stage, error.message, commandResult?.exitCode ?? null);
  } finally {
    if (directory) {
      try {
        await rm(directory, { recursive: true, force: true });
      } catch (error) {
        result.complete = false;
        result.errors.push({ kind: 'cleanup', message: `Cannot remove ${directory}: ${error.message}` });
      }
    }
  }
  return result;
}
