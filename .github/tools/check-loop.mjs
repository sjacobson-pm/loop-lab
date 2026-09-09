#!/usr/bin/env node
// check-loop.mjs
//
// Verifies the controller's decision logic against the committed baselines.
//
//   node .github/tools/check-loop.mjs                 # drive every sequence locally
//   node .github/tools/check-loop.mjs --only breaker-repeat
//   node .github/tools/check-loop.mjs --ledger ../loop-lab-state/tasks/T-015.json \
//                                     --expected budget-exhaust
//
// Drive mode stands in for the stub leg: it reads a sequence fixture, feeds
// entries to loop-decide.mjs one at a time, and follows next_attempt exactly
// as the controller does. No runner, no cost, no network.
//
// Signatures are compared as equality classes rather than literal hashes, so
// retuning normalization does not invalidate the baselines - only a change
// that alters which failures collide will fail a case.

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    script: { type: "string", default: ".github/tools/loop-decide.mjs" },
    config: { type: "string", default: ".loop/legs.json" },
    sequences: { type: "string", default: "tests/fixtures/sequences" },
    expected: { type: "string", default: "tests/fixtures/expected" },
    case: { type: "string" },
    only: { type: "string" },
    ledger: { type: "string" },
    verbose: { type: "boolean", default: false },
  },
});

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const config = readJson(args.config);

// Reverse the leg -> workflow map so a decision's next_leg (a workflow
// filename) can be turned back into a leg name.
const legByWorkflow = new Map(
  Object.entries(config.legs).map(([leg, def]) => [def.workflow, leg]),
);

const GUARD = 50;

// ---------------------------------------------------------------------------

function runDecide(argv) {
  const out = execFileSync(
    "node",
    [args.script, "--config", args.config, ...argv],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", args.verbose ? "inherit" : "pipe"],
    },
  );
  return JSON.parse(out);
}

function drive(name) {
  const sequence = readJson(join(args.sequences, `${name}.json`));
  const dir = mkdtempSync(join(tmpdir(), "loop-check-"));
  const taskId = `CHK-${name}`;

  try {
    mkdirSync(join(dir, "tasks"), { recursive: true });

    let decision = runDecide([
      "--task-id",
      taskId,
      "--fixture",
      name,
      "--state-dir",
      dir,
    ]);
    let guard = 0;

    while (decision.decision === "run") {
      if (++guard > GUARD)
        throw new Error(`loop did not terminate within ${GUARD} iterations`);

      const attempt = decision.next_attempt;
      const leg = legByWorkflow.get(decision.next_leg);
      if (!leg)
        throw new Error(
          `decision names unknown workflow "${decision.next_leg}"`,
        );

      // Same over-run check the stub leg performs, for the same reason: it
      // means the controller kept dispatching past the end of the script.
      if (attempt > sequence.entries.length) {
        throw new Error(
          `attempt ${attempt} exceeds ${sequence.entries.length} entries - counter is not advancing correctly`,
        );
      }

      const verdictPath = join(dir, "verdict.json");
      writeFileSync(
        verdictPath,
        JSON.stringify({
          ...sequence.entries[attempt - 1],
          task_id: taskId,
          attempt,
          leg,
        }),
      );

      decision = runDecide(["--verdict", verdictPath, "--state-dir", dir]);
    }

    return readJson(join(dir, "tasks", `${taskId}.json`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------

function compare(ledger, expect) {
  const problems = [];
  const eq = (label, actual, wanted) => {
    if (actual !== wanted)
      problems.push(
        `${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(wanted)}`,
      );
  };

  eq("status", ledger.status, expect.status);
  eq("total", ledger.total, expect.total);

  const cycleKeys = new Set([
    ...Object.keys(ledger.cycles ?? {}),
    ...Object.keys(expect.cycles ?? {}),
  ]);
  for (const key of cycleKeys) {
    eq(`cycles[${key}]`, ledger.cycles?.[key] ?? 0, expect.cycles?.[key] ?? 0);
  }

  if (ledger.history.length !== expect.history.length) {
    problems.push(
      `history length: got ${ledger.history.length}, want ${expect.history.length}`,
    );
    return problems;
  }

  // Class letter -> signature, and signature -> class letter. Both directions
  // are needed: the first catches signatures that should match and don't, the
  // second catches signatures that should differ and don't.
  const byClass = new Map();
  const bySignature = new Map();

  expect.history.forEach((want, i) => {
    const got = ledger.history[i];
    const at = `history[${i}]`;

    eq(`${at}.attempt`, got.attempt, want.attempt);
    eq(`${at}.leg`, got.leg, want.leg);
    eq(`${at}.outcome`, got.outcome, want.outcome);
    eq(`${at}.decision`, got.decision, want.decision);

    const cls = want.signature_class;
    if (cls === null || cls === undefined) {
      if (got.signature !== null)
        problems.push(`${at}.signature: got ${got.signature}, want null`);
      return;
    }

    if (got.signature === null) {
      problems.push(
        `${at}.signature: got null, want a signature in class ${cls}`,
      );
      return;
    }

    if (byClass.has(cls) && byClass.get(cls) !== got.signature) {
      problems.push(
        `${at}.signature: class ${cls} was ${byClass.get(cls)} but is now ${got.signature} - signatures that should collide no longer do`,
      );
    }
    if (
      bySignature.has(got.signature) &&
      bySignature.get(got.signature) !== cls
    ) {
      problems.push(
        `${at}.signature: ${got.signature} is class ${cls} here but ${bySignature.get(got.signature)} earlier - signatures that should differ now collide`,
      );
    }

    byClass.set(cls, got.signature);
    bySignature.set(got.signature, cls);
  });

  return problems;
}

// ---------------------------------------------------------------------------

const cases = args.ledger
  ? [
      {
        name: args.case ?? basename(args.ledger, ".json"),
        ledger: readJson(args.ledger),
      },
    ]
  : (args.only
      ? [args.only]
      : readdirSync(args.expected)
          .filter((f) => f.endsWith(".json"))
          .map((f) => basename(f, ".json"))
    ).map((name) => ({ name }));

let failed = 0;

for (const item of cases) {
  const expect = readJson(join(args.expected, `${item.name}.json`));
  let problems;

  try {
    const ledger = item.ledger ?? drive(item.name);
    problems = compare(ledger, expect);
  } catch (error) {
    problems = [error.message];
  }

  if (problems.length === 0) {
    console.log(`  ok    ${item.name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${item.name}`);
    for (const problem of problems) console.log(`          ${problem}`);
  }
}

console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed === 0 ? 0 : 1);
