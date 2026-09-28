# Loop module contracts

The criteria extractor and wave planner remain pure.
Neither invokes agents, reads files, loads remote resources, writes artifacts, or calls a host/session API.
Their callers supply strings and arrays; tests read the reference HTML.
Tasks 3 and 4 add pure plan validation, dependency-component PR grouping and fence
policy, plus separate orchestration/Git adapters. Task 5 supplies target-neutral
verdict policy (`results.mjs`), structured errors (`vitest-reporter.mjs`),
cross-checked normalization (`vitest-results.mjs`), supervised argv execution
(`process.mjs`), and target setup/test/report cleanup (`runner.mjs`).
Task 9 connects the attended CLI to post-Gate 1 execution and publication.
Task 6 sequencing, patches, wave barriers, and the disposable workspace
adapter are implemented. Task 7 adds read-only independent review and a
separate human Gate 1 re-entry API; its live-agent path has not been exercised.
Task 8's deterministic in-session termination limits and neutral usage evidence
are complete. The optional external Copilot credit ceiling remains unverified
and disabled pending separate live-probe approval.
Task 9 publication is implemented in module/CLI tests but has not had live
attended acceptance. Plugin delivery and .NET portability remain pending.
See the [attended runner](../README.md) for the real host boundary and limitations.

## Preparation and fence APIs

- `validatePlan(plan, index, targetIds)` validates citations, exact portable file
  declarations, public surfaces and graph structure, and recomputes waves.
- `groupPullRequests(tasks)` computes weak dependency components in stable input
  order; shared files alone do not merge independent components.
- `classifyPaths(paths, testPathspecs, match)` uses one supplied Git matcher.
- `auditWrites({ leg, changes, declaredFiles, testFiles, protectedFiles })` returns
  structured violations and considers both rename endpoints.
- `workspace.mjs` supplies the actual Git matcher, canonical preventive paths,
  content/index snapshots and telemetry-union audit. It is an I/O adapter, not a
  pure module or part of the Copilot-specific host.
- `prepareLoop(input, ports)` performs deterministic preparation through Gate 1
  using injected artifact, decomposition, context and gate ports. A successful
  transport without a clean audit never reaches approval.
- `reenterGate1(input, ports)` surfaces drained decomposition findings to the
  human, invalidates the old approval, and only permits a revised plan after
  validation and a fresh Gate 1 display. It does not start task execution.

## Task sequencing and integration APIs

- `judgeSuite(run)` checks a complete nonempty baseline or integration suite
  without inventing named criterion bindings.
- `validateBindings(bindings, task, testFiles)` validates exact identities,
  ownership and complete anchor coverage, and returns frozen copies.
- `runTask({ task, target, baseline, index, maxRepairs, maxAgentExecutions }, ports)` owns the
  baseline/test/audit/RED/implement/audit/GREEN/review sequence. Reviewed
  repairs revalidate RED/GREEN in the responsible leg and re-review before
  acceptance. Target `budgets` default to `{ cycle: 3, total: 15 }`, with explicit
  overrides for callers. Task-local signature history detects repeated findings
  before a per-route repair or total agent-execution cap is exhausted.
  Authors never certify verdicts; missing audit/snapshot/delta evidence parks work.
- `capturePatch(before, after, files)` uses raw blobs and temporary Git indexes
  to preserve bytes, additions, deletions and rename endpoints without commits.
  `applyPatch(candidate, patch)` preflights hashes and payload paths, checks Git
  application, and verifies the result. Apply only to disposable candidates.
- `runWave({ tasks, target, baseline }, ports)` launches siblings together and
  drains rejections as well as successes. It returns to Gate 1 on ownership
  conflicts or aggregated decomposition findings; failed tasks or integration
  suites cannot advance the baseline. Its evidence aggregates known terminal
  usage and all parked reasons after sibling drain; missing usage is incomplete.
- `resolveLimits(target, overrides)` validates optional target `budgets` and
  resolves the defaults; `beginExecution` counts agent calls and `nextRepair`
  enforces the repeat breaker before backward-route and total budgets.
- `resolveStandards(...)`, `reviewTask(...)`, and `routeFindings(...)` validate
  available review guidance, read-only agent evidence, task-owned anchors and
  deterministic repair priority without allowing reviewer writes.

## Publication APIs

- `createExecution(...).stageGroup({ head, tasks })` replays selected audited
  deltas on a separate disposable worktree, runs a final full suite, creates
  a local branch, and stages only audited delta paths, excluding generated
  criteria/plan files; it never commits or pushes.
- `publicationGroups(plan, issue, publicationBase)` assigns stable, distinct
  branches to dependency-connected components and rejects shared-file claims
  across independent groups. `createLocalPublication(...)` binds the real
  spec/config/plan bytes and local index, HEAD, and branch to each proposal.
- `publishReviewedRun({ run, groups }, ports)` recomputes RED/GREEN/review and
  wave evidence, checks final suites and exact trees, pauses at one Gate 2,
  and confirms local and authenticated remote commit/tree identity before
  accepting each PR URL. `createGitHubPublication(repository, invoke)` supplies
  the literal-argv authenticated transport; API failures remain explicit.
