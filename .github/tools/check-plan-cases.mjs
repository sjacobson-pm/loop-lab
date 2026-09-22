#!/usr/bin/env node
// check-plan-cases.mjs
//
// Runs check-plan.mjs against the committed plan fixtures and compares the
// verdict it produces to the expected one.
//
//   node .github/tools/check-plan-cases.mjs
//   node .github/tools/check-plan-cases.mjs --only false-block
//
// Each case is a directory under .loop/fixtures/plans containing expect.json
// and usually plan.json. A case with no plan.json exercises the path where the
// agent died before writing anything.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    script: { type: 'string', default: '.github/tools/check-plan.mjs' },
    cases: { type: 'string', default: '.loop/fixtures/plans' },
    stories: { type: 'string', default: '.loop/fixtures/stories' },
    only: { type: 'string' },
    verbose: { type: 'boolean', default: false },
  },
});

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const sorted = (v) => [...(v ?? [])].sort();

function run(caseName) {
  const dir = join(args.cases, caseName);
  const expect = readJson(join(dir, 'expect.json'));
  const out = mkdtempSync(join(tmpdir(), 'plan-case-'));

  try {
    const verdictPath = join(out, 'verdict.json');

    execFileSync(
      'node',
      [
        args.script,
        '--story', join(args.stories, `${expect.story}.md`),
        '--plan', join(dir, 'plan.json'),
        '--task-id', `CHK-${caseName}`,
        '--out', verdictPath,
      ],
      { encoding: 'utf8', stdio: ['ignore', args.verbose ? 'inherit' : 'pipe', 'pipe'] },
    );

    const verdict = readJson(verdictPath);
    const problems = [];

    if (verdict.outcome !== expect.outcome) {
      problems.push(`outcome: got ${verdict.outcome}, want ${expect.outcome}`);
    }

    const gotCodes = sorted(verdict.facts?.reason_codes).join(',');
    const wantCodes = sorted(expect.reason_codes).join(',');
    if (gotCodes !== wantCodes) {
      problems.push(`reason_codes: got [${gotCodes}], want [${wantCodes}]`);
    }

    const gotFault = sorted(verdict.facts?.at_fault_criteria).join(',');
    const wantFault = sorted(expect.at_fault_criteria).join(',');
    if (gotFault !== wantFault) {
      problems.push(`at_fault_criteria: got [${gotFault}], want [${wantFault}]`);
    }

    return problems;
  } catch (error) {
    // check-plan.mjs exits non-zero only on a harness fault. Any case that
    // triggers one is a bug in the fixture or the checker, not a plan outcome.
    return [`check-plan exited non-zero: ${(error.stderr || error.message).toString().trim()}`];
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

const names = args.only
  ? [args.only]
  : readdirSync(args.cases, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(args.cases, e.name, 'expect.json')))
      .map((e) => e.name)
      .sort();

let failed = 0;

for (const name of names) {
  const problems = run(name);
  if (problems.length === 0) {
    console.log(`  ok    ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    for (const p of problems) console.log(`          ${p}`);
  }
}

console.log(`\n${names.length - failed}/${names.length} passed`);
process.exit(failed === 0 ? 0 : 1);
