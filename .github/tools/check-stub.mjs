#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "task-id": { type: "string" },
    attempt: { type: "string" },
    outcomes: { type: "string", default: "pass" },
    work: { type: "string" },
    out: { type: "string", default: "verdict.json" },
  },
});

const attempt = Number(values.attempt);
if (!Number.isInteger(attempt) || attempt < 1) {
  console.error("attempt must be a positive integer");
  process.exit(1);
}

// The stub's one real check: the agent step must have left a work product.
if (!values.work || !existsSync(values.work)) {
  console.error(`no work product at ${values.work}`);
  process.exit(1);
}
const workLines = readFileSync(values.work, "utf8")
  .split("\n")
  .filter((l) => l.trim() !== "").length;

const script = values.outcomes
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const outcome = script[attempt - 1] ?? script.at(-1);
if (!["pass", "fail"].includes(outcome)) {
  console.error(`bad scripted outcome "${outcome}" at attempt ${attempt}`);
  process.exit(1);
}

const failing = outcome === "fail";
const verdict = {
  task_id: values["task-id"],
  leg: "stub",
  outcome,
  facts: {
    violated_rules: failing ? ["STUB-01"] : [],
    criterion_ids: failing ? ["demo.md#stub-criterion"] : [],
    work_lines: workLines,
  },
};

writeFileSync(values.out, JSON.stringify(verdict, null, 2) + "\n");
console.log(
  `stub verdict: ${outcome} (attempt ${attempt} of [${script.join(", ")}])`,
);
