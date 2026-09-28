import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

const usage =
  'Usage: node .loop\\run.mjs <owner/repo> <issue> <spec-relative-path> <acceptance-kinds-comma-separated>\nAttended react-vitest loop: Gate 1, automated waves, then Gate 2. The human commits and pushes; the harness only confirms PRs.\n';

/** Command-line adapter for the attended two-gate loop. */
export async function runCli(
  argv,
  {
    input = process.stdin,
    output = process.stdout,
    write = (text) => output.write(text),
    ask,
    prepare,
    run,
    issueReader,
  } = {}
) {
  if (argv.length === 1 && argv[0] === '--help') {
    write(usage);
    return 0;
  }
  let terminal;
  let code = 1;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  try {
    if (argv.length !== 4) throw new Error(usage);
    const [repository, number, specPath, kinds] = argv;
    const readIssue = issueReader ?? (await import('./attended.mjs')).readIssue;
    const issue = await readIssue(repository, Number(number));
    if (!ask) {
      if (!input.isTTY) throw new Error('Gate 1 and Gate 2 require an attended terminal');
      terminal = createInterface({ input, output });
      terminal.on('SIGINT', cancel);
      ask = (question) => terminal.question(question, { signal: controller.signal });
    }
    const executeLoop = run ?? prepare ?? (await import('./lifecycle.mjs')).runAttended;
    const result = await executeLoop({
      root: process.cwd(),
      issue,
      specPath,
      target: 'react-vitest',
      acceptanceKinds: kinds.split(','),
      signal: controller.signal,
      gate1: async (review) => {
        write(
          `Gate 1: review every task, file, wave and PR group before execution.\n${JSON.stringify(review, null, 2)}\n`
        );
        while (true) {
          const decision = (await ask('approve / revise / stop: ')).trim().toLowerCase();
          if (['approve', 'revise', 'stop'].includes(decision)) {
            return { decision, feedback: decision === 'revise' ? await ask('Revision feedback: ') : '' };
          }
          write('Invalid decision; enter approve, revise, or stop.\n');
        }
      },
      gate2: async (review) => {
        write(
          `Gate 2: the human must commit and push each staged worktree before answering publish. The harness never commits or pushes. Review the exact trees and evidence:\n${JSON.stringify(review, null, 2)}\n`
        );
        while (true) {
          const decision = (await ask('publish / stop: ')).trim().toLowerCase();
          if (['publish', 'stop'].includes(decision)) return { decision };
          write('Invalid decision; enter publish or stop.\n');
        }
      },
    });
    write(`${JSON.stringify(result, null, 2)}\n`);
    code = ['stopped', 'pr-opened'].includes(result.status) ? 0 : 1;
  } catch (error) {
    write(`Preparation failed: ${error.message}\n`);
  } finally {
    process.removeListener('SIGINT', cancel);
    terminal?.close();
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}
