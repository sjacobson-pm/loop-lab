#!/usr/bin/env node
// Scratch: prints the shape of a vitest JSON reporter file so the
// check-implement parser can be written against the real schema.
import { existsSync, readFileSync } from "node:fs";

const file = process.argv[2];
if (!existsSync(file)) {
  console.log(`no results file at ${file}`);
  console.log("this is the unrunnable case and is itself a finding");
  process.exit(0);
}

const r = JSON.parse(readFileSync(file, "utf8"));
console.log("top-level keys", Object.keys(r).join(" "));
console.log("numTotalTests", r.numTotalTests);
console.log("numPassedTests", r.numPassedTests);
console.log("numFailedTests", r.numFailedTests);
console.log("testResults length", r.testResults?.length);

const f = r.testResults?.[0] ?? {};
console.log("--- first file, trimmed ---");
console.log(
  JSON.stringify(
    {
      name: f.name,
      status: f.status,
      message: (f.message ?? "").slice(0, 400),
      assertionResults: (f.assertionResults ?? []).slice(0, 3),
    },
    null,
    2,
  ).slice(0, 2000),
);
