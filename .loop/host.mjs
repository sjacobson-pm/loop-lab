import { execFile, spawn as nodeSpawn } from 'node:child_process';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { promisify } from 'node:util';

const text = (value) => typeof value === 'string' && value.trim().length > 0;
const amount = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

async function terminateProcess(child) {
  if (process.platform === 'win32') {
    await promisify(execFile)('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    child.kill('SIGKILL');
  }
}

function argumentsFor({ prompt, worktree, leg, deniedPaths, profile }) {
  if (!text(prompt) || !path.isAbsolute(worktree) || !['decompose', 'test', 'implement', 'review'].includes(leg)) {
    throw new Error('Invalid agent request');
  }
  if (
    !Array.isArray(deniedPaths) ||
    deniedPaths.some(
      (file) =>
        (!path.isAbsolute(file) && (!text(file) || file === '.' || file === '..' || /[\\/:]/.test(file))) ||
        /[()*?"]/.test(file) ||
        [...file].some((character) => character.codePointAt(0) < 32)
    )
  ) {
    throw new Error('Deny paths must be absolute paths or literal basenames representable in write(path) syntax');
  }
  const argv = [
    '-p',
    prompt,
    '--output-format',
    'json',
    '-C',
    worktree,
    '--available-tools',
    'view',
    'glob',
    'grep',
    ...(leg === 'review' ? [] : ['create', 'edit']),
    '--no-ask-user',
    '--allow-all-tools',
    '--disable-builtin-mcps',
    '--no-custom-instructions',
  ];
  if (leg === 'review') argv.push('--deny-tool', 'write');
  for (const file of new Set(deniedPaths)) argv.push('--deny-tool', `write(${file})`);
  for (const [key, flag] of [
    ['model', '--model'],
    ['reasoningEffort', '--reasoning-effort'],
  ]) {
    if (Object.hasOwn(profile, key)) {
      if (!text(profile[key])) throw new Error(`Invalid profile ${key}`);
      argv.push(flag, profile[key]);
    }
  }
  return argv;
}

/**
 * Spawn one fresh, unattended Copilot context. Completion describes transport only.
 * @returns {Promise<{status:string, sessionId:string|null, exitCode:number|null,
 * messages:string[], toolRequests:object[], reportedWrites:string[]|null, usage:object, diagnostics:object[]}>}
 */
export async function runAgent(request, { spawn = nodeSpawn, terminate = terminateProcess } = {}) {
  const { timeoutMs = 300_000, maxOutputBytes = 8 * 1024 * 1024, executable = 'copilot' } = request;
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    !Number.isSafeInteger(maxOutputBytes) ||
    maxOutputBytes <= 0
  ) {
    throw new Error('Invalid agent timeout or output limit');
  }
  const argv = argumentsFor({ deniedPaths: [], profile: {}, ...request });
  const commandLength = [executable, ...argv].reduce(
    (length, argument) => length + argument.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1').length + 3,
    260
  );
  if (commandLength > 32_000)
    throw new Error(
      'Agent command line exceeds portable Windows limit; shorten context or use trusted file references'
    );
  const outcome = {
    status: 'failed',
    sessionId: null,
    exitCode: null,
    messages: [],
    toolRequests: [],
    reportedWrites: null,
    usage: { counters: [], apiDurationMs: null, durationMs: null, complete: false, missingExecutions: 1 },
    diagnostics: [],
  };
  const diagnostic = (code, message) => outcome.diagnostics.push({ code, message });
  if (request.signal?.aborted) {
    diagnostic('cancelled', 'Agent cancelled before dispatch');
    return outcome;
  }
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(executable, argv, {
        cwd: request.worktree,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      diagnostic('spawn', error.message);
      resolve(outcome);
      return;
    }
    let result = null;
    let pending = '';
    let bytes = 0;
    let stderr = '';
    let stopped = false;
    let closed = false;
    const decoder = new StringDecoder('utf8');
    const stop = () => {
      if (stopped || closed) return;
      stopped = true;
      Promise.resolve()
        .then(() => terminate(child))
        .catch((error) => {
          diagnostic('termination', error.message);
          child.kill('SIGKILL');
        });
    };
    const parse = (line) => {
      if (!line.trim()) return;
      try {
        const event = JSON.parse(line);
        if (!event || typeof event.type !== 'string') throw new Error('Event requires type');
        if (event.type === 'assistant.message') {
          if (result) throw new Error('Assistant message after terminal result');
          const data = event.data;
          if (!data || typeof data.content !== 'string') throw new Error('Invalid assistant message');
          const requests = data.toolRequests ?? [];
          if (
            !Array.isArray(requests) ||
            requests.some((item) => !item || !text(item.name) || !Object.hasOwn(item, 'arguments'))
          )
            throw new Error('Invalid tool requests');
          outcome.messages.push(data.content);
          outcome.toolRequests.push(...requests.map(({ name, arguments: args }) => ({ name, arguments: args })));
        } else if (event.type === 'result') {
          if (result) throw new Error('Duplicate terminal result');
          result = event;
          if (!text(event.sessionId) || !Number.isInteger(event.exitCode))
            throw new Error('Invalid terminal identity or exit');
          outcome.sessionId = event.sessionId;
          outcome.exitCode = event.exitCode;
          const usage = event.usage;
          if (
            !usage ||
            !amount(usage.premiumRequests) ||
            !amount(usage.totalApiDurationMs) ||
            !amount(usage.sessionDurationMs)
          ) {
            throw new Error('Incomplete or invalid usage accounting');
          }
          outcome.usage = {
            counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: usage.premiumRequests }],
            apiDurationMs: usage.totalApiDurationMs,
            durationMs: usage.sessionDurationMs,
          };
          const writes = usage.codeChanges?.filesModified;
          if (!Array.isArray(writes) || writes.some((file) => typeof file !== 'string' || !path.isAbsolute(file))) {
            throw new Error('Incomplete or invalid write telemetry');
          }
          outcome.reportedWrites = [...new Set(writes)];
        }
      } catch (error) {
        diagnostic('protocol', error.message);
        stop();
      }
    };
    child.stdout.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxOutputBytes) {
        if (!stopped) diagnostic('output_limit', 'Agent stdout exceeded configured limit');
        stop();
        return;
      }
      pending += decoder.write(chunk);
      let newline;
      while ((newline = pending.indexOf('\n')) !== -1) {
        parse(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString('utf8')).slice(-8192);
    });
    child.on('error', (error) => diagnostic('spawn', error.message));
    const timer = setTimeout(() => {
      diagnostic('timeout', `Agent exceeded ${timeoutMs}ms`);
      stop();
    }, timeoutMs);
    const cancel = () => {
      diagnostic('cancelled', 'Agent cancelled');
      stop();
    };
    child.on('close', (code, signal) => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', cancel);
      parse(pending + decoder.end());
      if (!result) diagnostic('missing_result', 'Agent exited without terminal evidence');
      if (code !== 0 || result?.exitCode !== 0 || signal)
        diagnostic('exit', `Process exit ${code}, result exit ${result?.exitCode}, signal ${signal}`);
      if (stderr.trim()) diagnostic('stderr', stderr.trim());
      if (outcome.diagnostics.every(({ code: name }) => name === 'stderr')) outcome.status = 'completed';
      resolve(outcome);
    });
    request.signal?.addEventListener('abort', cancel, { once: true });
  });
}
