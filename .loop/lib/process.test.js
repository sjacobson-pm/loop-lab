// @vitest-environment node
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { executeCommand } from './process.mjs';

const options = () => ({ cwd: process.cwd(), timeoutMs: 30_000 });
describe('trusted argv execution', () => {
  it('requests termination once while multiple output chunks exceed the shared limit', async () => {
    // * ARRANGE
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    const terminate = vi.fn(async () => {
      child.emit('close', null, 'SIGKILL');
      child.stdout.write('late');
    });
    // * ACT
    const result = await executeCommand(
      ['node'],
      { ...options(), maxOutputBytes: 1 },
      {
        spawn: () => {
          queueMicrotask(() => {
            child.stdout.write('first');
            child.stderr.write('second');
          });
          return child;
        },
        terminate,
      }
    );
    // * ASSERT
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(result.stdout).toBe('f');
    expect(result.errors).toEqual([{ kind: 'output_limit', message: 'Command output exceeded its byte limit.' }]);
  });
  it('surfaces synchronous spawn and termination failures without returning before close', async () => {
    // * ARRANGE / ACT / ASSERT
    expect(
      (
        await executeCommand(['node'], options(), {
          spawn: () => {
            throw new Error('spawn failed');
          },
        })
      ).errors
    ).toEqual([{ kind: 'spawn', message: 'spawn failed' }]);
    const controller = new AbortController();
    const child = new EventEmitter();
    child.pid = 123;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    const result = await executeCommand(
      ['node'],
      { ...options(), signal: controller.signal },
      {
        spawn: () => {
          queueMicrotask(() => controller.abort());
          return child;
        },
        terminate: async () => {
          child.emit('close', 1, null);
          throw new Error('termination failed');
        },
      }
    );
    expect(result.errors).toContainEqual({ kind: 'termination', message: 'termination failed' });
  });
  it('passes npx through a Node CLI on Windows and never enables a shell', async () => {
    // * ARRANGE
    const platform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    const spawn = vi.fn(() => {
      queueMicrotask(() => child.emit('close', 0));
      return child;
    });
    try {
      // * ACT
      await executeCommand(['npx', 'vitest', 'run'], { cwd: process.cwd() }, { spawn });
      // * ASSERT
      expect(spawn.mock.calls[0][0]).toBe(process.execPath);
      expect(spawn.mock.calls[0][1][0]).toMatch(/npx-cli\.js$/);
      expect(spawn.mock.calls[0][1].slice(1)).toEqual(['--no-install', 'vitest', 'run']);
      expect(spawn.mock.calls[0][2]).toMatchObject({ shell: false, detached: false });
    } finally {
      Object.defineProperty(process, 'platform', platform);
    }
  });
  it('supervises a POSIX group and cleans its exact PID on cancellation or parent exit', async () => {
    // * ARRANGE
    const platform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    const originalListeners = new Set(process.listeners('exit'));
    const controller = new AbortController();
    const child = new EventEmitter();
    child.pid = 99999970;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    const spawn = vi.fn(() => child);
    const kill = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const pending = executeCommand(['npx', 'vitest'], { ...options(), signal: controller.signal }, { spawn });
    try {
      const onExit = process.listeners('exit').find((listener) => !originalListeners.has(listener));
      // * ACT / ASSERT
      onExit();
      expect(kill).toHaveBeenCalledWith(-child.pid, 'SIGKILL');
      kill.mockImplementationOnce(() => {
        throw Object.assign(new Error('gone'), { code: 'ESRCH' });
      });
      onExit();
      expect(stderr).not.toHaveBeenCalled();
      kill.mockImplementationOnce(() => {
        throw new Error('denied');
      });
      onExit();
      expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Command cleanup failed: denied'));
      controller.abort();
      await new Promise(setImmediate);
      child.emit('close', null, 'SIGKILL');
      expect((await pending).errors[0].kind).toBe('cancelled');
      onExit();
      expect(spawn.mock.calls[0]).toMatchObject(['npx', ['--no-install', 'vitest'], { shell: false, detached: true }]);
    } finally {
      child.emit('close', null, 'SIGKILL');
      await pending;
      kill.mockRestore();
      stderr.mockRestore();
      Object.defineProperty(process, 'platform', platform);
    }
  });
  it('does not lose cancellation occurring during synchronous spawn', async () => {
    // * ARRANGE
    const controller = new AbortController();
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    // * ACT
    const result = await executeCommand(
      ['node'],
      { ...options(), signal: controller.signal },
      {
        spawn: () => {
          controller.abort();
          return child;
        },
        terminate: async () => {
          child.emit('close', null, 'SIGKILL');
        },
      }
    );
    // * ASSERT
    expect(result.errors[0].kind).toBe('cancelled');
  });
  it('rejects command shims rather than silently falling back to a shell', async () => {
    // * ARRANGE / ACT / ASSERT
    await expect(executeCommand(['custom.cmd'], options())).rejects.toThrow(/shims/);
  });
  it('executes literal argv without a shell and records the closed process outcome', async () => {
    // * ARRANGE / ACT
    const result = await executeCommand(
      [process.execPath, '-e', 'console.log(process.argv[1]);console.error("diagnostic")', 'literal & | > input'],
      options()
    );
    // * ASSERT
    expect(result).toMatchObject({ exitCode: 0, signal: null, timedOut: false, errors: [] });
    expect(result.stdout.trim()).toBe('literal & | > input');
    expect(result.stderr.trim()).toBe('diagnostic');
    expect(result.finishedAt).toBeGreaterThanOrEqual(result.startedAt);
  });
  it('uses this Node installation to run npm without executing a Windows command shim', async () => {
    // * ARRANGE / ACT
    const result = await executeCommand(['npm', '--version'], options());
    // * ASSERT
    expect(result.errors).toEqual([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
  it('reports asynchronous executable lookup failure after close', async () => {
    // * ARRANGE / ACT
    const result = await executeCommand(['loop-nonexistent-executable-7392'], options());
    // * ASSERT
    expect(result.errors).toContainEqual(expect.objectContaining({ kind: 'spawn' }));
  });
  it('terminates a real hung command on deadline and waits for closure', async () => {
    // * ARRANGE / ACT
    const result = await executeCommand([process.execPath, '-e', 'setInterval(()=>{},1000)'], {
      ...options(),
      timeoutMs: 100,
    });
    // * ASSERT
    expect(result.timedOut).toBe(true);
    expect(result.errors).toContainEqual(expect.objectContaining({ kind: 'timeout' }));
  });
  it('bounds stdout and stderr instead of keeping an unbounded process alive', async () => {
    // * ARRANGE / ACT
    const result = await executeCommand(
      [process.execPath, '-e', 'process.stdout.write("x".repeat(4096));setInterval(()=>{},1000)'],
      { ...options(), maxOutputBytes: 32 }
    );
    // * ASSERT
    expect(Buffer.byteLength(result.stdout + result.stderr)).toBeLessThanOrEqual(32);
    expect(result.errors).toContainEqual(expect.objectContaining({ kind: 'output_limit' }));
  });
  it('does not launch an already-cancelled command', async () => {
    // * ARRANGE
    const controller = new AbortController();
    controller.abort();
    const spawn = vi.fn();
    // * ACT
    const result = await executeCommand(['node', '-e', ''], { ...options(), signal: controller.signal }, { spawn });
    // * ASSERT
    expect(spawn).not.toHaveBeenCalled();
    expect(result.errors[0].kind).toBe('cancelled');
  });
  it('drains cancellation and termination before returning', async () => {
    // * ARRANGE
    const controller = new AbortController();
    const stopped = Promise.withResolvers();
    const child = new EventEmitter();
    child.pid = 123;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    const spawn = () => {
      queueMicrotask(() => controller.abort());
      return child;
    };
    const terminate = async () => {
      await stopped.promise;
      child.emit('close', null, 'SIGKILL');
    };
    // * ACT
    let returned = false;
    const pending = executeCommand(
      ['node', '-e', ''],
      { ...options(), signal: controller.signal },
      { spawn, terminate }
    ).then((value) => {
      returned = true;
      return value;
    });
    await new Promise(setImmediate);
    // * ASSERT
    expect(returned).toBe(false);
    stopped.resolve();
    expect((await pending).errors[0].kind).toBe('cancelled');
  });
  it.each([null, [], [null], ['node', '\0'], ['']].map((argv) => ({ argv })))(
    'rejects malformed argv %j',
    async ({ argv }) => {
      // * ARRANGE / ACT / ASSERT
      await expect(executeCommand(argv, options())).rejects.toThrow(/argv/i);
    }
  );
  it.each([{ timeoutMs: 0 }, { maxOutputBytes: -1 }, { cwd: 'relative' }])(
    'rejects invalid command limits %j',
    async (change) => {
      // * ARRANGE / ACT / ASSERT
      await expect(executeCommand(['node'], { ...options(), ...change })).rejects.toThrow(/command/i);
    }
  );
});
