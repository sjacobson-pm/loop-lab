import { execFile, spawn as nodeSpawn } from 'node:child_process';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { promisify } from 'node:util';

export const MAX_COMMAND_TIMEOUT_MS = 2_147_483_647;

async function terminateTree(child) {
  if (process.platform === 'win32')
    await promisify(execFile)('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
  else process.kill(-child.pid, 'SIGKILL');
}

/** Supervised command execution; resolves only after process/stdio closure and termination cleanup. */
export async function executeCommand(
  argv,
  { cwd, timeoutMs = 300_000, maxOutputBytes = 8 * 1024 * 1024, signal, env = process.env },
  { spawn = nodeSpawn, terminate = terminateTree } = {}
) {
  if (
    !Array.isArray(argv) ||
    !argv.length ||
    argv.some((value) => typeof value !== 'string' || value.includes('\0')) ||
    !argv[0]
  )
    throw new Error('Invalid command argv.');
  if (
    typeof cwd !== 'string' ||
    !path.isAbsolute(cwd) ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > MAX_COMMAND_TIMEOUT_MS ||
    !Number.isSafeInteger(maxOutputBytes) ||
    maxOutputBytes <= 0
  )
    throw new Error('Invalid command directory or limits.');
  const result = {
    exitCode: null,
    signal: null,
    timedOut: false,
    startedAt: Date.now(),
    finishedAt: null,
    stdout: '',
    stderr: '',
    errors: [],
  };
  if (signal?.aborted) {
    result.errors.push({ kind: 'cancelled', message: 'Command cancelled before dispatch.' });
    result.finishedAt = Date.now();
    return result;
  }
  let [executable, ...args] = argv;
  if (executable === 'node') executable = process.execPath;
  if (['npm', 'npx'].includes(executable) && process.platform === 'win32') {
    const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', `${executable}-cli.js`);
    args = [cli, ...(executable === 'npx' ? ['--no-install'] : []), ...args];
    executable = process.execPath;
  } else if (executable === 'npx') args.unshift('--no-install');
  if (/\.(cmd|bat|ps1)$/i.test(executable))
    throw new Error('Command shims are not shell-free executables; use npm/npx or a native executable.');

  let termination;
  let closed = false;
  await new Promise((resolve) => {
    let child;
    let timer;
    const stop = (kind, message) => {
      if (closed || termination) return;
      result.errors.push({ kind, message });
      if (kind === 'timeout') result.timedOut = true;
      termination = Promise.resolve()
        .then(() => terminate(child))
        .catch((error) => {
          result.errors.push({ kind: 'termination', message: error.message });
        });
    };
    const cancel = () => stop('cancelled', 'Command cancelled during execution.');
    const parentExit = () => {
      if (process.platform !== 'win32' && !closed) {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') process.stderr.write(`Command cleanup failed: ${error.message}\n`);
        }
      }
    };
    try {
      child = spawn(executable, args, {
        cwd,
        env,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        // A supervised POSIX process group lets cancellation kill descendants, not just npm.
        detached: process.platform !== 'win32',
      });
    } catch (error) {
      result.errors.push({ kind: 'spawn', message: error.message });
      resolve();
      return;
    }
    const decoders = { stdout: new StringDecoder('utf8'), stderr: new StringDecoder('utf8') };
    let bytes = 0;
    for (const stream of ['stdout', 'stderr']) {
      child[stream].on('data', (chunk) => {
        const buffer = Buffer.from(chunk);
        const remaining = Math.max(0, maxOutputBytes - bytes);
        result[stream] += decoders[stream].write(buffer.subarray(0, remaining));
        bytes += buffer.length;
        if (bytes > maxOutputBytes) stop('output_limit', 'Command output exceeded its byte limit.');
      });
    }
    child.on('error', (error) => result.errors.push({ kind: 'spawn', message: error.message }));
    child.once('close', (code, childSignal) => {
      closed = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      process.removeListener('exit', parentExit);
      result.exitCode = code;
      result.signal = childSignal ?? null;
      for (const stream of ['stdout', 'stderr']) result[stream] += decoders[stream].end();
      resolve();
    });
    process.once('exit', parentExit);
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => stop('timeout', 'Command exceeded its deadline.'), timeoutMs);
    if (signal?.aborted) cancel();
  });
  await termination;
  result.finishedAt = Date.now();
  return result;
}
