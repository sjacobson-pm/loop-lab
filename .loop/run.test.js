// @vitest-environment node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { copyFile, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runAttended } from './lifecycle.mjs';
import { runCli } from './run.mjs';

const pinnedArgs = ['owner/repo', '42', 'spec/x.html', 'Rule', '--model', 'gpt-5-mini', '--reasoning-effort', 'low'];

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
    const code = await runCli(pinnedArgs, {
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
    const result = await runCli(pinnedArgs, {
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
    const code = await runCli(pinnedArgs, {
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
      await runCli(pinnedArgs, {
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
      await runCli(pinnedArgs, {
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
    const code = await runCli(pinnedArgs, {
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
  it('tees Gate prompts, attended answers, wave usage and final result to an external log', async () => {
    const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'loop-cli-log-')));
    const logFile = path.join(directory, 'run.log');
    const input = new PassThrough();
    const output = new PassThrough();
    input.isTTY = true;
    output.isTTY = true;
    output.columns = 100;
    let transcript = '';
    try {
      output.on('data', (chunk) => {
        const text = chunk.toString();
        transcript += text;
        if (text.includes('approve / revise / stop:')) queueMicrotask(() => input.write('approve\n'));
        if (text.includes('publish / stop:')) queueMicrotask(() => input.write('stop\n'));
      });
      const code = await runCli([...pinnedArgs, '--log-file', logFile], {
        input,
        output,
        issueReader: async () => ({}),
        run: async ({ gate1, reportWave, gate2 }) => {
          expect(await gate1({ usage: [{ name: 'premiumRequests', unit: 'premium-requests', value: 1 }] })).toEqual({
            decision: 'approve',
            feedback: '',
          });
          await reportWave({
            index: 1,
            status: 'ready',
            usage: { counters: [], complete: true, missingExecutions: 0 },
            agentExecutions: 0,
          });
          expect(await gate2({ groups: [] })).toEqual({ decision: 'stop' });
          return { status: 'stopped' };
        },
      });
      expect(code).toBe(0);
      const saved = await readFile(logFile, 'utf8');
      expect(saved).toBe(transcript);
      expect(saved).toContain('approve / revise / stop:');
      expect(saved).toContain('approve');
      expect(saved).toContain('Wave 1 barrier');
      expect(saved).toContain('publish / stop:');
      expect(saved).toContain('stopped');
      expect(saved).toMatch(/approve\r?\n/);
      expect(saved).toMatch(/stop\r?\n/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('refuses a log inside the checkout before issue retrieval and does not create it', async () => {
    const logFile = path.join(process.cwd(), '.loop', 'do-not-create.log');
    const issueReader = vi.fn();
    let output = '';
    const code = await runCli([...pinnedArgs, '--log-file', logFile], {
      issueReader,
      write: (text) => {
        output += text;
      },
    });
    expect(code).toBe(1);
    expect(issueReader).not.toHaveBeenCalled();
    expect(output).toMatch(/log.*outside.*checkout/i);
    await expect(readFile(logFile)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('refuses a relative log or an existing external file without overwriting it', async () => {
    const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'loop-cli-log-')));
    const logFile = path.join(directory, 'run.log');
    const issueReader = vi.fn();
    let output = '';
    try {
      await writeFile(logFile, 'original');
      for (const pathValue of ['relative.log', logFile]) {
        expect(
          await runCli([...pinnedArgs, '--log-file', pathValue], {
            issueReader,
            write: (text) => {
              output += text;
            },
          })
        ).toBe(1);
      }
      expect(issueReader).not.toHaveBeenCalled();
      expect(output).toMatch(/log file/i);
      expect(await readFile(logFile, 'utf8')).toBe('original');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('fails before issue retrieval when the external log parent does not exist', async () => {
    const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'loop-cli-log-')));
    const issueReader = vi.fn();
    let output = '';
    try {
      expect(
        await runCli([...pinnedArgs, '--log-file', path.join(directory, 'missing', 'run.log')], {
          issueReader,
          write: (text) => {
            output += text;
          },
        })
      ).toBe(1);
      expect(issueReader).not.toHaveBeenCalled();
      expect(output).toMatch(/resolve log file parent/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('rejects an external parent alias that resolves into the checkout', async () => {
    const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'loop-cli-log-')));
    const alias = path.join(directory, 'alias');
    const issueReader = vi.fn();
    let output = '';
    try {
      await symlink(process.cwd(), alias, process.platform === 'win32' ? 'junction' : 'dir');
      expect(
        await runCli([...pinnedArgs, '--log-file', path.join(alias, 'run.log')], {
          issueReader,
          write: (text) => {
            output += text;
          },
        })
      ).toBe(1);
      expect(issueReader).not.toHaveBeenCalled();
      expect(output).toMatch(/log.*outside.*checkout/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('stops rather than reporting a successful run when writing the log fails', async () => {
    const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'loop-cli-log-')));
    let output = '';
    try {
      const code = await runCli([...pinnedArgs, '--log-file', path.join(directory, 'run.log')], {
        ask: async () => 'stop',
        issueReader: async () => ({}),
        write: (text) => {
          output += text;
        },
        writeLog: () => {
          throw new Error('disk full');
        },
        run: async () => ({ status: 'stopped' }),
      });
      expect(code).toBe(1);
      expect(output).toContain('Preparation failed: disk full');
      expect(await readFile(path.join(directory, 'run.log'), 'utf8')).toBe('');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it.each([
    ['help', ['--help'], 0, 'Gate 1'],
    ['invalid usage', [], 1, 'Usage:'],
    ['requested execution', pinnedArgs, 1, 'Preparation failed: Execution dependency evaluated'],
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
    const code = await runCli(['not-a-repository', ...pinnedArgs.slice(1)], {
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
    const code = await runCli(['owner/repo', '42', '../outside.html', ...pinnedArgs.slice(3)], {
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
    const code = await runCli(pinnedArgs, {
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
    const code = await runCli(pinnedArgs, {
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
  it('passes one explicit profile to decomposition and all three execution legs', async () => {
    const observed = {};
    const plan = {
      issue: 42,
      target: 'react-vitest',
      tasks: [{ id: 'A', depends_on: [], files_modified: ['src/a.js'] }],
      waves: [],
    };
    const hashes = { spec: 'spec', target: 'target', plan: 'plan' };
    const code = await runCli(pinnedArgs, {
      issueReader: async () => ({ number: 42, repository: 'owner/repo', title: 'Title', body: 'Issue prose' }),
      ask: async () => 'stop',
      write: () => {},
      run: (input) =>
        runAttended(input, {
          checkBaseline: async () => {},
          prepare: async ({ profile }) => {
            observed.decompose = profile;
            return { status: 'planned', plan, hashes };
          },
          loadApproved: async () => ({
            plan,
            index: { spec_path: 'spec/x.html' },
            targetConfig: { publication_base: 'main' },
          }),
          executionFactory: async ({ profiles }) => {
            observed.execution = profiles;
            return { baseline: 'start', dispose: async () => {} };
          },
          localFactory: () => ({ readInputs: async () => hashes }),
          publisher: async () => ({ status: 'stopped', pullRequests: [] }),
        }),
    });
    expect(code).toBe(0);
    expect(observed).toEqual({
      decompose: { model: 'gpt-5-mini', reasoningEffort: 'low' },
      execution: {
        test: { model: 'gpt-5-mini', reasoningEffort: 'low' },
        implement: { model: 'gpt-5-mini', reasoningEffort: 'low' },
        review: { model: 'gpt-5-mini', reasoningEffort: 'low' },
      },
    });
  });
  it('reports cumulative measured premium requests at both gates and a wave barrier', async () => {
    const answers = ['approve', 'stop'];
    let output = '';
    const code = await runCli(pinnedArgs, {
      issueReader: async () => ({ number: 42, repository: 'owner/repo', title: 'Title', body: 'Issue prose' }),
      ask: async () => answers.shift(),
      write: (text) => {
        output += text;
      },
      run: async ({ gate1, reportWave, gate2 }) => {
        await gate1({
          usage: [{ name: 'premiumRequests', unit: 'premium-requests', value: 2 }],
          plan: {},
          prGroups: [],
        });
        await reportWave({
          index: 1,
          status: 'ready',
          usage: {
            counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 3 }],
            complete: true,
            missingExecutions: 0,
          },
        });
        await gate2({ groups: [], treeDigests: [], evidence: {} });
        return { status: 'stopped' };
      },
    });
    expect(code).toBe(0);
    expect(output).toContain('Gate 1: measured premium requests: 2');
    expect(output).toContain('Wave 1 barrier (ready): measured premium requests: 5');
    expect(output).toContain('Gate 2: measured premium requests: 5');
    expect(answers).toEqual([]);
  });
  it('marks incomplete wave accounting rather than reporting a false complete total', async () => {
    let output = '';
    const code = await runCli(pinnedArgs, {
      issueReader: async () => ({ number: 42, repository: 'owner/repo', title: 'Title', body: 'Issue prose' }),
      ask: async () => 'stop',
      write: (text) => {
        output += text;
      },
      run: async ({ gate1, reportWave }) => {
        await gate1({ usage: [{ name: 'premiumRequests', unit: 'premium-requests', value: 2 }] });
        await reportWave({
          index: 1,
          status: 'parked',
          usage: { counters: [], complete: false, missingExecutions: 1 },
        });
        return { status: 'stopped' };
      },
    });
    expect(code).toBe(0);
    expect(output).toContain('Wave 1 barrier (parked): known premium requests: 2; accounting incomplete');
  });
  it('reports zero premium requests when a settled wave parks before any agent execution', async () => {
    let output = '';
    const code = await runCli(pinnedArgs, {
      issueReader: async () => ({ number: 42, repository: 'owner/repo', title: 'Title', body: 'Issue prose' }),
      ask: async () => 'approve',
      write: (text) => {
        output += text;
      },
      run: async ({ gate1, reportWave }) => {
        await gate1({ usage: [{ name: 'premiumRequests', unit: 'premium-requests', value: 0 }] });
        await reportWave({
          index: 1,
          status: 'parked',
          usage: { counters: [], complete: true, missingExecutions: 0 },
          agentExecutions: 0,
        });
        return { status: 'stopped' };
      },
    });
    expect(code).toBe(0);
    expect(output).toContain('Wave 1 barrier (parked): measured premium requests: 0');
    expect(output).not.toContain('accounting incomplete');
  });
  it('marks a settled wave incomplete when an agent ran without premium-request counters', async () => {
    let output = '';
    const code = await runCli(pinnedArgs, {
      issueReader: async () => ({ number: 42, repository: 'owner/repo', title: 'Title', body: 'Issue prose' }),
      ask: async () => 'approve',
      write: (text) => {
        output += text;
      },
      run: async ({ gate1, reportWave }) => {
        await gate1({ usage: [{ name: 'premiumRequests', unit: 'premium-requests', value: 2 }] });
        await reportWave({
          index: 1,
          status: 'parked',
          usage: { counters: [], complete: true, missingExecutions: 0 },
          agentExecutions: 1,
        });
        return { status: 'stopped' };
      },
    });
    expect(code).toBe(0);
    expect(output).toContain('Wave 1 barrier (parked): known premium requests: 2; accounting incomplete');
  });
  it('does not treat absent usage counters as a measured zero', async () => {
    let output = '';
    const code = await runCli(pinnedArgs, {
      issueReader: async () => ({ number: 42, repository: 'owner/repo', title: 'Title', body: 'Issue prose' }),
      ask: async () => 'approve',
      write: (text) => {
        output += text;
      },
      run: async ({ gate1, reportWave }) => {
        await gate1({ usage: [{ name: 'premiumRequests', unit: 'premium-requests', value: 0 }] });
        await reportWave({
          index: 1,
          status: 'parked',
          usage: { complete: true, missingExecutions: 0 },
          agentExecutions: 0,
        });
        return { status: 'stopped' };
      },
    });
    expect(code).toBe(0);
    expect(output).toContain('Wave 1 barrier (parked): known premium requests: 0; accounting incomplete');
  });
  it('keeps prior wave usage when Gate 1 re-enters with a new decomposition attempt', async () => {
    const answers = ['approve', 'revise', 'split the tasks', 'stop'];
    let output = '';
    const counter = (value) => [{ name: 'premiumRequests', unit: 'premium-requests', value }];
    const code = await runCli(pinnedArgs, {
      issueReader: async () => ({ number: 42, repository: 'owner/repo', title: 'Title', body: 'Issue prose' }),
      ask: async () => answers.shift(),
      write: (text) => {
        output += text;
      },
      run: async ({ gate1, reportWave }) => {
        await gate1({ usage: counter(2) });
        await reportWave({
          index: 1,
          status: 'gate1',
          usage: { counters: counter(3), complete: true, missingExecutions: 0 },
        });
        await gate1({ findings: [{ message: 'Revise task ownership' }] });
        await gate1({ usage: counter(1) });
        return { status: 'stopped' };
      },
    });
    expect(code).toBe(0);
    expect(output).toContain('Wave 1 barrier (gate1): measured premium requests: 5');
    expect(output).toContain('Gate 1: measured premium requests: 6');
    expect(answers).toEqual([]);
  });
  it.each([
    ['absent', pinnedArgs.slice(0, 4)],
    ['missing model', [...pinnedArgs.slice(0, 4), '--reasoning-effort', 'low']],
    ['blank model', [...pinnedArgs.slice(0, 4), '--model', ' ', '--reasoning-effort', 'low']],
    ['non-string model', [...pinnedArgs.slice(0, 4), '--model', 42, '--reasoning-effort', 'low']],
    ['option-shaped model', [...pinnedArgs.slice(0, 4), '--model', '--other', '--reasoning-effort', 'low']],
    ['missing reasoning effort', [...pinnedArgs.slice(0, 4), '--model', 'gpt-5-mini']],
    ['blank reasoning effort', [...pinnedArgs.slice(0, -1), ' \t']],
    ['non-string reasoning effort', [...pinnedArgs.slice(0, -1), null]],
    ['duplicate model', [...pinnedArgs.slice(0, 6), '--model', 'gpt-5-mini']],
    ['unknown option', [...pinnedArgs.slice(0, 6), '--unknown', 'low']],
  ])('refuses %s profile flags before loading the issue or execution graph', async (_, args) => {
    const issueReader = vi.fn();
    const run = vi.fn();
    let output = '';
    const code = await runCli(args, {
      issueReader,
      run,
      write: (text) => {
        output += text;
      },
    });
    expect(code).toBe(1);
    expect(output).toContain('Usage:');
    expect(issueReader).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});
