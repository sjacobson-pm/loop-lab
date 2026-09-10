#!/usr/bin/env node
// loop-decide.mjs
//
// Sole authority for loop continuation. Reads a leg verdict and the task
// ledger, decides what happens next, appends to the ledger, and prints one
// JSON object to stdout for the controller to act on.
//
// Nothing here is reachable by an agent: the controller runs it from the
// default branch, and it is invoked by plain Actions YAML.
//
//   node loop-decide.mjs --verdict <path|none> --state-dir <dir>
//                        [--task-id <id>] [--config <path>] [--run-id <id>]
//
// stdout: { task_id, attempt, decision, next_leg, signature, reason }
//   decision ∈ run | pass | fail | breaker
//
// Exit 0 on a decision (including fail/breaker). Exit 1 only on malformed
// input, which is a bug rather than a loop outcome.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const DONE = "__done__";

const { values: args } = parseArgs({
  options: {
    verdict: { type: "string" },
    "state-dir": { type: "string" },
    "task-id": { type: "string", default: "" },
    config: { type: "string", default: ".loop/legs.json" },
    "controller-run-id": { type: "string", default: "" },
    "run-id": { type: "string", default: "" },
    fixture: { type: "string", default: "" },
  },
});

const NORMALIZERS = {
  identifiers: (value) =>
    [
      ...new Set(
        toList(value)
          .map((v) => String(v).trim())
          .filter(Boolean),
      ),
    ]
      .sort()
      .join(","),
  test_output: (value) =>
    [...new Set(toList(value).map((v) => normalizeText(v)))].sort().join(","),
};

const toList = (value) =>
  value === null || value === undefined
    ? []
    : Array.isArray(value)
      ? value
      : [value];