- `runAttended(input)` wires Gate 1, approved waves, Gate 1 re-entry for
  decomposition findings, Gate 2, and disposal. It requires a clean checkout
  before agent cost. A stopped/parked/stale run
  never opens a PR. The two-gate CLI is still a direct diagnostic entrypoint
  until marketplace-plugin delivery is implemented.

## Criteria extraction and the approved selection policy

```js
import { extractCriteria } from './criteria.mjs';

const index = extractCriteria(html, 'spec/pomodoro-workday-timers-spec.html', {
  acceptanceKinds: ['Rule'],
});
// { spec_path, criteria, context }
```

`acceptanceKinds` is required, nonempty, and configurable per call.
Membership uses exact, case-sensitive strings.
There is deliberately no implicit acceptance default.
The human approved `['Rule']` as the recommended initial selection on 2026-09-24, with all other anchored annotations retained in `context`.
This is a selection of **acceptance candidates**, not proof that each candidate applies to the issue or is observable.
Later decomposition/review must still judge relevance against the source.

Every record contains `anchor`, `slot`, `name`, `kind`, `screen`, `detail`, and `text`.
Metadata is copied from the corresponding `data-pd-*` attributes; missing attributes are `null`, while explicitly empty attributes remain empty strings.
The anchor combines the supplied spec path and the exact source ID.
No IDs are derived from names, parent IDs, or list positions.
Both arrays retain document order.
Parent records retain descendant prose even when a child has its own anchor.

The parser uses `.loop`'s own locked `jsdom` dependency with script execution and external resources disabled.
Script/style elements are not records, and their source is excluded from text.
Comments and template-only contents are not document anchors.
Text is entity-decoded and whitespace-normalized, with block/line-break boundaries retained to prevent merged words.
The full annotated subtree supplies `text`, not the abbreviated `data-pd-detail`.

Invalid input, duplicate/invalid document IDs, missing selection, no anchored selected candidates, and unknown anchored selected kinds throw explicit errors.
An unanchored element cannot become a criterion, even if its kind is selected.
Selecting a misspelled additional kind fails rather than silently producing a partial result.
The extractor does not validate source-path existence or repository containment; it performs no filesystem I/O.

### Evidence from the actual package

Source: [pomodoro-workday-timers-spec.html](../../spec/pomodoro-workday-timers-spec.html).
Counts were independently checked using Python's HTML parser and `jsdom` against the static source, without executing its scripts.

There are **31 distinct kinds**, **326 typed elements**, and **295 typed elements with IDs**.
Six additional annotated screen containers have IDs and only `data-pd-screen`, giving **301 anchored records**.
The approved Rule selection produces **25 candidates and 276 context records**.
The other **31 typed elements lack IDs** and cannot be individually cited.
The package has no duplicate or invalid IDs.
These are reference-package observations, not limits hardcoded into the extractor.

| `data-pd-kind`        | Total | With ID | Representative source example                                                  |
| --------------------- | ----: | ------: | ------------------------------------------------------------------------------ |
| Abandonment condition |     1 |       1 | `abandon-timekeeper`: interaction friction causes the user to abandon the tool |
| Branch                |     2 |       2 | `wf-tick-b-autopause`: branch on `autoPauseOnNotification`                     |
| Button                |    39 |      20 | `ui-eod-btn`: enabled when the current day has a timer; opens the summary      |
| Color picker          |     4 |       1 | `add-color-picker`: eight preset swatches                                      |
| Column                |    34 |      34 | `col-settings-id`: singleton key fixed at 1                                    |
| Data table row        |     7 |       7 | `eod-row-104`: sample 87-minute timer rounds to 90                             |
| Decision              |     8 |       8 | `dec-backend-ii`: selected thin C# API without auth                            |
| Entity                |    15 |      15 | `ds-kicker`: single-trust-model context, not a database entity                 |
| Failure path          |     3 |       3 | `wf-tick-fail`: clock, throttling, browser closure, and PATCH failures         |
| Form                  |     4 |       4 | `add-form`: timer fields and POST submission                                   |
| Icon picker           |     3 |       0 | No ID; `data-pd-name="teItemIconPicker-1"` at source line 912                  |
| KPI tile              |     7 |       7 | `main-total`: aggregate elapsed time                                           |
| Modal dialog          |     2 |       2 | `elapse-modal`: sticky modal with two exit actions                             |
| Nav item              |     4 |       4 | `ui-nav-timers`: default landing navigation                                    |
| Number input          |     6 |       6 | `settings-pomo`: positive integer, default 25                                  |
| Open question         |     2 |       2 | `openq-multi-user`: future multi-user migration                                |
| Operation             |    11 |      11 | `op-get-settings`: GET settings contract                                       |
| Permission row        |     5 |       5 | `perm-settings`: implicit-user permissions                                     |
| Persona               |     2 |       2 | `persona-timekeeper`: solo knowledge worker                                    |
| Rule                  |    25 |      25 | `rule-one-running`: at most one running timer per day                          |
| Sample row            |    24 |      24 | `s-set-1`: first-boot settings values                                          |
| Sample table          |     6 |       6 | `sample-table-settings`: settings singleton example                            |
| Scope item            |    33 |      33 | `scope-in-multi-timers`: multiple named timers                                 |
| Template card         |     4 |       4 | `tpl-1`: client weekly template sample                                         |
| Text input            |     9 |       3 | `add-code`: workday code uniqueness, no format constraint                      |
| Text label            |    27 |      27 | `main-date`: localized current-day label                                       |
| Timer card            |     7 |       7 | `timer-101`: paused, exact-boundary rounding example                           |
| Toggle                |     6 |       6 | `settings-autopause`: notification pause preference                            |
| Trigger               |     3 |       3 | `wf-tick-trigger`: explicit start or implicit click-to-switch                  |
| Workflow              |     3 |       3 | `wf-tick`: composite tick/elapse workflow                                      |
| Workflow step         |    20 |      20 | `wf-tick-s1`: local interval and elapsed counter                               |

