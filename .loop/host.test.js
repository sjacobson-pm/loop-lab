// @vitest-environment node
import { EventEmitter } from 'node:events';
import { spawn as nodeSpawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runAgent } from './host.mjs';
import { mergeUsage } from './lib/termination.mjs';

const terminal = (overrides = {}) => ({
  type: 'result',
  sessionId: 'session-1',
  exitCode: 0,
  usage: {
    premiumRequests: 7.5,
    totalApiDurationMs: 1161,
    sessionDurationMs: 4567,
    codeChanges: { linesAdded: 0, linesRemoved: 0, filesModified: [] },
  },
  ...overrides,
});
const request = (overrides = {}) => ({
  prompt: 'Analyze "this"; do not ask.',
  worktree: path.resolve('directory with spaces'),
  leg: 'decompose',
  deniedPaths: [path.resolve('src', 'future.js')],
  timeoutMs: 500,
  ...overrides,
});
function launcher(chunks, exitCode = 0, stderr = '') {
  const spawn = vi.fn(() => {
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.pid = 123;
    child.kill = () => child.emit('close', null, 'SIGKILL');
    queueMicrotask(() => {
      chunks.forEach((chunk) => child.stdout.write(chunk));
      child.stderr.end(stderr);
      child.stdout.end();
      child.emit('close', exitCode, null);
    });
    return child;
  });
  return spawn;
}
const encode = (events) => events.map((event) => JSON.stringify(event)).join('\n');

