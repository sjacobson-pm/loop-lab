#!/usr/bin/env node
// check-plan.mjs
//
// Judges a plan against the story that commissioned it, and assembles the
// planner leg's verdict. Runs in post-steps, after the agent has exited and
// outside anything it can reach.
//
//   node check-plan.mjs --story stories/US-001.md \
//                       --plan plans/US-001.plan.json \
//                       --task-id T-030 --attempt 1 --out verdict.json
//
// Exit 0 for any plan outcome, good or bad: a rejected plan is a leg result,
// not a leg failure. Exit 1 only when the harness itself is broken - an
// unreadable story, a bad argument - because that is not something the loop
// should try to repair by planning again.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    story: { type: 'string' },
    plan: { type: 'string' },
    'task-id': { type: 'string' },
    attempt: { type: 'string', default: '1' },
    out: { type: 'string', default: 'verdict.json' },
  },
});

function fault(message) {
  console.error(`check-plan: ${message}`);
  process.exit(1);
}

for (const required of ['story', 'plan', 'task-id']) {
  if (!args[required]) fault(`--${required} is required`);
}
if (!existsSync(args.story)) fault(`story not found: ${args.story}`);

// ---------------------------------------------------------------------------
// Story: the authority on which criteria this plan must cover.
// ---------------------------------------------------------------------------

const storyText = readFileSync(args.story, 'utf8');

// Anchors are cited in the Criteria section as `path#anchor` in backticks.
// Nothing else in the story counts, so a criterion mentioned in prose or in
// the acceptance section is not a criterion.
function citedCriteria(text) {
  const section = text.match(/^##\s+Criteria\s*$([\s\S]*?)(?=^##\s|\Z)/m);
  if (!section) fault(`story has no "## Criteria" section: ${args.story}`);

  const anchors = [...section[1].matchAll(/`([^`\s]+#[^`\s]+)`/g)].map((m) => m[1]);
  if (anchors.length === 0) fault(`story cites no criteria: ${args.story}`);

  const seen = new Set();
  const duplicates = anchors.filter((a) => (seen.has(a) ? true : (seen.add(a), false)));
  if (duplicates.length > 0) {
    fault(`story cites the same criterion twice: ${[...new Set(duplicates)].join(', ')}`);
  }

  return anchors;
}

const expected = citedCriteria(storyText);
const storyId = (storyText.match(/^id:\s*(\S+)\s*$/m) ?? [])[1];

// ---------------------------------------------------------------------------
// Verdict assembly
// ---------------------------------------------------------------------------

const codes = new Set();
const atFault = new Set();

const flag = (code, criteria = []) => {
  codes.add(code);
  for (const c of criteria) atFault.add(c);
};

const BLOCK_REASONS = new Set([
  'missing_anchor',
  'contradictory_criteria',
  'unobservable_criterion',
  'out_of_scope_required',
]);

if (!existsSync(args.plan)) {
  flag('missing_plan');
} else {
  let plan;
  try {
    plan = JSON.parse(readFileSync(args.plan, 'utf8'));
  } catch (error) {
    flag('malformed_plan');
    console.error(`plan is not valid JSON: ${error.message}`);
  }

  if (plan?.blocked === true) {
    // The planner declared it could not proceed. Trust the report, but check
    // that it is well formed - a block with no reason is not actionable.
    const reason = String(plan.reason_code ?? '');
    if (!BLOCK_REASONS.has(reason)) {
      flag('malformed_block');
    } else {
      flag(reason, plan.blocked_criteria ?? []);
    }
    if (!Array.isArray(plan.blocked_criteria) || plan.blocked_criteria.length === 0) {
      flag('malformed_block');
    }
  } else if (plan) {
    if (storyId && plan.story_id !== storyId) flag('wrong_story');

    const claimed = Array.isArray(plan.criteria) ? plan.criteria : [];
    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    const taskIds = new Set(tasks.map((t) => t?.id).filter(Boolean));

    // 1. Exactly the cited criteria, no more, no fewer, each once.
    const claimedAnchors = claimed.map((c) => c?.anchor);
    const counts = new Map();
    for (const a of claimedAnchors) counts.set(a, (counts.get(a) ?? 0) + 1);

    const missing = expected.filter((a) => !counts.has(a));
    const extra = [...counts.keys()].filter((a) => !expected.includes(a));
    const repeated = [...counts.entries()].filter(([, n]) => n > 1).map(([a]) => a);

    if (missing.length > 0) flag('missing_criteria', missing);
    if (extra.length > 0) flag('extra_criteria', extra);
    if (repeated.length > 0) flag('duplicate_criteria', repeated);

    // 2. Single-repo story: everything is primary.
    const notPrimary = claimed.filter((c) => c?.coverage !== 'primary').map((c) => c?.anchor);
    if (notPrimary.length > 0) flag('bad_coverage', notPrimary);

    // 3. Every criterion names tasks, and they all resolve.
    const empty = claimed
      .filter((c) => !Array.isArray(c?.tasks) || c.tasks.length === 0)
      .map((c) => c?.anchor);
    if (empty.length > 0) flag('no_tasks', empty);

    const unresolved = claimed
      .filter((c) => (c?.tasks ?? []).some((id) => !taskIds.has(id)))
      .map((c) => c?.anchor);
    if (unresolved.length > 0) flag('unresolved_task', unresolved);

    // 4. No task exists that no criterion needs.
    const referenced = new Set(claimed.flatMap((c) => c?.tasks ?? []));
    const orphans = [...taskIds].filter((id) => !referenced.has(id));
    if (orphans.length > 0) flag('orphan_task');

    // 5. Each criterion owns at least one task no other criterion claims.
    //    Without this, a plan can link every criterion to the same two tasks
    //    and satisfy every check above while carrying no information about
    //    which work discharges which criterion.
    const useCount = new Map();
    for (const id of claimed.flatMap((c) => c?.tasks ?? [])) {
      useCount.set(id, (useCount.get(id) ?? 0) + 1);
    }
    const indistinct = claimed
      .filter((c) => !(c?.tasks ?? []).some((id) => useCount.get(id) === 1))
      .map((c) => c?.anchor);
    if (indistinct.length > 0) flag('no_distinguishing_task', indistinct);
  }
}

const outcome = codes.size === 0 ? 'pass' : 'fail';

const verdict = {
  task_id: args['task-id'],
  attempt: Number(args.attempt),
  leg: 'plan',
  outcome,
  facts:
    outcome === 'pass'
      ? {}
      : {
          reason_codes: [...codes].sort(),
          at_fault_criteria: [...atFault].sort(),
        },
};

writeFileSync(args.out, `${JSON.stringify(verdict, null, 2)}\n`);

console.log(`plan ${outcome}: ${expected.length} criteria cited by ${args.story}`);
if (outcome === 'fail') {
  console.log(`  reasons: ${[...codes].sort().join(', ')}`);
  if (atFault.size > 0) console.log(`  at fault: ${[...atFault].sort().join(', ')}`);
}