### Why kind alone is not a semantic verdict

- `Workflow step` includes observable behavior (`wf-tick-s2`: persist every 10 seconds or on pause/switch), algorithm detail (`wf-tick-s1`), and explicit non-goals (`wf-tick-doesnot`, `wf-eod-doesnot`, `wf-tpl-doesnot`).
- `Scope item` includes 18 in-scope entries and 15 exclusions; the containing section explicitly calls in-scope items "a hypothesis, not a commitment".
- `Workflow` is a composite parent containing steps, branches, triggers, and failure paths; treating every parent and child as independent obligations double-counts source content.
- `Rule` is the clearest initial normative kind, but `rules-edge-cases` groups several behaviors under one anchor.
- UI, operation, branch, trigger, and failure-path kinds also contain testable requirements; Rule-only must not discard that context or imply full acceptance coverage for every possible issue.
- `Entity` even labels the `ds-kicker` explanatory paragraph; this taxonomy is descriptive, not a validated requirements schema.

The original plan's single undifferentiated `criteria` array would have promoted every annotation to acceptance status.
The explicit selection plus `context` array corrects that assumption without inventing or dropping source anchors.
If an issue needs a non-Rule requirement, the future decomposition gate must explicitly address it; these modules do not silently change the approved selection.

## Wave planning

```js
import { computeWaves } from './waves.mjs';

const waves = computeWaves([
  { id: 'A', depends_on: [], files_modified: ['src/shared.js'] },
  { id: 'B', depends_on: [], files_modified: ['src/shared.js'] },
  { id: 'C', depends_on: [], files_modified: ['src/other.js'] },
  { id: 'D', depends_on: ['A'], files_modified: ['src/d.js'] },
]);
// [['A', 'C'], ['B'], ['D']]
```

Kahn traversal computes each task's maximum dependency depth.
Tasks are then visited in original input order within each depth.
Greedy first-fit partitions that level: each task joins the earliest stage whose accumulated file set is disjoint.
All stages in a level finish before any stage in the next level.
The result is deterministic, not necessarily the minimum possible number of waves.

The GSD reference algorithms were read only; this implementation is local.
Preserved semantics:

- Exact path equality: `src/a.js`, `src\a.js`, `src/A.js`, and `./src/a.js` are different claims.
- No path normalization, case folding, filesystem lookup, or inferred writes.
- Empty `files_modified` overlaps nothing and joins the first stage of its level.
- File sets are unions across the whole stage; duplicate file entries within one task do not create a self-conflict.
- Stable input order within each dependency level, followed by stable first-fit assignment.

Explicit validation differences from the low-level GSD helpers:

- Duplicate IDs and dependency edges, self-dependencies, unknown dependencies, malformed arrays, and empty/nonstring entries are rejected.
- GSD's graph helper assumes callers have resolved dependencies and skips unknown ones; this public pure API fails closed instead.
- GSD's partitioner allows duplicate IDs as separate items; an executable task DAG cannot unambiguously refer to those, so this API rejects them.
- Cycles and every downstream blocked task produce an error naming the unvisited IDs, not a partially runnable result.
- Kahn queue release order can differ from source order; grouping by computed depth and original input order explicitly enforces the approved stable-order contract.

Rejecting path aliases and enforcing actual writes belong to later validation/fences, not this pure planner.
An empty declaration is not proof that a task is safe to run concurrently.
An empty task array returns `[]`; a singleton returns one wave.
Inputs are not mutated and output arrays are independent across calls.

## Local verification

```powershell
npx vitest run .loop\lib\criteria.test.js .loop\lib\waves.test.js
npm run test:coverage
```

The existing Vitest configuration discovers the colocated tests.
Coverage includes `.loop/lib/**/*.mjs`; the product's existing coverage exclusions are unchanged.
No private package is added by these modules, but the repository's normal `npm ci` still requires its existing Font Awesome credentials.