function die(message) {
  console.error(`loop-decide: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    die(`could not read JSON from ${path}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Signature normalization
//
// Collapses the incidental parts of a failure so that "the same thing failed
// the same way" produces the same string. Deliberately aggressive: a false
// match halts a loop that might have recovered, which costs one manual
// restart. A false miss lets an unproductive loop burn its whole budget.
// ---------------------------------------------------------------------------

function normalizeText(input) {
  return String(input ?? "")
    .replace(/[A-Za-z]:\\[^\s:]+|\/[^\s:]+\//g, "<path>") // win + posix paths
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      "<guid>",
    )
    .replace(/\b[0-9a-f]{7,40}\b/gi, "<hex>") // shas, hashes
    .replace(/\b\d+(\.\d+)?(ms|s|m)\b/g, "<duration>")
    .replace(/:\d+(:\d+)?\b/g, ":<line>") // file.cs:47, file.cs:47:12
    .replace(/\bline \d+\b/gi, "line <line>")
    .replace(/\b\d{4}-\d{2}-\d{2}[T\s][\d:.]+/g, "<timestamp>")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function computeSignature(leg, facts, spec) {
  const normalize = NORMALIZERS[spec.normalize];
  if (!normalize)
    die(`leg "${leg}" declares unknown normalizer "${spec.normalize}"`);

  const parts = spec.signature.map(
    (field) => `${field}=${normalize(facts?.[field])}`,
  );
  const canonical = [leg, ...parts].join("|");

  if (process.env.LOOP_EXPLAIN) console.error(`canonical: ${canonical}`);

  const digest = createHash("sha256")
    .update(canonical)
    .digest("hex")
    .slice(0, 12);
  const first = facts?.[spec.signature[0]];
  const label = Array.isArray(first)
    ? `${first.length}x`
    : String(first ?? "none")
        .replace(/[^a-z0-9]+/gi, "")
        .slice(0, 12)
        .toLowerCase() || "none";

  return { signature: `${leg}:${label}:${digest}`, canonical };
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

function emptyLedger(taskId) {
  return {
    task_id: taskId,
    created_at: new Date().toISOString(),
    fixture: null,
    status: "running",
    current_leg: null,
    total: 0,
    cycles: {}, // "to<-from" -> count of backward transitions
    signatures: {}, // leg -> [signature, ...] in order observed
    history: [], // append-only
  };
}

function ledgerPath(stateDir, taskId) {
  return join(stateDir, "tasks", `${taskId}.json`);
}

function archive(path) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(dirname(path), "archive", `${taskId}-${stamp}.json`);
  mkdirSync(dirname(target), { recursive: true });
  renameSync(path, target);
}

function save(path, ledger) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(ledger, null, 2)}\n`);
}

function emit(decision) {
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------

const stateDir = args["state-dir"] ?? die("--state-dir is required");
const config = readJson(args.config);
const fresh = !args.verdict;

let verdict = null;
let taskId = args["task-id"]?.trim() || "";

if (!fresh) {
  verdict = readJson(args.verdict);
  // Task identity travels in the artifact: workflow_run payloads carry no
  // dispatch inputs, so this is the only place it can come from.
  const fromVerdict = verdict.task_id?.trim();
  if (!fromVerdict) die("verdict is missing task_id");
  if (taskId && taskId !== fromVerdict) {
    die(`task_id mismatch: input ${taskId}, verdict ${fromVerdict}`);
  }
  taskId = fromVerdict;
}

if (!taskId) die("no task_id from --task-id or verdict");

const path = ledgerPath(stateDir, taskId);
let ledger;

if (fresh) {
  if (existsSync(path)) {
    const prior = readJson(path);
    if (prior.status === "running") {
      die(
        `task ${taskId} is already running (leg ${prior.current_leg}); halt it before restarting`,
      );
    }
    archive(path);
  }
  ledger = emptyLedger(taskId);
  ledger.fixture = args.fixture || null;

  const entry = config.entry;
  if (!config.legs[entry]) die(`entry leg "${entry}" is not defined in legs`);

  ledger.current_leg = entry;
  ledger.total = 1;
  ledger.history.push({
    at: new Date().toISOString(),
    attempt: 1,
    leg: entry,
    outcome: null,
    signature: null,
    decision: "run",
    reason: "task started",
    run_id: args["run-id"] || null,
    controller_run_id: args["controller-run-id"] || null,
  });
  save(path, ledger);

  emit({
    task_id: taskId,
    attempt: 1,
    next_attempt: 1,
    decision: "run",
    next_leg: config.legs[entry].workflow,
    signature: null,
    reason: `starting at ${entry}`,
  });
}

// --- Judging a finished leg ------------------------------------------------

if (!existsSync(path))
  die(`no ledger for task ${taskId}; was it started via workflow_dispatch?`);
ledger = readJson(path);

if (ledger.status !== "running") {
  die(`task ${taskId} is already ${ledger.status}; refusing to advance`);
}

const leg = verdict.leg?.trim();
if (!leg) die("verdict is missing leg");
if (!config.legs[leg]) die(`verdict names unknown leg "${leg}"`);
if (leg !== ledger.current_leg) {
  die(`verdict is for leg "${leg}" but ledger expects "${ledger.current_leg}"`);
}

const outcome = verdict.outcome?.trim();
if (!outcome) die("verdict is missing outcome");

// Signature only means something for a failure.
const spec = config.legs[leg].facts;
if (!spec) die(`leg "${leg}" has no facts declaration in legs.json`);

let signature = null;
if (outcome !== "pass") {
  const missing = spec.required.filter(
    (f) => verdict.facts?.[f] === undefined || verdict.facts?.[f] === null,
  );

  if (missing.length > 0) {
    abort(`${leg} verdict is missing required facts: ${missing.join(", ")}`);
  }

  ({ signature } = computeSignature(leg, verdict.facts, spec));
}

const attempt = ledger.total;

function abort(reason) {
  ledger.history.push({
    at: new Date().toISOString(),
    attempt: ledger.total,
    leg: ledger.current_leg,
    outcome: null,
    signature: null,
    decision: "error",
    reason,
    run_id: args["run-id"] || null,
    controller_run_id: args["controller-run-id"] || null,
  });
  ledger.status = "error";
  save(path, ledger);
  console.error(`loop-decide: ${reason}`);
  process.exit(1);
}

function conclude(decision, reason, nextLeg = null) {
  ledger.history.push({
    at: new Date().toISOString(),
    attempt,
    leg,
    outcome,
    signature,
    decision,
    reason,
    run_id: args["run-id"] || null,
    controller_run_id: args["controller-run-id"] || null,
  });

  if (signature) {
    (ledger.signatures[leg] ??= []).push(signature);
  }

  ledger.status = decision === "run" ? "running" : decision;
  if (decision === "run") ledger.current_leg = nextLeg;

  save(path, ledger);

  emit({
    task_id: taskId,
    attempt,
    next_attempt: decision === "run" ? ledger.total : null,
    decision,
    next_leg: decision === "run" ? config.legs[nextLeg].workflow : null,
    signature,
    reason,
  });
}

// 1. Breaker first. A repeat signature means no new information is being
//    produced; remaining budget is irrelevant. Scoped within a leg, and
//    checked against the full history of that leg rather than the last
//    entry, so alternating failures still trip.
if (signature && (ledger.signatures[leg] ?? []).includes(signature)) {
  const priorAt = ledger.signatures[leg].indexOf(signature) + 1;
  conclude(
    "breaker",
    `signature ${signature} already seen at ${leg} occurrence ${priorAt}`,
  );
}

// 2. Route.
const transition = config.transitions.find(
  (t) => t.from === leg && t.on === outcome,
);
if (!transition) die(`no transition from "${leg}" on "${outcome}"`);

if (transition.to === DONE) {
  conclude("pass", `${leg} reported ${outcome}; pipeline complete`);
}

if (!config.legs[transition.to])
  die(`transition targets unknown leg "${transition.to}"`);

// 3. Budgets. Forward progress is free; only repair cycles are charged.
if (transition.kind === "backward") {
  const key = `${transition.to}<-${transition.from}`;
  const used = ledger.cycles[key] ?? 0;
  ledger.cycles[key] = used;

  if (used >= config.budgets.cycle) {
    conclude(
      "fail",
      `cycle ${key} exhausted after ${config.budgets.cycle} repairs`,
    );
  }

  ledger.cycles[key] = used + 1;
}

// Backstop against oscillation that no single cycle counter would catch.
ledger.total += 1;
if (ledger.total > config.budgets.total) {
  conclude(
    "fail",
    `task exceeded ${config.budgets.total} total leg executions`,
  );
}

conclude(
  "run",
  `${leg} reported ${outcome}; routing ${transition.kind} to ${transition.to}`,
  transition.to,
);
