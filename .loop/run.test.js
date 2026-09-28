// @vitest-environment node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { copyFile, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from './run.mjs';

describe('attended CLI', () => {
  it('prints usage without invoking GitHub or agents', async () => {
    // * ARRANGE
    let output = '';
    // * ACT
    const code = await runCli(['--help'], {
      write: (text) => {
        output += text;
      },
    });
    // * ASSERT
    expect(code).toBe(0);
    expect(output).toContain('node .loop');
    expect(output).toContain('Gate 1');
  });
  it('loads a real issue through the adapter and requires an explicit terminal gate response', async () => {
    // * ARRANGE
    let output = '';
    const ask = vi
      .fn()
      .mockResolvedValueOnce('invalid')
      .mockResolvedValueOnce('revise')
      .mockResolvedValueOnce('Split task');
    const prepare = async (input) => {
      expect(input.issue).toMatchObject({ number: 42, body: 'Issue prose' });
      expect(input.acceptanceKinds).toEqual(['Rule']);
      const reply = await input.gate1({ plan: {}, prGroups: [['A']], warnings: [], usage: [], approvalDigest: 'abc' });
      expect(reply).toEqual({ decision: 'revise', feedback: 'Split task' });
      return { status: 'stopped' };
    };
    // * ACT
    const code = await runCli(['owner/repo', '42', 'spec/x.html', 'Rule'], {
      write: (text) => {
        output += text;
      },
      ask,
      prepare,
      issueReader: async () => ({ number: 42, body: 'Issue prose', title: 'Title', repository: 'owner/repo' }),
    });
    // * ASSERT
    expect(code).toBe(0);
    expect(output).toContain('Gate 1');
    expect(output).toContain('Invalid decision');
    expect(output).toContain('stopped');
  });
  it('offers the staged worktrees at one Gate 2 and reports only confirmed PR URLs as success', async () => {
    const answers = ['approve', 'publish'];
    let transcript = '';
    const result = await runCli(['owner/repo', '42', 'spec/x.html', 'Rule'], {
      issueReader: async () => ({ number: 42, repository: 'owner/repo', title: 'Title', body: 'Issue prose' }),
      ask: async () => answers.shift(),
      write: (text) => {
        transcript += text;
      },
      run: async ({ gate1, gate2 }) => {
        expect(await gate1({ plan: { tasks: [] }, prGroups: [['A']] })).toEqual({ decision: 'approve', feedback: '' });
        expect(
          await gate2({
            groups: [{ head: 'loop/42-1', path: 'C:\\disposable\\group', tree: 'reviewed-tree' }],
            treeDigests: ['reviewed-tree'],
            evidence: { hashes: {} },
          })
        ).toEqual({ decision: 'publish' });
        return { status: 'pr-opened', pullRequests: ['https://github.com/owner/repo/pull/7'] };
      },
    });
    expect(result).toBe(0);
    expect(transcript).toContain(JSON.stringify('C:\\disposable\\group'));
    expect(transcript).toContain('reviewed-tree');
    expect(transcript).toContain('https://github.com/owner/repo/pull/7');
    expect(transcript).toContain('human');
  });
  it('re-prompts an invalid Gate 2 response without granting publication', async () => {
    const answers = ['later', 'stop'];
    let transcript = '';
    const code = await runCli(['owner/repo', '42', 'spec/x.html', 'Rule'], {
      issueReader: async () => ({ number: 42, repository: 'owner/repo', title: 'Title', body: 'Issue prose' }),
      ask: async () => answers.shift(),
      write: (text) => {
        transcript += text;
      },
      run: async ({ gate2 }) => {
        expect(await gate2({ groups: [] })).toEqual({ decision: 'stop' });
        return { status: 'stopped' };
      },
    });
    expect(code).toBe(0);
    expect(transcript).toContain('Invalid decision; enter publish or stop.');
    expect(answers).toEqual([]);
  });
  it.each(['approve', 'stop'])('accepts an explicit %s response without another checkpoint', async (decision) => {
    // * ARRANGE
    const prepare = async ({ gate1 }) => {
      expect(await gate1({})).toEqual({ decision, feedback: '' });
      return { status: 'stopped' };
    };
    // * ACT / ASSERT
    expect(
      await runCli(['owner/repo', '42', 'spec/x.html', 'Rule'], {
        write: () => {},
        ask: async () => decision,
        prepare,
        issueReader: async () => ({}),
      })
    ).toBe(0);
  });
  it('reports invalid arguments and preparation failures instead of continuing', async () => {
    // * ARRANGE
    let output = '';
    const write = (text) => {
      output += text;
    };
    // * ACT / ASSERT
    expect(await runCli([], { write })).toBe(1);
    expect(
      await runCli(['owner/repo', '42', 'spec/x.html', 'Rule'], {
        write,
        issueReader: async () => {
          throw new Error('GitHub unavailable');
        },
      })
    ).toBe(1);
    expect(output).toContain('GitHub unavailable');
  });
  it('runs as a Node executable without starting work for --help', async () => {
    // * ARRANGE / ACT
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      [fileURLToPath(new URL('./run.mjs', import.meta.url)), '--help'],
      { env: { ...process.env, NODE_DEBUG: 'esm' }, maxBuffer: 8 * 1024 * 1024 }
    );
    // * ASSERT
    expect(stdout).toContain('Gate 1');
    expect(stderr).not.toContain('jsdom');
  });
  it('uses a real attended readline gate and closes its input after approval', async () => {
    // * ARRANGE
    const input = new PassThrough();
    const output = new PassThrough();
    input.isTTY = true;
    let transcript = '';
    output.on('data', (chunk) => {
      transcript += chunk.toString();
      if (chunk.toString().includes('approve / revise / stop:')) queueMicrotask(() => input.write('approve\n'));
    });
    // * ACT
    const code = await runCli(['owner/repo', '42', 'spec/x.html', 'Rule'], {
      input,
      output,
      issueReader: async () => ({}),
      prepare: async ({ gate1 }) => {
        expect(await gate1({})).toEqual({ decision: 'approve', feedback: '' });
        return { status: 'stopped' };
      },
    });
    // * ASSERT
    expect(code).toBe(0);
    expect(transcript).toContain('stopped');
    expect(input.listenerCount('data')).toBe(0);
  });
  it.each([
    ['help', ['--help'], 0, 'Gate 1'],
    ['invalid usage', [], 1, 'Usage:'],
    [
      'requested execution',
      ['owner/repo', '42', 'spec/x.html', 'Rule'],
      1,
      'Preparation failed: Execution dependency evaluated',
    ],
  ])('keeps %s on the correct side of the execution import boundary', async (_, args, code, message) => {
    // * ARRANGE
    const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'loop-cli-boundary-')));
    try {
      await copyFile(new URL('./run.mjs', import.meta.url), path.join(root, 'run.mjs'));
      await writeFile(
        path.join(root, 'attended.mjs'),
        'throw new Error("Execution dependency evaluated"); export function readIssue() {} export function prepareAttended() {}'
      );
      // * ACT
      const invocation = promisify(execFile)(process.execPath, [path.join(root, 'run.mjs'), ...args]);
      // * ASSERT
      if (code === 0) {
        const result = await invocation;
        expect(result.stdout).toContain(message);
        expect(result.stderr).toBe('');
      } else {
        await expect(invocation).rejects.toMatchObject({ code, stdout: expect.stringContaining(message) });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it('loads the real issue adapter for execution and surfaces its validation error', async () => {
    // * ARRANGE
    let output = '';
    // * ACT
    const code = await runCli(['not-a-repository', '42', 'spec/x.html', 'Rule'], {
      write: (text) => {
        output += text;
      },
    });
    // * ASSERT
    expect(code).toBe(1);
    expect(output).toContain('Preparation failed: Invalid issue coordinates');
  });
  it('loads the real preparation adapter when only issue retrieval is injected', async () => {
    // * ARRANGE
    let output = '';
    // * ACT
    const code = await runCli(['owner/repo', '42', '../outside.html', 'Rule'], {
      issueReader: async () => ({ number: 42 }),
      ask: async () => 'stop',
      write: (text) => {
        output += text;
      },
    });
    // * ASSERT
    expect(code).toBe(1);
    expect(output).toContain('Preparation failed:');
    expect(output).toContain('path');
  });
  it('refuses unattended input before dispatch', async () => {
    // * ARRANGE
    let output = '';
    const prepare = vi.fn();
    // * ACT
    const code = await runCli(['owner/repo', '42', 'spec/x.html', 'Rule'], {
      input: new PassThrough(),
      write: (text) => {
        output += text;
      },
      issueReader: async () => ({}),
      prepare,
    });
    // * ASSERT
    expect(code).toBe(1);
    expect(output).toContain('attended terminal');
    expect(prepare).not.toHaveBeenCalled();
  });
  it('aborts active preparation on SIGINT instead of leaving its agent running', async () => {
    // * ARRANGE
    let aborted;
    // * ACT
    const code = await runCli(['owner/repo', '42', 'spec/x.html', 'Rule'], {
      write: () => {},
      ask: async () => 'stop',
      issueReader: async () => ({}),
      prepare: async ({ signal }) => {
        process.emit('SIGINT');
        aborted = signal?.aborted;
        return { status: 'stale' };
      },
    });
    // * ASSERT
    expect(code).toBe(1);
    expect(aborted).toBe(true);
  });
  it('sets the executable exit status and prints help through its real entrypoint', async () => {
    // * ARRANGE
    const argv = process.argv;
    const previousCode = process.exitCode;
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    process.argv = [process.execPath, await realpath(fileURLToPath(new URL('./run.mjs', import.meta.url))), '--help'];
    try {
      // * ACT
      vi.resetModules();
      await import('./run.mjs');
      // * ASSERT
      expect(process.exitCode).toBe(0);
      expect(output).toHaveBeenCalledWith(expect.stringContaining('Gate 1'));
    } finally {
      process.argv = argv;
      process.exitCode = previousCode;
      output.mockRestore();
    }
  });
});