describe('runAgent', () => {
  it('streams split UTF8/CRLF and returns only neutral final evidence and usage', async () => {
    // * ARRANGE
    const content = encode([
      { type: 'new.future.event', ephemeral: true },
      {
        type: 'assistant.message',
        data: { content: 'caf\u00e9', toolRequests: [{ name: 'create', arguments: { path: 'file' } }] },
      },
      { type: 'assistant.message', data: { content: 'Permission denied' } },
      terminal(),
    ]).replaceAll('\n', '\r\n');
    const bytes = Buffer.from(`\r\n${content}`);
    const spawn = launcher([...bytes].map((byte) => Buffer.from([byte])));
    // * ACT
    const result = await runAgent(request({ profile: { model: 'configured-model', reasoningEffort: 'high' } }), {
      spawn,
    });
    // * ASSERT
    expect(result).toEqual({
      status: 'completed',
      sessionId: 'session-1',
      exitCode: 0,
      messages: ['caf\u00e9', 'Permission denied'],
      toolRequests: [{ name: 'create', arguments: { path: 'file' } }],
      reportedWrites: [],
      usage: {
        counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 7.5 }],
        apiDurationMs: 1161,
        durationMs: 4567,
      },
      diagnostics: [],
    });
    const [executable, argv, options] = spawn.mock.calls[0];
    expect(executable).toBe('copilot');
    expect(options).toMatchObject({ cwd: request().worktree, shell: false, windowsHide: true });
    expect(argv).toEqual(
      expect.arrayContaining([
        '-p',
        request().prompt,
        '--output-format',
        'json',
        '-C',
        request().worktree,
        '--no-ask-user',
        '--allow-all-tools',
        '--deny-tool',
        `write(${request().deniedPaths[0]})`,
        '--model',
        'configured-model',
        '--reasoning-effort',
        'high',
        '--disable-builtin-mcps',
      ])
    );
    expect(argv).not.toContain('--allow-all-paths');
    expect(argv).not.toContain('--fleet');
    expect(argv).not.toContain('--acp');
    expect(argv.slice(argv.indexOf('--available-tools') + 1, argv.indexOf('--no-ask-user'))).toEqual([
      'view',
      'glob',
      'grep',
      'create',
      'edit',
    ]);
  });

  it('uses read-only tool exposure and all-write denial for review', async () => {
    // * ARRANGE
    const spawn = launcher([encode([terminal()])]);
    // * ACT
    await runAgent(request({ leg: 'review', deniedPaths: [], executable: 'native.exe' }), { spawn });
    // * ASSERT
    const [executable, argv] = spawn.mock.calls[0];
    expect(executable).toBe('native.exe');
    expect(argv).toContain('write');
    expect(argv).not.toContain('create');
    expect(argv).not.toContain('edit');
    expect(argv).not.toContain('--model');
  });

  it.each([
    ['malformed JSON', '{broken'],
    ['missing result', encode([{ type: 'assistant.idle' }])],
    ['duplicate result', encode([terminal(), terminal()])],
    ['invalid message', encode([{ type: 'assistant.message', data: { content: 7 } }, terminal()])],
    [
      'invalid requests',
      encode([{ type: 'assistant.message', data: { content: '', toolRequests: [null] } }, terminal()]),
    ],
    [
      'missing request arguments',
      encode([{ type: 'assistant.message', data: { content: '', toolRequests: [{ name: 'edit' }] } }, terminal()]),
    ],
    ['invalid session', encode([terminal({ sessionId: '' })])],
    ['missing usage', encode([terminal({ usage: null })])],
    ['missing telemetry', encode([terminal({ usage: { premiumRequests: 1 } })])],
    [
      'relative telemetry',
      encode([terminal({ usage: { ...terminal().usage, codeChanges: { filesModified: ['relative.js'] } } })]),
    ],
    ['negative usage', encode([terminal({ usage: { ...terminal().usage, premiumRequests: -1 } })])],
    ['invalid exit', encode([terminal({ exitCode: '0' })])],
    ['message after terminal', encode([terminal(), { type: 'assistant.message', data: { content: 'late' } }])],
  ])('fails closed on %s', async (label, output) => {
    // * ARRANGE / ACT
    const result = await runAgent(request(), { spawn: launcher([output]) });
    // * ASSERT
    expect(result.status).toBe('failed');
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it.each([
    [1, 1],
    [0, 1],
    [1, 0],
    [null, 0],
  ])('rejects nonzero or mismatched exits: process %s, result %s', async (exit, reported) => {
    // * ARRANGE / ACT
    const result = await runAgent(request(), { spawn: launcher([encode([terminal({ exitCode: reported })])], exit) });
    // * ASSERT
    expect(result.status).toBe('failed');
    expect(result.usage.counters[0].value).toBe(7.5);
  });

  it('returns spawn errors as failed outcomes', async () => {
    // * ARRANGE / ACT
    const result = await runAgent(request(), {
      spawn: () => {
        throw new Error('ENOENT');
      },
    });
    // * ASSERT
    expect(result).toMatchObject({ status: 'failed', reportedWrites: null });
    expect(result.diagnostics[0].message).toContain('ENOENT');
    expect(
      mergeUsage({ counters: [], apiDurationMs: 0, durationMs: 0, complete: true, missingExecutions: 0 }, result.usage)
    ).toMatchObject({ complete: false, missingExecutions: 1, counters: [] });
  });
  it('handles asynchronous spawn failures', async () => {
    // * ARRANGE
    const spawn = () => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      queueMicrotask(() => {
        child.emit('error', new Error('ENOENT'));
        child.emit('close', -2);
      });
      return child;
    };
    // * ACT / ASSERT
    expect((await runAgent(request(), { spawn })).status).toBe('failed');
  });

  it('times out, terminates the process and waits for its close before returning', async () => {
    // * ARRANGE
    let closed = false;
    const spawn = () => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.pid = 123;
      return child;
    };
    const terminate = async (child) => {
      closed = true;
      child.emit('close', null, 'SIGKILL');
    };
    // * ACT
    const result = await runAgent(request({ timeoutMs: 5 }), { spawn, terminate });
    // * ASSERT
    expect(closed).toBe(true);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'timeout' }));
  });

  it('bounds stdout and stderr and does not return success-shaped truncated evidence', async () => {
    // * ARRANGE / ACT
    const result = await runAgent(request({ maxOutputBytes: 20 }), {
      spawn: launcher(['x'.repeat(21)], 0, 'error'.repeat(30)),
      terminate: async (child) => child.emit('close', null),
    });
    // * ASSERT
    expect(result.status).toBe('failed');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'output_limit' }));
  });

  it.each([
    { worktree: 'relative' },
    { prompt: '' },
    { leg: 'unrecognized' },
    { timeoutMs: 0 },
    { deniedPaths: ['relative'] },
    { deniedPaths: [path.resolve('src/(ambiguous).js')] },
    { deniedPaths: [path.resolve('src/star*.js')] },
    { profile: { model: '' } },
  ])('rejects unrepresentable configuration before dispatch: %j', async (override) => {
    // * ARRANGE
    const spawn = vi.fn();
    // * ACT / ASSERT
    await expect(runAgent(request(override), { spawn })).rejects.toThrow();
    expect(spawn).not.toHaveBeenCalled();
  });
  it('rejects command lines too large for the installed Windows process boundary before spawning', async () => {
    // * ARRANGE
    const spawn = vi.fn();
    // * ACT / ASSERT
    await expect(runAgent(request({ prompt: 'x'.repeat(40_000) }), { spawn })).rejects.toThrow(/command line/i);
    expect(spawn).not.toHaveBeenCalled();
  });
  it('cancels an active leg and waits for closure rather than accepting its terminal result', async () => {
    // * ARRANGE
    const controller = new AbortController();
    const spawn = () => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      queueMicrotask(() => controller.abort());
      return child;
    };
    // * ACT
    const result = await runAgent(request({ signal: controller.signal }), {
      spawn,
      terminate: async (child) => child.emit('close', null, 'SIGKILL'),
    });
    // * ASSERT
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'cancelled' }));
  });
  it('terminates a real hung subprocess on timeout without a shell', async () => {
    // * ARRANGE
    let child;
    // * ACT
    const result = await runAgent(request({ timeoutMs: 100 }), {
      spawn: () => {
        child = nodeSpawn(process.execPath, ['-e', 'setInterval(()=>{},1000)']);
        return child;
      },
    });
    // * ASSERT
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'timeout' }));
  });
  it('reports termination failures and falls back to killing the same child', async () => {
    // * ARRANGE
    const spawn = () => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = () => child.emit('close', null, 'SIGKILL');
      return child;
    };
    // * ACT
    const result = await runAgent(request({ timeoutMs: 5 }), {
      spawn,
      terminate: async () => {
        throw new Error('tree termination failed');
      },
    });
    // * ASSERT
    expect(result.diagnostics).toContainEqual({ code: 'termination', message: 'tree termination failed' });
  });
  it('never dispatches an already cancelled request', async () => {
    // * ARRANGE
    const controller = new AbortController();
    controller.abort();
    const spawn = vi.fn();
    // * ACT
    const result = await runAgent(request({ signal: controller.signal }), { spawn });
    // * ASSERT
    expect(result.status).toBe('failed');
    expect(result.diagnostics[0].code).toBe('cancelled');
    expect(spawn).not.toHaveBeenCalled();
  });
  it('rejects JSON values without an event type', async () => {
    // * ARRANGE / ACT / ASSERT
    expect((await runAgent(request(), { spawn: launcher(['null\n']) })).status).toBe('failed');
  });
  it('uses child termination on non-Windows hosts', async () => {
    // * ARRANGE
    const platform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    const spawn = () => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = () => child.emit('close', null, 'SIGKILL');
      return child;
    };
    try {
      // * ACT / ASSERT
      expect((await runAgent(request({ timeoutMs: 5 }), { spawn })).status).toBe('failed');
    } finally {
      Object.defineProperty(process, 'platform', platform);
    }
  });
});
