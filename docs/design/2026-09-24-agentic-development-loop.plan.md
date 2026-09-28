# Agentic Development Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the human explicitly selects delegation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an attended issue-to-reviewed-PR loop with deterministic enforcement, independent agent legs, dependency-safe parallel tasks, two human gates, and a versioned Copilot marketplace hand-off.

**Architecture:** Pure extraction and wave planning come first; one long-lived Node orchestrator then owns validation, test execution, evidence, fences, routing, and budgets. It spawns GitHub Copilot CLI for the four judgment legs through a replaceable host adapter; subprocesses do not own orchestration state. A versioned marketplace plugin packages that same harness with thin slash-command and agent launchers, while target adapters keep React/Vitest v1 independent of the later .NET port.

**Tech Stack:** Node.js ESM and `child_process`, isolated loop Vitest 3.2.7 (app target unchanged at 3.2.4), JavaScript with JSDoc contracts, Git worktrees, installed GitHub Copilot CLI 1.0.88, Agent Plugins 1.0 and a Git-hosted Copilot marketplace, and existing GitHub authentication; no second agent vendor or npm/Azure Artifacts delivery backend.

**Spec:** [Approved design](2026-09-24-agentic-development-loop.md).

## Global Constraints

The following requirements are copied verbatim from the approved design:

- "Input is a GitHub issue written in prose. The orchestrator maps it to spec anchors itself; the issue does not cite anchors."
- "Exactly two human checkpoints: after decomposition, and at PR creation. Every other step runs without human input."
- "PR granularity is the orchestrator's decision, based on story size."
- "Attended operation. The human starts the loop and can redirect at gates."
- "The human commits and merges. The loop stops at \"PR opened\"."
- "Plugin delivery through a Git-hosted Copilot plugin marketplace is required before hand-off. Each target checkout supplies its own `.loop/targets.json` and spec package; neither entrypoint substitutes a bundled target config."
- "Agents judge; the harness decides"
- "Criteria are cited by anchor and never restated."
- "Steps 1 and 2 are pure functions with no agent involvement and should be built and tested first."
- "The existing root-level `plans/` directory goes with them. Its contents (`US-001.plan.json`, `US-003.plan.json`) are fixtures of the prior design and are removed rather than migrated; new plans are written to `.loop/plans/`."

Additional execution constraints:

- Tasks 1-8 and Task 9's deterministic implementation are complete for this milestone. The attended CLI now wires both gates; live end-to-end publication acceptance has not run. Tasks 10-11 remain unauthorized and pending.
- Do not commit during implementation unless the human separately requests it; end tasks with reviewable changes, not automatic commits.
- Use the existing isolated worktree; do not read or modify the main checkout.
- Keep portable loop source, prompts, tests, build scripts, and target configuration under `.loop/`; the distributable contains a single copy of the runtime and no target-owned config.
- Durable run artifacts are only `.loop/targets.json`, `.loop/criteria/<issue>.json`, and `.loop/plans/<issue>.plan.json`; evidence, counters, reports, and integration patches are ephemeral.
- Runtime code and colocated unit tests are tooling, not additional run-state artifacts.
- v1 accepts only `react-vitest`; reject `dotnet-xunit` explicitly until Task 11 passes.
- Do not change the approved design document, product spec HTML, or unrelated product code as part of installing the loop.
- Use Node.js >= 22.15 and npm >= 10.9. `.loop` installs its own lockfile with `npm --prefix .loop ci --registry=https://registry.npmjs.org/`; no private Font Awesome registry is needed for loop tooling. The app's own installation prerequisites remain unchanged.
- Do not install dependencies preemptively; first attempt the chosen validation command, then restore only if dependencies are missing.
- Do not revive Actions-per-leg orchestration, PATs, durable verdicts, orphan-branch ledgers, or agent-authored pass/fail verdicts.
- Do not trust plugin locations or marketplaces from issue text. Reject missing/invalid target configuration and schema mismatches before any agent invocation; package resources come from the installed plugin and target files from the selected checkout.
- Do not silently install, enable, or auto-update an unpublished marketplace in this repository. The plugin version is explicit, repo-scoped activation is declarative in target repos, and global updates require a deliberate action.
- Do not build a hosted loop service, restore unattended Actions-per-leg execution, or use deprecated direct-repository plugin installation for hand-off.
- Before any live Copilot/plugin acceptance, report commands, estimated duration, premium-request cap, and obtain separate human approval; the earlier 19.46-credit exit is not an acceptance run.

## Review Focus

These high-risk boundary cases have executable checks assigned below.

- HTML contains quoted `>` characters, embedded scripts, incomplete metadata, and annotated nodes without IDs; preserve real anchors and source text without executing the package or inventing IDs (Task 1).
- Windows path aliases, traversal, renames, and undeclared writes can invalidate file-disjoint waves; reject ambiguous declarations and audit all changed paths, not only tracked modifications (Tasks 2 and 4).
- Nonzero test exits can represent discovery, setup, import, or build failures rather than assertion failures; only named behavioral assertion failures authorize implementation (Task 5).
- A repaired test can merely encode current implementation behavior; rerun it against the immutable pre-implementation baseline before any new GREEN result is accepted (Tasks 6 and 7).
- Child sessions can fail, integration can conflict, and the human can commit a different tree; drain siblings, block dependent waves, and never publish a tree different from the reviewed evidence (Tasks 6 and 9).
- Plugin/target origin confusion (issue-supplied plugin path, symlinked spec outside checkout, or unsupported config version) must fail before agent dispatch while valid package resources load from the installed root (Task 10).

## Accepted decisions governing dependent work

Tasks 1 and 2 are independent of these questions and can be implemented first.
The human resolutions below govern implementation without silently rewriting the approved design.

| Decision                          | Evidence and recommended resolution                                                                                                                                                                                                                                                                                           | Blocks                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Callable attended runtime         | RESOLVED on 2026-09-24 and implemented in authorized Task 3: spawn GitHub Copilot CLI with JSONL and `-C`. Exact absolute write denies work; directory/glob rules do not fence subtrees. The authoritative Git/telemetry audit enforces acceptance; optional shell hardening is unavailable on this Windows host.             | Resolved; exact-path prevention is a known limitation      |
| Gate 2 and human commits          | Accepted by the human on 2026-09-24: Gate 2 begins with the reviewed staged tree, the human commits/publishes during that same gate, the harness verifies that exact tree, then opens the PR before the gate ends. One checkpoint, not two.                                                                                   | Implemented; live acceptance pending                       |
| Multiple PRs with two checkpoints | ACCEPTED: harness-computed dependency-connected components each form one PR; independent components are separate PRs. All groups appear at Gate 1 and publish together at Gate 2, preserving two checkpoints.                                                                                                                 | Resolved                                                   |
| .NET assertion meaning            | ACCEPTED, STRICT: escaped NotImplementedException-only failures are INVALID_RED. Require an explicit assertion against the declared observable and a negative regression test for raw stub exceptions.                                                                                                                        | Resolved; implementation deferred to Task 11               |
| Approved spec and Markdown lint   | ACCEPTED: MD040 pipeline language label and MD060 delimiter spacing only; no content wording changes. Existing story MD025 and legacy tooling ESLint failures stay out of scope.                                                                                                                                              | Resolved for spec formatting only                          |
| Acceptance-kind selection         | Accepted by the human on 2026-09-24 after inventorying the real package: callers explicitly supply `acceptanceKinds`; `['Rule']` is the recommended initial selection, with no implicit code default. Preserve all other anchored annotations in `context`. Selected kinds are candidates, not a semantic acceptance verdict. | Resolved for Task 1; later consumers must preserve context |

These decisions are accepted; .NET implementation and PR publication remain outside Tasks 3 and 4.
See [the foundation module documentation](../../.loop/lib/README.md) for all 31 kinds, counts, examples, and the distinctions that motivated selection.

### Accepted decisions superseding earlier recommendations

- **PR granularity: ACCEPTED.** The harness computes weakly connected components of `depends_on` (edges treated as undirected for grouping). Each component is one PR; independent components are separate PRs. All groups appear together at Gate 1 and are published together at Gate 2, preserving exactly two human checkpoints. Agents do not choose the grouping.
- **.NET RED: ACCEPTED, STRICT.** An escaped `NotImplementedException` alone is INVALID_RED. A valid failure must be an explicit assertion against the declared observable. Task 11 must include a negative test rejecting stub-exception-only failures; compilation/stub creation is not evidence of behavioral RED.
- **Spec formatting: ACCEPTED.** Only label the pipeline fence `text` (MD040) and add spacing to the two table delimiter rows (MD060). Preserve every word of content. Legacy story MD025 and `.github/tools` ESLint findings remain out of scope.
- **Plan location: ACCEPTED.** Move this plan with `git mv` to `docs/design/2026-09-24-agentic-development-loop.plan.md`, beside its spec, avoiding a tool-branded documentation path.

The statuses above are the authoritative human decisions. Task 8 is complete with its external credit-ceiling probe deferred and unwired. Task 9's deterministic milestone is complete; live publication acceptance is not run. Tasks 10-11 remain unauthorized.

- **Tooling portability: ACCEPTED.** `.loop/package.json` and its lockfile own `jsdom` and test tooling independently of the React app. Node/npm remain required in .NET repositories; no parser is hand-vendored. The human approved Vitest 3.2.7 only under `.loop`, leaving app dependencies untouched and accepting the documented moderate dev-server advisory for the Node-only test path.
- **Cleanup lifetime: REQUIRED.** Snapshot failures drain all concurrent filesystem/Git operations before propagating the original failure. The reproduced `Promise.all` failure left four real Git children using the worktree; retries and suite serialization are not fixes. After all isolation edits are staged, run the complete suite five consecutive times without edits or installs, retain every exit code/count/failure, and stop on any failure.

Gate 1 re-entry for contradictory anchors or file ownership is expressly allowed by the design.
It is a return to the existing decomposition gate, not a new kind of checkpoint.
Budget exhaustion and infrastructure failure park work and surface diagnostics at the barrier; they must not introduce ad hoc approval prompts between agent legs.

## Grounded repository observations

- `.loop/targets.json` already contains argv arrays and `results_format`; retain those keys.
- `.loop/targets.json` currently declares `$schema_version: 1`; Task 10 introduces version 2 with explicit migration and rejects unknown versions rather than treating them as defaults.
- `react-vitest` is exercised; `dotnet-xunit` is deliberately unexercised and currently has no TRX parser.
- `npm test` is `vitest run`.
- `vite.config.js` discovers `**/*.test.{js,jsx}`, but its coverage include covers only `src/`; add explicit loop coverage rather than assuming the current command measures new tooling.
- Existing tooling is `.mjs`; choose `.mjs` for loop implementation and `.test.js` for discovery by the existing Vitest include.
- Existing `jsdom` is a direct dev dependency; an inert `JSDOM` parse avoids adding an HTML parser dependency in v1.
- The real HTML has `id` plus five `data-pd-*` attributes on `rule-one-running`, `wf-tick-s1`, and `scope-in-multi-timers`.
- It also has annotated buttons without `id`, container IDs with only some metadata, and rule content beyond the abbreviated `data-pd-detail`.
- `.github/tools/check-plan.mjs` warns about raw `>` inside quoted attributes; its old anchor regex is not a criteria extractor and its story-citation requirement is incompatible with prose issues.
- `.github/tools/loop-decide.mjs` normalizes incidental paths, GUIDs, mixed hex IDs, timestamps, locations, and qualified durations; it intentionally preserves bare numbers and bare domain durations.
- Its breaker checks the complete signature history of a leg, not only the previous failure; budgets currently default to cycle `3` and total `15`.
- The GSD dependency module exposes Kahn traversal inside `computeHaltPropagation`; it is not a ready-made dependency-level API.
- The GSD partitioner uses stable input order, greedy first-fit, exact path equality, and lets empty file lists coalesce into stage 0.
- Study those two GSD files read-only; implement the small relevant algorithms locally, not their unrelated summary/ledger plumbing.

## File and responsibility map

Paths below are repository-relative.
Code may serialize Git paths with `/`; filesystem commands in this Windows workspace use `\`.

| Build step    | Files                                                                                                                                                                        | Responsibility                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1             | `.loop/lib/criteria.mjs`, `.loop/lib/criteria.test.js`                                                                                                                       | Pure HTML-to-index projection                                            |
| 2             | `.loop/lib/waves.mjs`, `.loop/lib/waves.test.js`                                                                                                                             | Pure dependency levels and first-fit partition                           |
| 3             | `.loop/lib/plan.mjs`, `.loop/lib/plan.test.js`                                                                                                                               | Validate plan, anchors, ownership, target, and gate identity             |
| 3             | `.loop/lib/orchestrator.mjs`, `.loop/lib/orchestrator.test.js`, `.loop/host.mjs`, `.loop/README.md`, `.loop/prompts/decompose.md`                                            | In-session lifecycle, concrete host binding, invocation and Gate 1       |
| 4             | `.loop/lib/fences.mjs`, `.loop/lib/fences.test.js`                                                                                                                           | Shared pathspec classification and write auditing                        |
| 4             | `.loop/lib/results.mjs`, `.loop/lib/results.test.js`, `.loop/lib/vitest-results.mjs`, `.loop/lib/vitest-results.test.js`, `.loop/lib/runner.mjs`, `.loop/lib/runner.test.js` | Common evidence policy, Vitest parsing, trusted command execution        |
| 4             | `.loop/lib/task.mjs`, `.loop/lib/task.test.js`, `.loop/lib/wave-runner.mjs`, `.loop/lib/wave-runner.test.js`, `.loop/prompts/test.md`, `.loop/prompts/implement.md`          | RED/GREEN ordering, immutable task baseline, concurrency and barrier     |
| 5             | `.loop/lib/review.mjs`, `.loop/lib/review.test.js`, `.loop/prompts/review.md`                                                                                                | Finding validation/routing and standards resolution                      |
| 6             | `.loop/lib/termination.mjs`, `.loop/lib/termination.test.js`                                                                                                                 | Pure signature and budget decisions                                      |
| 7             | `.loop/lib/publication.mjs`, `.loop/lib/publication.test.js`                                                                                                                 | Exact-tree Gate 2 and PR creation                                        |
| 9             | `.loop/lib/trx-results.mjs`, `.loop/lib/trx-results.test.js`, `.loop/lib/dotnet-stubs.mjs`, `.loop/lib/dotnet-stubs.test.js`                                                 | Deferred TRX adapter and narrowly declared deterministic stub generation |
| Cross-cutting | `.loop/targets.json`, `vite.config.js`, `eslint.config.mjs`, `package.json`, `README.md`, `.github/workflows/check-gates.yml`                                                | Target extension, test/lint coverage, invocation docs and non-agent CI   |

Build step 8 / Task 10 is the plugin delivery unit; its exact file-by-file map
is immediately below.

Each `.test.js` lives next to the module it exercises.
Task 3 also creates `.loop/host.test.js` beside `.loop/host.mjs` for subprocess/JSONL contract tests.
Small input/report fixtures belong inline in tests or are generated into test-owned temporary directories, not in a new persistent fixture ledger.
Keep host-specific API calls inside `.loop/host.mjs`; pure modules must not import it.
Task 10 builds a versioned Git-hosted marketplace artifact from the existing `.loop/` runtime; no package registry, Azure Artifacts feed, duplicated harness, or generalized plugin framework is needed.

### Task 10 plugin file boundaries (before implementation)

| File or generated path                                                                             | Sole responsibility                                                                                                                                 |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.loop/plugin/plugin.json`                                                                         | Agent Plugins 1.0 identity (`loop`, initial version `0.1.0`) and schema; no orchestration logic.                                                    |
| `.loop/plugin/com.github.copilot/commands/loop.md`                                                 | Copilot `/loop` input collection and instruction to invoke the installed launcher; never perform agent legs or publish.                             |
| `.loop/plugin/com.github.copilot/agents/loop.agent.md`                                             | Named `loop` agent discoverable via `/agent` and `--agent`, with the same launcher contract and no independent workflow policy.                     |
| `.loop/lib/plugin-invocation.mjs` + `.test.js`                                                     | Normalize checkout, issue coordinates, spec path and acceptance kinds to a single Node argv/cwd contract, reusing existing path validation.         |
| `.loop/plugin/bin/launch.mjs` + `.test.js`                                                         | Resolve bundled runtime relative to `import.meta.url`, validate target config, then call that runtime's existing `runCli`; no forked harness.       |
| `.loop/lib/target-config.mjs` + `.test.js`                                                         | Check `$schema_version: 2` and selected target shape; both direct and packaged entrypoints use this module.                                         |
| `.loop/plugin/build.mjs` + `.test.js`                                                              | Stage only runtime sources and production dependencies in `.loop/dist/marketplace/plugins/loop/`; prove no ambient target dependency is needed.     |
| `.loop/plugin/marketplace.json`                                                                    | Source manifest copied to `.loop/dist/marketplace/.github/plugin/marketplace.json`; relative plugin source `./plugins/loop`.                        |
| `.loop/plugin/examples/repo-settings.json`                                                         | Inert, concrete repo-local `.github/copilot/settings.json` example with test marketplace coordinates, not auto-enabled in loop-lab.                 |
| `.loop/targets.json`, `.loop/attended.mjs`, `.loop/run.mjs`, `.loop/README.md`, `.loop/.gitignore` | Explicit v1-to-v2 config migration, validation before preparation, retained diagnostic CLI, install/release documentation and ignored build output. |

`.loop/dist/marketplace/` is generated, ignored output, not a fourth run artifact; its `.github/plugin/marketplace.json` and `plugins/loop/` directory are the complete Git-hosted marketplace tree that a human may review and publish. The plugin carries runtime `.mjs` files, prompts, a production-only locked `node_modules` tree for `jsdom`, and the two component files; it does **not** carry `.loop/targets.json`, criteria/plans, test tooling, test artifacts, logs, or credentials. The target repository retains only its `.loop/targets.json`, spec package, and optional repository activation settings.

### Verified plugin platform boundary

The approved no-change feasibility spike on Copilot CLI 1.0.88 found that
`--plugin-dir` discovers a plugin, `/env` lists its command and agent, and
`/loop-spike` appears in the command picker. A bundled script located the
plugin root and the target cwd/config; absent config failed closed. Repository
settings auto-installed/activated the plugin only inside the declaring repo,
and global marketplace installation worked. Direct repository installation
warned that it is deprecated. The spike did **not** execute `/loop` through
Gate 1: an accidental 19.46-credit prompt while exiting made no changes and
is not acceptance evidence.

[The CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)
documents Agent Plugins 1.0 `plugin.json` at the plugin root and Copilot-specific
files under `com.github.copilot/commands/` and `com.github.copilot/agents/`.
It documents marketplace manifests at `.github/plugin/marketplace.json`,
relative plugin sources, and `copilot plugin update NAME`. Installed plugin
storage is CLI-managed and is not a launcher path API.
[Repository settings](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference#repository-settings-githubcopilotsettingsjson)
document `enabledPlugins` as `Record<string, boolean>` and
`extraKnownMarketplaces` as a map whose entries require `source`; repo-only
enablement is scoped to that repository. Neither reference establishes a
repository-level plugin-version pin field, so do not invent one. Keep the
marketplace catalog and plugin manifest version equal, release changes
deliberately, disable auto-update for a custom global marketplace unless the
user explicitly opts in, and reject incompatible target config versions
before execution. The actual Git organization/repository and any managed
organization policy are deployment configuration, not runtime flags or
issue-controlled values.

## Resolved host: Copilot CLI and an honest fence boundary

The companion session measured GitHub Copilot CLI 1.0.88 on this machine.
This session independently rechecked `copilot --version`, `copilot help`, `copilot help permissions`, and `copilot help sandbox`.
`copilot` resolves to a native `copilot.exe` on this Windows host, so Node can spawn it without a shell command string.
No paid agent run or sandbox experiment was repeated as part of this plan-only update.
Before implementation relies on any additional flag or tool name, verify it against the installed CLI help.

The long-lived orchestrator retains shared state across short-lived CLI judgment legs.
Unlike the retired Actions conductor, a leg exit does not destroy the orchestrator's memory or require a disk ledger.
Each `-p` invocation is a fresh judgment context; concurrent invocations run in the task worktrees chosen by the deterministic wave planner.

### Concrete host boundary

Only `.loop/host.mjs` knows Copilot executable resolution, CLI flags, permission-pattern syntax, JSONL event names, and event field paths.
Its colocated `.loop/host.test.js` tests the boundary; no pure module imports either file.
The orchestrator receives this neutral contract:

```js
// runAgent({ leg, prompt, worktree, deniedWritePaths, profile, timeoutMs })
//   -> Promise<AgentOutcome>
//
// AgentOutcome = {
//   status: 'completed' | 'failed',
//   sessionId: string | null,
//   exitCode: number | null,
//   messages: string[],
//   toolRequests: { name: string, arguments: unknown }[],
//   reportedWrites: string[] | null,
//   usage: {
//     counters: { name: string, unit: string, value: number }[],
//     apiDurationMs: number | null,
//     durationMs: number | null
//   },
//   diagnostics: { code: string, message: string }[]
// }
```

`profile` names approved per-leg host configuration; it is not agent-controlled argv.
It selects model, reasoning effort, optional credit ceiling, and explicit tool exposure.
Unset tuning stays unset rather than inventing model defaults.
`deniedWritePaths` contains validated absolute paths; the host alone translates them into permission rules.
`reportedWrites: null` means unavailable evidence, not an empty write set.
`completed` means the transport completed successfully, never that tests, fences, or review passed.
Individual tool result schemas were not established by the supplied event sample; retain available denial diagnostics, and verify actual completion events before treating requests as successful writes.
Git inspection and test/review verdicts remain harness-owned outside the host adapter.

The planned argv construction inside `host.mjs` is:

```js
const argv = [
  '-p',
  prompt,
  '--output-format',
  'json',
  '-C',
  worktree,
  '--no-ask-user',
  '--allow-all-tools',
  ...deniedWritePaths.flatMap((path) => ['--deny-tool', `write(${path})`]),
];
if (model !== undefined) argv.push('--model', model);
if (reasoningEffort !== undefined) argv.push('--reasoning-effort', reasoningEffort);
if (maxAiCredits !== undefined) argv.push('--max-ai-credits', String(maxAiCredits));
if (usageOutputFile !== undefined) argv.push('--usage-output-file', usageOutputFile);
const child = spawn(copilotExecutable, argv, {
  cwd: worktree,
  shell: false,
  stdio: ['ignore', 'pipe', 'pipe'],
});
```

All identifiers in this sketch are local to the future host implementation: `spawn` comes from `node:child_process`, `copilotExecutable` is the verified executable, tuning comes from `profile`, and `usageOutputFile` is a harness-owned temporary path.
Never interpolate prompts or filenames into a shell string, pass `--yolo`, or silently broaden filesystem access.
`--allow-all-tools` enables noninteractive tool approval; deny rules still take precedence.
Use verified `--available-tools`/`--excluded-tools` and permission rules to limit actual tool exposure by leg; broad approval is not a requirement to expose every tool.
`--no-ask-user` is mandatory on every automated leg.
Only the attended parent implements Gate 1 and Gate 2.

Read stdout incrementally with UTF-8 decoding across chunk boundaries, splitting complete lines while handling CRLF and an unterminated final line.
Ignore blank lines and tolerate unknown event `type` values; do not assume a fixed event order or count.
Some events carry `ephemeral: true`; this is not a reason to drop a known event's useful payload.
Keep stderr as bounded diagnostics, separate from the JSONL parser.
Malformed JSON, malformed required known events, a missing/duplicate terminal result, timeout, spawn failure, or contradictory process/result exit codes produce a failed outcome.
Do not turn missing data into empty successful evidence.

The measured events needed by the adapter are:

- `assistant.message`: collect `data.content` and every `data.toolRequests[]` entry across the whole run, not just the last message. Normalize actual tool names/arguments into `toolRequests`; do not mistake a requested operation for proof that it succeeded.
- `result`: require the terminal `sessionId`, `exitCode`, and valid usage/report fields. Project `usage.codeChanges.filesModified` into `reportedWrites`, validating every absolute path. This machine-reported list is corroborating evidence, not the sole write authority.

Measured terminal example:

```json
{
  "type": "result",
  "sessionId": "...",
  "exitCode": 0,
  "usage": {
    "premiumRequests": 7.5,
    "totalApiDurationMs": 1161,
    "sessionDurationMs": 4567,
    "codeChanges": { "linesAdded": 0, "linesRemoved": 0, "filesModified": [] }
  }
}
```

Project that usage into a counter `{ name: 'premiumRequests', unit: 'premium-requests', value: 7.5 }` and the neutral duration fields.
Aggregate terminal usage once per invocation, not once per checkpoint/message.
Do not infer dollar costs or equate premium-request units to `--max-ai-credits` without verification.
If `--usage-output-file` is used, read and reconcile its actual schema in the host; never add it to terminal totals a second time.
A failed leg still contributes measured usage, and missing usage is explicitly incomplete accounting.

### Prompt files versus custom agents

Keep `.loop/prompts/*` as the source of judgment-leg instructions; the host reads and combines them with bounded task context for `-p`.
The new plugin's `loop.agent.md` is a thin _entrypoint_ selected by `/agent` or `--agent`, not one of the four judgment legs and not a copy of their prompt policy.
The plugin packages the existing harness and prompt files once; target repositories keep config and spec rather than copying executable `.loop/` source.
`--add-dir` is a trust expansion: it grants directory access and loads that directory's `.github/agents` and `.github/skills` as trusted configuration.
Never add an issue-controlled or arbitrary directory merely to locate prompts.
Tasks 1-7 made no custom-agent change. Task 10 plans only the agreed thin entrypoint, not a refactor of test/implement/review agent prompts.

### Alternatives recorded, not adopted

- `--fleet`: built-in parallel subagent orchestration; unevaluated for this harness and not a replacement for deterministic dependency/overlap waves.
- `--acp`: Agent Client Protocol server mode; unevaluated potential long-lived transport behind the same neutral host boundary.

## Shared contracts

Write JSDoc typedefs adjacent to their owning exported functions.
The following shapes are the integration contract, not optional examples.

```js
// criteria.mjs
// extractCriteria(html: string, specPath: string,
//   options: { acceptanceKinds: string[] }): CriteriaIndex
// CriteriaIndex = { spec_path: string, criteria: Criterion[], context: Criterion[] }
// Criterion = {
//   anchor: string, slot: string | null, name: string | null,
//   kind: string | null, screen: string | null, detail: string | null,
//   text: string
// }
//
// waves.mjs
// computeWaves(tasks: Task[]): string[][]
//
// plan.mjs
// validatePlan(plan: Plan, index: CriteriaIndex, targetIds: string[]): Plan
// Plan = { issue: number, target: string, tasks: Task[], waves: string[][] }
// Task = {
//   id: string, summary: string, criteria: string[], depends_on: string[],
//   files_modified: string[], public_surface: PublicSurface[]
// }
// PublicSurface = {
//   path: string, language: string, namespace: string | null,
//   type: string, member: string, return_type: string,
//   parameters: { name: string, type: string }[]
// }
//
// results.mjs
// NormalizedRun = {
//   exitCode: number | null, complete: boolean,
//   errors: { kind: string, message: string }[], tests: TestResult[]
// }
// TestResult = {
//   id: string, file: string, name: string,
//   status: 'passed' | 'failed' | 'skipped',
//   failureKind: 'assertion' | 'runtime' | null, message: string
// }
// TestBinding = { id: string, file: string, name: string, criteria: string[] }
// judgeRed(run: NormalizedRun, bindings: TestBinding[]):
//   { status: 'RED' | 'INVALID_RED', reasons: string[] }
// judgeGreen(run: NormalizedRun, bindings: TestBinding[]):
//   { status: 'GREEN' | 'INVALID_GREEN', reasons: string[] }
//
// review.mjs
// Finding = {
//   fault_domain: 'decompose' | 'test' | 'implement',
//   code: string, criteria: string[], files: string[], message: string
// }
// routeFindings(findings: Finding[]): 'decompose' | 'test' | 'implement' | 'done'
//
// termination.mjs
// State = {
//   total: number, cycles: Record<string, number>,
//   signatures: Record<string, string[]>
// }
// Limits = { cycle: number, total: number }
// Repair = { from: string, to: string, findings: Finding[] }
// normalizeText(input: unknown): string
// findingSignature(leg: string, findings: Finding[]): string
// nextRepair(state: State, repair: Repair, limits: Limits):
//   { decision: 'run' | 'park', reason: string | null, state: State }
```

`TestBinding` is ephemeral test-leg output, not another durable artifact.
It identifies the intended test exactly and cites existing anchors; it never asserts that RED or GREEN occurred.
The harness checks those IDs against its own discovery/report data.
For a task with several criteria, every criterion must have a binding, and every designated new behavioral test must demonstrate RED.
Semantic adequacy remains the independent reviewer's responsibility.

Plan `waves` are always overwritten by the deterministic planner before display; agent-supplied waves are not trusted.
Source-derived index text is permitted because it is a mechanical projection; task criteria fields still contain citations only.
PR grouping and gate approval digests stay in-session rather than extending the approved durable artifact inventory.

## Task 1: Extract criteria from the actual HTML package

**Build order:** 1.

**Files:** Create `.loop/lib/criteria.mjs` and `.loop/lib/criteria.test.js`; modify `vite.config.js` and `eslint.config.mjs` only for loop tooling tests/coverage and Node globals.

**Interfaces:** Implement `extractCriteria(html, specPath, { acceptanceKinds })` from the shared contracts; no I/O, agent calls, clock, network, or mutable global state.

**Implemented:** 44 tests passed after the initial missing-module failure.
The approved kind selection extends the original projection with a separate `context` array.
The real HTML yields 25 Rule candidates and 276 contextual anchored records.
Source text adds block/line-break separators before whitespace normalization, avoiding the original `textContent` example's merged words.

- [x] Write the first failing test using a minimal realistic element:

  ```js
  import { describe, expect, it } from 'vitest';
  import { extractCriteria } from './criteria.mjs';

  describe('extractCriteria', () => {
    it('preserves attributes, nested source text, and quoted greater-than', () => {
      // * ARRANGE
      const html = `<div id="rule-positive" data-pd-slot="rules"
        data-pd-name="positive" data-pd-kind="Rule" data-pd-screen="Settings"
        data-pd-detail="Value must be > 0."><b>Value</b> must be &gt; 0.</div>`;
      // * ACT
      const result = extractCriteria(html, 'spec/example.html', { acceptanceKinds: ['Rule'] });
      // * ASSERT
      expect(result.criteria).toEqual([
        {
          anchor: 'spec/example.html#rule-positive',
          slot: 'rules',
          name: 'positive',
          kind: 'Rule',
          screen: 'Settings',
          detail: 'Value must be > 0.',
          text: 'Value must be > 0.',
        },
      ]);
    });
  });
  ```

- [x] Run `npm test -- .loop\lib\criteria.test.js`; require a failure caused by the missing extractor, not a dependency failure.
      If Vitest is missing, configure the existing private registry without exposing its token, then run `npm ci` and repeat.
- [x] Implement the projection with existing `jsdom`, scripts and external resource loading disabled.
      The original unfiltered implementation sketch is superseded by the approved explicit selection:

  ```js
  const { criteria, context } = extractCriteria(html, specPath, {
    acceptanceKinds: ['Rule'],
  });
  ```

  Validate `html` and `specPath` as nonempty strings; reject a spec path with an existing fragment.
  Preserve absent metadata as `null`; never infer missing IDs, kinds, or normative status.
  Scope items and prototype notes remain available to decomposition as source context, not automatically mandatory acceptance criteria.

- [x] Add isolated tests for duplicate IDs, empty extraction, partial metadata, unanchored annotated elements, single-quoted attributes, entities, nested elements, script/style exclusion, and identical repeated input.
      Pin the no-script-execution case:

  ```js
  const result = extractCriteria(
    '<div id="safe" data-pd-kind="Rule">Safe<script>throw Error("executed")</script></div>',
    'spec/x.html',
    { acceptanceKinds: ['Rule'] }
  );
  expect(result.criteria[0].text).toBe('Safe');
  expect(() =>
    extractCriteria('<i id="a" data-pd-kind="Rule"></i><b id="a"></b>', 'spec/x.html', { acceptanceKinds: ['Rule'] })
  ).toThrow(/duplicate anchor/i);
  ```

- [x] Add a read-only real-package test; file reading belongs in the test, not the extractor:

  ```js
  import { readFileSync } from 'node:fs';
  const source = readFileSync('spec/pomodoro-workday-timers-spec.html', 'utf8');
  const index = extractCriteria(source, 'spec/pomodoro-workday-timers-spec.html', { acceptanceKinds: ['Rule'] });
  expect([...index.criteria, ...index.context].map(({ anchor }) => anchor)).toEqual(
    expect.arrayContaining([
      'spec/pomodoro-workday-timers-spec.html#rule-one-running',
      'spec/pomodoro-workday-timers-spec.html#wf-tick-s1',
      'spec/pomodoro-workday-timers-spec.html#scope-in-multi-timers',
    ])
  );
  expect(index.criteria.find(({ anchor }) => anchor.endsWith('#rule-one-running'))).toMatchObject({
    slot: 'rules',
    name: 'only-one-running',
    kind: 'Rule',
    screen: 'Main',
  });
  expect(extractCriteria(source, index.spec_path, { acceptanceKinds: ['Rule'] })).toEqual(index);
  ```

  Also compare extracted IDs to the parsed set of annotated `[id]` elements, not a guessed static count.
  Assert that the rule's nested client/server text is retained, not only its detail attribute.

- [x] Include `.loop/lib/**/*.mjs` in coverage; retain current product exclusions.
      At the Task 1 milestone `.loop/host.mjs` remained unwritten; Tasks 3 and 4 now include all `.loop/**/*.mjs` in coverage.
      Add a narrow ESLint override with `globals.node` for `.loop/**/*.mjs` and Node-based loop tests rather than disabling lint rules.
      Run `npm test -- .loop\lib\criteria.test.js` and require PASS before Task 2.

## Task 2: Compute dependency-safe, file-disjoint waves

**Build order:** 2.

**Files:** Create `.loop/lib/waves.mjs` and `.loop/lib/waves.test.js`.

**Interfaces:** `computeWaves(tasks)` returns arrays of task IDs, does not mutate input, and performs no filesystem reads or agent calls.

**Implemented:** 39 tests passed after the initial missing-module failure.
The foundation modules jointly pass 83 tests with 100% statements, branches, functions, and lines.
The full coverage run passes 522 tests across 77 files and reports 100% overall coverage.
Scoped lint and formatting pass.
The original full lint/build run was blocked by approved-spec Markdown errors, pre-existing `stories/US-001.md` through `US-003.md` MD025 errors, and legacy `.github/tools` ESLint errors.
The human subsequently authorized only the three MD040/MD060 spec formatting edits; the other failing files remain unchanged.

- [x] Write the dependency/overlap test before implementation:

  ```js
  import { expect, it } from 'vitest';
  import { computeWaves } from './waves.mjs';

  it('partitions within dependency levels, never across them', () => {
    // * ARRANGE
    const tasks = [
      { id: 'A', depends_on: [], files_modified: ['src/shared.js'] },
      { id: 'B', depends_on: [], files_modified: ['src/shared.js'] },
      { id: 'C', depends_on: [], files_modified: ['src/other.js'] },
      { id: 'D', depends_on: ['A'], files_modified: ['src/d.js'] },
    ];
    // * ACT
    const waves = computeWaves(tasks);
    // * ASSERT
    expect(waves).toEqual([['A', 'C'], ['B'], ['D']]);
  });
  ```

- [x] Run `npm test -- .loop\lib\waves.test.js`; require the expected missing-module/export failure.
- [x] Implement two local stages, not a wholesale copy of GSD:

  ```text
  Validate unique nonempty task IDs and arrays; reject duplicate dependency entries,
  unknown dependencies and self-dependencies.
  Build indegree and dependency -> dependent adjacency maps.
  Process Kahn frontiers in original task order; each frontier is one dependency level.
  If the visited count differs from task count, report all unvisited IDs and halt.
  For each level in order:
    maintain ordered stages, each with task IDs and a set of declared paths;
    put each task into the first stage with no shared exact path;
    otherwise append a stage.
  Flatten the ordered stages of each level into the returned waves.
  ```

  Keep the head-index queue pattern; do not repeatedly shift large arrays.
  An empty input returns `[]`; a nonempty production plan is enforced by Task 3.

- [x] Add diamond, transitive, disconnected, multiple-root, unknown-dependency, cycle, self-cycle, duplicate-ID, duplicate-dependency, and frozen-input tests.
      Pin empty files and stable order:

  ```js
  expect(
    computeWaves([
      { id: 'empty', depends_on: [], files_modified: [] },
      { id: 'write', depends_on: [], files_modified: ['src/a.js'] },
    ])
  ).toEqual([['empty', 'write']]);
  expect(() =>
    computeWaves([
      { id: 'A', depends_on: ['B'], files_modified: [] },
      { id: 'B', depends_on: ['A'], files_modified: [] },
    ])
  ).toThrow(/A.*B|B.*A/);
  ```

- [x] Preserve exact-string overlap semantics inside the pure algorithm.
      Demonstrate the limitation explicitly:

  ```js
  expect(
    computeWaves([
      { id: 'A', depends_on: [], files_modified: ['src/a.js'] },
      { id: 'B', depends_on: [], files_modified: ['src\\a.js'] },
    ])
  ).toEqual([['A', 'B']]);
  ```

  Do not mistake this compatibility test for safe production acceptance.
  Task 3 rejects noncanonical declarations before calling the algorithm.
  Gate 1 visibly marks empty file declarations because their safety cannot be inferred.

- [x] Run `npm test -- .loop\lib\criteria.test.js .loop\lib\waves.test.js`; require PASS.
      Check invariants in tests for each graph: every ID appears once, every dependency is in an earlier wave, no exact path appears twice in a wave, and input objects are unchanged.

## Task 3: Validate decomposition and stop at Gate 1

**Build order:** 3.

**Files:** Create `.loop/lib/plan.mjs`, `.loop/lib/plan.test.js`, `.loop/lib/orchestrator.mjs`, `.loop/lib/orchestrator.test.js`, `.loop/host.mjs`, `.loop/host.test.js`, `.loop/prompts/decompose.md`, and `.loop/README.md`; update root `README.md` with a link only.

**Interfaces:** `validatePlan(plan, index, targetIds)` returns a validated copy with computed `waves`.
`prepareLoop({ issue, html, specPath, target, acceptanceKinds }, ports)` returns an in-memory run paused at Gate 1.
`issue` contains `{ number, title, body, repository }`; the adapter reads it from GitHub, not a `stories/` fixture.

**Implemented in the current Tasks 3-4 scope:** `attended.mjs` composes real GitHub reads, temporary worktrees, artifacts and audited decomposition; `run.mjs` supplies the attended terminal entrypoint.
These two composition files make the sketched ports callable without leaking vendor details into the orchestrator.
The CLI reads the full protected index from its seeded worktree: the real index is 140767 JSON characters, and a measured 40000-character spawn fails Windows' process-command limit.
Known protected paths receive exact denies; all other writes still face the authoritative allowlist audit.
The harness creates the output directory before dispatch because CLI `create` empirically rejects missing parents.
Fresh live contexts, exact denial, successful undeclared-write rejection, and an actual-package Gate 1 smoke were exercised.
The smoke used a human-authorized, explicitly in-memory issue; GitHub issue reading was verified separately because this repo contains only legacy automation reports.
Even an approved Gate 1 returns `planned` without starting later legs.
Final verification after the fresh review: 676 tests across 84 files pass, with 100% statements, branches, functions and lines.
The review found and regression-tested an inherited-HEAD-symlink seeding flaw: worktrees now use `--no-checkout`, populate only the logical index with `read-tree`, and create baseline files exclusively.
No commits were created. Full lint/build remain blocked only by the explicitly excluded legacy Markdown/ESLint findings.

- [x] Implement the resolved Copilot CLI host boundary test-first, using the exact contract and argv in "Resolved host" above.
      First write `.loop/host.test.js` with an injected process launcher and literal JSONL chunks: split UTF-8 characters and lines, CRLF, blank lines, unknown events, ephemeral events, multiple assistant messages/tool requests, and the measured terminal result.
      Assert exact argv boundaries for prompts and paths containing spaces, quotes, and parentheses; verify permission syntax for unusual path characters against the installed CLI, rejecting unrepresentable rules rather than claiming protection.
      Add spawn/timeout/nonzero exit, truncated JSON, missing/duplicate result, malformed usage/path lists, and result/process-exit disagreement cases.
      A terminal zero exit with denied tool requests is transport completion, not a passed leg.
      Run `npm test -- .loop\host.test.js` before implementation and require the missing behavior to fail, then implement and require PASS.
- [x] Recheck installed CLI flags and run a bounded authorized live capability test: one long-lived Node parent spawns a fresh read-only CLI judgment context, receives JSONL, and remains alive for a later call.
      Keep automatic legs noninteractive with `--no-ask-user`; disable write and mutation-capable shell/MCP tools for the read-only probe.
      Prove two CLI contexts can run with `-C` pointed at task worktrees seeded from the parent's exact tree, including approved uncommitted artifacts.
      A default-branch checkout without predecessor deltas is insufficient.
      No hidden commits or extra approval gates are permitted.
      Treat unexpected flags/protocol behavior as capability errors, not a reason to invent a bridge.
- [x] Write a failing validation test using the exact plan contract:

  ```js
  import { expect, it } from 'vitest';
  import { validatePlan } from './plan.mjs';

  it('recomputes waves and rejects invented anchors', () => {
    const anchor = 'spec/x.html#rule-a';
    const index = { spec_path: 'spec/x.html', criteria: [{ anchor }] };
    const plan = {
      issue: 42,
      target: 'react-vitest',
      tasks: [
        {
          id: 'T1',
          summary: 'Implement rule-a',
          criteria: [anchor],
          depends_on: [],
          files_modified: ['src/a.js', 'src/a.test.js'],
          public_surface: [],
        },
      ],
      waves: [['invented']],
    };
    expect(validatePlan(plan, index, ['react-vitest']).waves).toEqual([['T1']]);
    plan.tasks[0].criteria = ['spec/x.html#invented'];
    expect(() => validatePlan(plan, index, ['react-vitest'])).toThrow(/anchor/i);
  });
  ```

- [x] Implement structural checks: positive issue number, known exercised target, nonempty task list, unique IDs, nonempty criterion citations, existing anchors, array-valued dependencies/files/surfaces, and no extra criterion prose fields.
      Validate every declared path as repository-relative, literal, `/`-separated, without drive letters, traversal, globs, or `.git`.
      Reject separator and case aliases rather than silently claiming two spellings are independent.
      Existing-path and symlink containment checks belong in the host/fence boundary; the validator remains pure.
      Reject public-surface entries outside their task's file set.
      Do not carry forward the obsolete requirement that the issue must contain a `## Criteria` section.
- [x] Add tests for `src\a.js`, `../outside.js`, absolute Windows paths, conflicting case spellings, invented criteria, empty task sets, unsupported targets, and invalid public surfaces:

  ```js
  for (const path of ['src\\a.js', '../outside.js', 'C:\\outside.js', 'src/*.js']) {
    const bad = structuredClone(plan);
    bad.tasks[0].files_modified = [path];
    expect(() => validatePlan(bad, index, ['react-vitest'])).toThrow(/path/i);
  }
  ```

  In that test define `plan` and `index` with the literal fixture from the preceding test in a local fixture factory; do not rely on another test's state.

- [x] Implement the skeleton through injected callable ports:

  ```js
  // host.mjs supplies runAgent; the orchestrator owns artifacts, git inspection, and gates.
  // ports.runAgent is the neutral injected host function.
  // ports.decompose({ issue, index, target, outputPath }) -> Promise<Plan>
  // ports.writeArtifact(path, data) -> Promise<void>
  // ports.gate1({ plan, warnings, prGroups, approvalDigest }) -> Promise<GateReply>
  // GateReply = { decision: 'approve' | 'revise' | 'stop', feedback: string }
  //
  // orchestrator.mjs:
  const index = extractCriteria(html, specPath, { acceptanceKinds });
  await ports.writeArtifact(`.loop/criteria/${issue.number}.json`, index);
  const proposed = await ports.decompose({
    issue,
    index,
    target,
    outputPath: `.loop/plans/${issue.number}.plan.json`,
  });
  const plan = validatePlan(proposed, index, [target]);
  await ports.writeArtifact(`.loop/plans/${issue.number}.plan.json`, plan);
  ```

  The decompose leg may write only that issue's plan file.
  The harness writes the index and computed waves and checks the actual write set.
  Apply Task 4's layered model to this plan-only fence as well; the skeleton is not operational until its decompose result is audited.
  Gate approval binds to hashes of the source HTML, target configuration, plan, and baseline tree.
  Gate edits invalidate approval and trigger recomputation before approval can apply.
  Do not add timestamps to deterministic index output.

- [x] Test that prose-only issues reach decomposition; the index comes from the parser; unknown anchors cannot reach approval; unapproved plans cannot dispatch test/implement/review; and Gate 1 revision recomputes waves.
      Use spies for downstream execution:

  ```js
  expect(ports.runAgent).not.toHaveBeenCalled();
  expect(ports.gate1).toHaveBeenCalledWith(
    expect.objectContaining({
      plan: expect.objectContaining({ waves: [['T1']] }),
    })
  );
  ```

  Construct `ports` with `vi.fn()` implementations for the declared port signatures in the test.
  In this skeleton, even approval ends with `status: 'planned'`; later tasks extend execution.

- [x] Write the decomposition prompt: map issue prose to source anchors; declare exact files and dependencies; do not restate criteria; do not write implementation/tests; report contradictory or unobservable anchors for Gate 1.
      Show the complete shared `Plan` schema in the prompt.
      Compute dependency-connected PR groups in the harness, display all groups at Gate 1, and keep grouping in-session.
- [x] Document the measured CLI invocation, version, tool restrictions, fence limitations, two gates, no-commit rule, no resume guarantee after parent-process loss, and the `.loop/` artifact paths.
      Surface measured preparation/decomposition usage at Gate 1; future task cost is unknown, not zero.
      Run `npm test -- .loop\host.test.js .loop\lib\plan.test.js .loop\lib\orchestrator.test.js` and one authorized live run that stops at Gate 1 with no source changes.

## Task 4: Apply layered fences from one target key

**Build order:** First part of 4.

**Files:** Create `.loop/lib/fences.mjs` and `.loop/lib/fences.test.js`; extend `.loop/host.mjs`.

**Implemented adapter refinement:** `.loop/lib/workspace.mjs` and its tests own Git/pathspec and filesystem I/O separately from the pure fence policy and the Copilot-specific host.
The real matcher uses a disposable Git repository/index, not the caller's index or object database.
Snapshots include all ignored worktree files (a deliberate linear I/O cost), and null-prototype dictionaries preserve filenames such as `__proto__`.
Existing root aliases from Windows short TEMP paths are mapped without normalizing task-relative identities.
Symlinks/submodules and unrepresentable permission-path characters are rejected, not silently copied or normalized.

**Interfaces:** `classifyPaths(paths, testPathspecs, match)` returns `{ test: string[], source: string[] }`.
`auditWrites({ leg, changes, declaredFiles, testFiles, protectedFiles })` returns structured violations; `changes` includes old and new paths for renames and all additions/deletions.
`match` is the single Git-pathspec-compatible host matcher, not an independent minimatch interpretation.
Here "host matcher" means the harness's Git adapter, not Copilot permission matching.
Copilot `write(path)` rules do not implement Git pathspecs.

**Authority:** the harness rejects unauthorized deltas before accepting a leg, running RED/GREEN on its output, or integrating its worktree.
Exact-path prevention and optional shell sandboxing reduce violations; neither replaces this audit.
This is an acceptance/integration guarantee, not a claim that all unauthorized writes are physically impossible.
Git plus CLI telemetry cannot prove the absence of transient shell writes that are later reverted, unreported writes outside the repository, or remote side effects.
Keep unrelated directories/credentials and mutation-capable external tools out of leg access; do not present the audit as a hostile-process sandbox.

- [x] Write table-driven failures for the current `test_pathspecs`.
      `*.test.js` must match nested colocated tests as Git pathspecs do; do not accidentally interpret it as a root-only glob.

  ```js
  const cases = [
    ['src/feature/a.test.js', 'test'],
    ['src/feature/a.test.jsx', 'test'],
    ['src/__testing__/render.js', 'test'],
    ['src/feature/__mocks__/api.js', 'test'],
    ['vite.config.js', 'test'],
    ['src/feature/a.js', 'source'],
  ];
  ```

  For each row, verify the test fence and implement fence are complements over allowed task files.
  A file outside `files_modified` is forbidden to both regardless of classification.

- [x] Implement classification with Git pathspec matching over a temporary index that represents the candidate paths, including untracked additions.
      Query tracked files via Git's NUL-delimited output and use literal paths for the declared ownership allowlist.
      Do not shell-interpolate agent-controlled paths.
      Protect the actual index and do not commit temporary trees.
      If the selected host already exposes a tested Git-pathspec matcher, use it instead of implementing a second one.
- [x] Add tests for untracked production writes by test authors, deleted tests by implementers, test-to-source renames, ignored-file writes, symlink escapes, `.loop/targets.json` modification, and reviewer writes.
      Pin the implementer rename case:

  ```js
  expect(
    auditWrites({
      leg: 'implement',
      changes: [{ status: 'renamed', oldPath: 'src/a.test.js', path: 'src/a.js' }],
      declaredFiles: ['src/a.test.js', 'src/a.js'],
      testFiles: ['src/a.test.js'],
      protectedFiles: [],
    })
  ).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'test_fence', path: 'src/a.test.js' })]));
  ```

- [x] Layer 1, preventive exact-path rules: resolve every declared file against the task worktree, including files not yet created.
      Classify it with the shared `test_pathspecs`.
      For `test`, pass exact absolute deny rules for all declared source files; for `implement`, deny all declared test files.
      Also deny known protected spec/config/harness/evidence paths.
      The host emits one `--deny-tool` plus `write(<absolute path>)` argv pair per path.
      Never use `write(src)`, directory-prefix assumptions, or `write(**/*.test.js)` as a substitute.
      For review, use the verified all-write `write` denial and remove shell/MCP write capabilities; for decomposition, only the issue's plan delta can survive audit.
      Denial outranks `--allow-all-tools`, but `write` permissions do not govern shell invocations.
      Limit shell/tools to what the leg actually needs; harness-owned test execution does not require the agent to have an unrestricted shell.
- [x] Test the measured preventive boundary: an exact deny for an existing or future source path blocks the test leg's built-in write; the allowed declared test path remains available.
      A directory-relative deny is an explicit negative control, not an accepted protection mechanism.
      Test that an undeclared new source path not covered by exact denies is rejected by Layer 3 even if a CLI built-in write succeeds.
      Missing or denied tool operations are diagnostic facts, never self-reported success.
- [x] Layer 2, optional experimental hardening: evaluate Windows MXC ProcessContainer/BaseContainer availability and compatible policy in an isolated authorized probe.
      Reverify sandbox help and the configuration schema before using `sandbox.userPolicy.filesystem.readwritePaths`, `readonlyPaths`, and `deniedPaths`.
      Enable only for the bounded probe via supported experimental/managed settings; do not mutate global user settings without approval.
      Configure read/write access narrowly, protect baseline/harness paths, and verify shell attempts against both allowed and forbidden locations.
      Built-in file edits are explicitly not OS-sandboxed; their policy handling is best-effort.
      Record unavailable/incompatible MXC support plainly and continue with Layers 1 and 3 when policy permits; optional hardening must not block this design.
      Never bypass a mandatory managed sandbox policy.
      Actual isolated probe: MXC refused PowerShell because this Windows host lacks Process Security Environment 1.1 filesystem enumeration support. Neither allowed nor denied writes ran. No global settings or mandatory policy were changed, and no bypass was attempted.
- [x] Layer 3, authoritative audit: the parent snapshots the task worktree and index before every leg.
      After every exit, including failure, timeout, or cancellation, obtain `git status --porcelain=v1 -z --untracked-files=all` and compare pre/post tracked, staged, deleted, renamed, and untracked content.
      Include both old and new rename paths.
      Union the changed path set with neutral `AgentOutcome.reportedWrites` from the CLI terminal usage; preserve paths found by either source even if the other omits them.
      Include ignored-file changes through a pre/post inventory of relevant ignored paths; ordinary status does not report them.
      Capture harness-generated reports outside the leg worktree or distinguish them by trusted ownership, not a broad agent-writable exclusion.
      Validate absolute telemetry paths, containment, symlink destinations, and platform aliases before mapping to repository-relative paths; never discard outside-worktree paths as "not in git".
      Reject any path outside `files_modified`, any path violating the leg's test/source pathspec, or any protected-file change.
      Decompose permits only its exact plan output; review permits no writes.
      Missing telemetry, an unreadable worktree, or a failed Git audit is incomplete evidence: park/reject, never assume an empty set.
      Existing dirty changes are the baseline, not automatically agent writes, but changes to an already-dirty file must still be detected.
- [x] Add audit tests for Git-only untracked writes, telemetry-only writes including reverted built-in edits, path disagreement, missing telemetry, ignored additions, modified dirty files, rename endpoints, and outside-worktree absolute paths.
      A zero CLI exit and empty reported list must not hide a Git-detected violation.
      Verify audit runs before subsequent test execution or merge and after unsuccessful subprocess termination.
      Route violations to the owning leg; retain the approved review routing of undeclared implementation writes to `implement`.
      Tool requests identify attempted actions but are not a replacement for the union of changed paths and telemetry.
- [x] Keep harness, spec, index, plan, target configuration, and evidence in trusted parent-owned snapshots and deny known agent write locations preventively.
      Test helpers/configs matching `test_pathspecs` remain test-owned only within approved scope and cannot change discovery, reporters, harness commands, or evidence.
      Reject such configuration tampering explicitly; do not run tests using an unaudited candidate configuration.
      Never merge an invalid delta; quarantine the task candidate and preserve unrelated human changes.
      Run `npm test -- .loop\lib\fences.test.js .loop\host.test.js` plus authorized exact-path and undeclared-path escape probes before accepting the deliverable.

## Task 5: Produce machine-owned RED/GREEN evidence

**Build order:** Second part of 4.

**Files:** Create `.loop/lib/results.mjs`, `.loop/lib/results.test.js`, `.loop/lib/vitest-results.mjs`, `.loop/lib/vitest-results.test.js`, `.loop/lib/runner.mjs`, and `.loop/lib/runner.test.js`; extend `.loop/targets.json`.

**Interfaces:** `parseVitestResults(json, processResult, repoRoot): NormalizedRun`.
`runTarget({ target, cwd, bindings, phase }, processPort): Promise<NormalizedRun>`.
The common `judgeRed` and `judgeGreen` functions consume normalized results, never Vitest-specific field names.

**Progress:** All Task 5 module APIs are implemented test-first, including `process.mjs`/`process.test.js` for target-neutral subprocess supervision. Isolated coverage passes 385 tests across 14 files with 100% on all four metrics. Actual Vitest 3.2.4 probes and 3.2.7 runner integration cover assertions, imports, setup, runtime throws, skips, empty discovery, returned cleanup and completion callbacks. The CLI remains at Gate 1 until Task 6 wires task execution.

**Measured rulings:** Stock JSON omits structured assertion provenance; the supplemental reporter captures runner error fields and the first recognized Vitest runner stack boundary. Unknown provenance is not valid RED. Skipped suites count as passed in Vitest's suite totals, despite their tests remaining skipped; counters mirror that measured format without accepting skipped tests. Issue reading now defers the preparation module so metadata validation cannot import `jsdom`; deliberately failing preparation imports still surface when requested.

- [x] Write the verdict matrix before parser implementation:

  ```js
  import { expect, it } from 'vitest';
  import { judgeRed, judgeGreen } from './results.mjs';

  const binding = {
    id: 'src/a.test.js::rule-a',
    file: 'src/a.test.js',
    name: 'rule-a',
    criteria: ['spec/x.html#rule-a'],
  };
  const assertion = {
    id: binding.id,
    file: binding.file,
    name: binding.name,
    status: 'failed',
    failureKind: 'assertion',
    message: 'expected 0 to be 1',
  };
  it('requires the named behavioral assertion to fail', () => {
    const run = { exitCode: 1, complete: true, errors: [], tests: [assertion] };
    expect(judgeRed(run, [binding]).status).toBe('RED');
    expect(judgeRed({ ...run, tests: [] }, [binding]).status).toBe('INVALID_RED');
    expect(judgeRed({ ...run, errors: [{ kind: 'setup', message: 'crash' }] }, [binding]).status).toBe('INVALID_RED');
    const green = {
      ...run,
      exitCode: 0,
      tests: [
        {
          ...assertion,
          status: 'passed',
          failureKind: null,
          message: '',
        },
      ],
    };
    expect(judgeRed(green, [binding]).status).toBe('INVALID_RED');
    expect(judgeGreen(green, [binding]).status).toBe('GREEN');
  });
  ```

- [x] Run `npm test -- .loop\lib\results.test.js`; require the intended failure.
      Implement verdict policy first, independent of the target parser.
      RED requires a complete parse, a normal failing test-process exit, no infrastructure errors, all named tests present and assertion-failing, and no unrelated failures.
      GREEN requires exit `0`, complete results, all named tests present/passed, and no failed/skipped target tests or suite errors.
      Reject empty bindings and duplicate/ambiguous test identities.
- [x] Capture real Vitest 3.2.4 JSON from test-owned temporary projects: one pass, one assertion failure, one import error, one setup crash, one explicit runtime throw, zero tests, and a skipped named test.
      Use `npm test -- --reporter=json --outputFile=<temporary-path>` or the target argv; do not reuse the scratch workflow's incorrect `npm vitest` command.
      Compare `assertionResults` IDs from relative filename plus full nested test name, and verify aggregate counts agree with detail.
      Never classify a whole failed suite as a failed behavioral assertion.
- [x] Implement `parseVitestResults` against those actual outputs.
      Classify only demonstrable assertion failures; unknown failure shapes are runtime/parser errors and invalid RED.
      If the stock JSON lacks sufficient error provenance to distinguish assertions from arbitrary throws, add a harness-owned Vitest reporter in `.loop/lib/vitest-reporter.mjs` with colocated tests to capture structured error information from the installed version's reporter API.
      Keep `results_format: "vitest-json"`; add structured harness-owned diagnostic data to the ephemeral report rather than loosening RED to any failed test.
      This is a parser implementation branch justified by captured evidence, not a new agent leg.
- [x] Add explicit tests for invalid/truncated JSON, missing report, stale output, timeout/signal termination, duplicate names, unrelated failure, inconsistent exit/counts, runtime exception disguised as a named test failure, and unexpected passes.

  ```js
  expect(
    judgeRed(
      {
        exitCode: 1,
        complete: true,
        errors: [],
        tests: [{ ...assertion, failureKind: 'runtime', message: 'ReferenceError' }],
      },
      [binding]
    ).status
  ).toBe('INVALID_RED');
  expect(
    judgeGreen(
      {
        exitCode: 0,
        complete: false,
        errors: [],
        tests: [],
      },
      [binding]
    ).status
  ).toBe('INVALID_GREEN');
  ```

- [x] Extend only the React profile for v1:

  ```json
  {
    "build": null,
    "red_policy": {
      "require_named_assertion_failure": true,
      "allow_unrelated_failures": false
    }
  }
  ```

  Retain its existing `install`, `test`, `results_format`, `test_pathspecs`, and `exercised`.
  Keep `.NET` unexercised; a missing/unsupported parser is a surfaced configuration error, not successful empty evidence.

- [x] Implement trusted argv execution without a general shell string; validate the `{{results}}` placeholder, create a unique temporary report location, consume it once, and clean up that named directory.
      Use a verified Windows-compatible npm/npx invocation instead of assuming a `.cmd` file behaves like an executable.
      Explicitly surface install, spawn, timeout, parse, and cleanup errors.
      Baseline suite failure parks work as an environment/pre-existing failure; it never counts as the task's RED.
- [x] Run `npm test -- .loop\lib\results.test.js .loop\lib\vitest-results.test.js .loop\lib\runner.test.js` and the real temporary-project evidence matrix.
      Test output shape, not just exit codes.

## Task 6: Execute red-green tasks and concurrent wave barriers

**Build order:** Final part of 4.

**Files:** Create `.loop/lib/task.mjs`, `.loop/lib/task.test.js`, `.loop/lib/wave-runner.mjs`, `.loop/lib/wave-runner.test.js`, `.loop/prompts/test.md`, and `.loop/prompts/implement.md`; extend orchestrator and host.

**Interfaces:** `runTask({ task, target, baseline }, ports): Promise<TaskOutcome>`.
`TaskOutcome = { taskId, status: 'ready' | 'parked' | 'gate1', evidence, findings, delta }`.
`runWave({ tasks, target, baseline }, ports)` drains all tasks, integrates accepted deltas, and runs the full suite before returning.
`baseline` is a harness-owned snapshot identifier, not an agent-editable path.

**Progress (Task 6 complete):** The harness owns the test-first RED/GREEN sequence, immutable test/source patches, write audits, binary-safe wave integration, and private baseline handoffs. Real single-task and concurrent two-task CLI probes completed with clean audits, full-suite GREEN, unchanged parent trees, and 22.5 and 45 measured premium requests respectively. Retained failure logs document the Windows cleanup, derived-worktree disposal, and marginal Git/filesystem test timing investigations. Trusted snapshot handoffs removed redundant captures, and the root Git probe now runs alongside the other drained snapshot operations without weakening root or error validation. The heavy two-task integration test alone has a documented 45-second timeout to accommodate residual subprocess/I/O variance; all other test limits remain unchanged.

**Final Task 6 gates:** `npm --prefix .loop run test:coverage` passed 474/474 tests across 18 files, and `npm run test:coverage` passed 913/913 tests across 93 files. Both reported 100% statements, branches, functions, and lines. The attended CLI still stops at Gate 1; independent review, lifecycle wiring, and publication remain Tasks 7-9, not Task 6. No commits or PRs were created.

**Verified lifecycle correction:** Derived worktree disposal resolves the stable shared Git directory rather than using the seeding worktree as its command directory. A regression removes the seed before its child; another proves real Git errors still propagate. Neither retries nor teardown serialization are used.

- [x] Write an event-order test before production orchestration:

  ```js
  expect(events).toEqual(['baseline-green', 'test', 'audit-test', 'red', 'implement', 'audit-implement', 'green']);
  expect(events.indexOf('red')).toBeLessThan(events.indexOf('implement'));
  ```

  Build `events` by injecting async port functions that append their actual call names.
  Add a case returning `INVALID_RED` and assert the implement port was never called.
  Run `npm test -- .loop\lib\task.test.js` and observe failure.

- [x] Implement the sequence with trusted evidence and snapshots:

  ```text
  Freeze the task's baseline from the accepted state after all earlier wave barriers.
  Establish baseline suite GREEN before new tests.
  Run the test agent with its write allowlist; audit and freeze its test delta/bindings.
  Run RED against baseline source plus that test delta.
  Only RED authorizes implement; INVALID_RED routes to bounded test repair.
  Run implement with the inverse fence; freeze source delta.
  Run GREEN against candidate source plus the identical approved test delta.
  Only GREEN authorizes independent review (wired in Task 7).
  ```

  In React, no automatic production stub is required; a test must fail as an assertion rather than an import/collection error.
  An author may dynamically import and assert an observable export to demonstrate absent behavior without pretending an import crash is RED.
  Do not let the test leg create source stubs.

- [x] Write the two prompts with complete input/output contracts.
      The test author returns only tests and `TestBinding[]`; the implementer receives approved tests and anchors but cannot edit tests, bindings, or evidence.
      Neither returns a trusted verdict.
      All repair attempts remain bound to the same task and approved ownership.
- [x] Implement wave concurrency with `Promise.allSettled` or equivalent task draining:

  ```text
  A one-task wave uses fresh CLI judgment invocations in the current task workspace.
  A multi-task wave runs CLI judgment contexts in one worktree per task from the same baseline.
  Start all siblings without awaiting one before launching the next.
  Drain every sibling even if one fails, times out, or parks.
  Block the next wave while any task is parked or needs Gate 1.
  ```

  Do not commit to transfer changes between worktrees.
  Capture binary-safe, full additions/deletions/renames using temporary indexes/patches; apply to a disposable integration candidate first.
  Include approved uncommitted predecessor-wave content in every child's base snapshot.
  A task cannot start from the repository default branch if it lacks predecessor changes.
  Subprocess-per-leg does not imply lost continuity: the parent supplies the same task baseline, evidence, and repair context explicitly.
  Do not use `--fleet` to let an agent recompute waves or create unaudited task children.

- [x] Test concurrency with deferred promises, not timing sleeps:

  ```js
  expect(started.sort()).toEqual(['A', 'B']);
  resolveA({ taskId: 'A', status: 'parked', evidence: null, findings: [], delta: null });
  expect(barrierFinished).toBe(false);
  resolveB({ taskId: 'B', status: 'ready', evidence: {}, findings: [], delta: {} });
  await wavePromise;
  expect(nextWave).not.toHaveBeenCalled();
  ```

  Define `resolveA`, `resolveB`, `wavePromise`, and `nextWave` through the test's injected task runner.
  Add rejection/timeout, cancellation, empty write set, sibling ownership conflict, binary addition, deletion, and full-suite integration-failure cases.

- [x] Implement the merge barrier transaction: preflight all accepted deltas, reject overlap/conflicts, apply in stable task order to the candidate, run full-suite GREEN, then expose the accepted combined working tree.
      Do not partially mutate the parent and then silently roll back unrelated edits.
      Parked-task waves retain diagnostics and completed sibling deltas but do not advance.
      Runtime integration failures are surfaced at the barrier; ownership conflicts return to Gate 1, behavior regressions route to the responsible leg only if attribution is established.
- [x] Verify task/wave tests in the standalone and root coverage runs.
      Exercise one real single-task run and one two-task worktree run with no commits and no human prompt between Gate 1 and the barrier.
      At this milestone publication remains disabled.

## Task 7: Review independently and route repairs

**Build order:** 5.

**Files:** Create `.loop/lib/review.mjs`, `.loop/lib/review.test.js`, and `.loop/prompts/review.md`; extend task/orchestrator/host and `.loop/targets.json` for standards configuration.

**Interfaces:** `routeFindings(findings)` from the shared contracts.
`resolveStandards({ stack, configured, available })` returns an ordered stack-compatible list of skill/document references.
`reviewTask({ task, index, evidence, delta, standards }, ports)` returns validated `Finding[]`, never source edits.

- [x] Write the routing table test:

  ```js
  import { expect, it } from 'vitest';
  import { routeFindings } from './review.mjs';

  it.each([
    ['missing_test', 'test', 'test'],
    ['unsupported_assertion', 'test', 'test'],
    ['wrong_behavior', 'implement', 'implement'],
    ['standards', 'implement', 'implement'],
    ['undeclared_file', 'implement', 'implement'],
    ['contradictory_anchor', 'decompose', 'decompose'],
    ['unobservable_anchor', 'decompose', 'decompose'],
    ['ownership_conflict', 'decompose', 'decompose'],
  ])('%s routes to the responsible leg', (code, fault_domain, destination) => {
    expect(
      routeFindings([
        {
          code,
          fault_domain,
          criteria: ['spec/x.html#a'],
          files: [],
          message: code,
        },
      ])
    ).toBe(destination);
  });
  ```

- [x] Implement code/domain consistency validation and deterministic mixed-finding priority: `decompose`, then `test`, then `implement`, then `done`.
      Reject malformed or unsupported findings explicitly; do not treat invalid output as an empty review.
      Preserve the entire finding set so lower-priority faults are not forgotten when one route is chosen.
      The reviewer assesses criteria coverage and standards; the harness decides the route.
- [x] Resolve stack-compatible standards in the approved order: organization skills; local `pa-review-dotnet` and `pa-review-dotnet-security` for .NET only; repository `.github/copilot-instructions.md` and `CONTRIBUTING.md`; C# `github-process-docs` guidelines for .NET only.
      Configure references on the target profile rather than hardcoding organization skill names in orchestration.
      Missing optional organization skills produce an explicit resolution record and fall through; missing explicitly required configured standards park review.
      React does not invoke .NET skills.
- [x] Write the review prompt to inspect cited source anchors, actual test bindings, harness-owned RED/GREEN evidence, declared/actual file sets, and standards.
      Use a fresh context distinct from test/implement authors; enforce read-only permissions.
      Review may identify semantic misalignment that the deterministic parser cannot judge, but it cannot override INVALID_RED, GREEN failures, fences, or budgets.
- [x] Add repair sequence tests:

  ```js
  expect(testRepairEvents).toEqual(['review', 'test', 'audit-test', 'red-on-baseline', 'green-on-candidate', 'review']);
  expect(implementRepairEvents).toEqual(['review', 'implement', 'audit-implement', 'green-on-candidate', 'review']);
  ```

  If GREEN after test repair fails, invoke implement before re-review.
  Critically, `red-on-baseline` uses the frozen pre-implementation snapshot, not the repaired candidate source.
  For React this is baseline source; for .NET Task 11 adds the declared stub overlay.
  Add a changed test that passes on baseline and assert `INVALID_RED`, no accepted GREEN, and no completion.

- [x] Add tests for mixed findings, unknown anchors, malformed fault domains, reviewer write attempts, standards fallback order, and React excluding C# skills.
      Add a Gate 1 re-entry test that waits for running siblings, presents all decomposition faults together, invalidates affected approvals, recomputes waves, and does not silently reassign ownership.
      Run `npm test -- .loop\lib\review.test.js .loop\lib\task.test.js .loop\lib\wave-runner.test.js`.

Task 7 complete as a post-approval module API. Standalone loop coverage passed
543/543 tests in 19 files; combined app/loop coverage passed 982/982 in 94
files, each at 100% statements, branches, functions, and lines. Task 7-scoped
ESLint, Markdownlint, and Prettier passed. Full `npm run lint` and the
`npm run build:dev` prebuild remain blocked only by the accepted, unchanged
MD025 headings in `stories/US-001.md`, `US-002.md`, and `US-003.md`.
The human-authorized direct `npx --no-install vite build --mode development`
passed. No live Task 7 reviewer was invoked; the attended CLI still stops at
Gate 1. Task 8 completed subsequently; Tasks 9-11 had not started at this
historical checkpoint.

## Task 8: Carry forward signature breakers and execution budgets

**Build order:** 6.

**Files:** Create `.loop/lib/termination.mjs` and `.loop/lib/termination.test.js`; extend task/orchestrator/target configuration; read old `.github/tools/loop-decide.mjs` and fixtures before removing them in Task 9.

**Interfaces:** `normalizeText`, `findingSignature`, and `nextRepair` from the shared contracts.
Default limits remain `{ cycle: 3, total: 15 }`, preserving the existing settings.
Counters and signature sets remain in-session and isolated per task.

- [x] Port behavior tests before extracting normalization:

  ```js
  import { expect, it } from 'vitest';
  import { normalizeText, findingSignature } from './termination.mjs';

  it('collapses incidental details but preserves asserted values', () => {
    expect(normalizeText('at C:\\repo\\a.js:42 took 11ms')).toBe(normalizeText('at C:\\other\\a.js:99 took 32ms'));
    expect(normalizeText('expected 25m')).not.toBe(normalizeText('expected 30m'));
    expect(normalizeText('expected 100')).not.toBe(normalizeText('expected 101'));
  });
  it('is stable under finding order and duplicate findings', () => {
    const a = {
      fault_domain: 'implement',
      code: 'wrong_behavior',
      criteria: ['spec/x.html#a'],
      files: [],
      message: 'expected 1',
    };
    const b = { ...a, criteria: ['spec/x.html#b'], message: 'expected 2' };
    expect(findingSignature('implement', [a, b, a])).toBe(findingSignature('implement', [b, a]));
  });
  ```

- [x] Run `npm test -- .loop\lib\termination.test.js`; require the intended failure.
      Extract the existing narrow text normalization rather than rewriting it from memory.
      Remove CLI argument parsing, process exit, filesystem ledger, transitions file, and workflow names from the new module.
      Canonicalize finding codes, criterion IDs, and paths separately from free-text messages; sort/deduplicate before hashing.
      The signature includes the at-fault leg, not just the reviewer that emitted the finding.
- [x] Add regression cases equivalent to `pass`, `fail-fail-pass`, `breaker-repeat`, `budget-exhaust`, and `signature-distinct-values` from the old fixtures.
      Preserve behavioral equality classes, not literal hash strings.
      Test `A -> B -> A` in one leg, the same normalized finding in different legs/tasks, reordered fields, GUIDs, mixed hex versus English words, bare numbers, and qualified versus bare durations.
- [x] Implement ordering:

  ```text
  Before a repair, compute its per-leg signature.
  If seen anywhere in that leg's task history: park immediately (breaker wins).
  Otherwise record the signature.
  If the backward route has already consumed cycle limit: park.
  If the next agent execution would exceed total limit: park.
  Otherwise increment that repair cycle and authorize the next execution.
  Count all task agent executions, including initial test/implement/review;
  only backward transitions consume cycle budget.
  ```

  Deterministic test commands are not agent executions; their timeouts are enforced by the runner.
  Bound malformed agent outputs and INVALID_RED repairs too.
  Do not allow decomposition repair attempts before Gate 1 to retry forever; use the same bounded mechanism for that preparation phase, without charging task siblings.

- [x] Test exact cap boundaries and breaker precedence when the budget is also exhausted.
      Test that one parked task does not cancel siblings and that the barrier aggregates all parked reasons before surfacing them.
      Persist no `verdict.json`, ledger, or budget file.
      Run `npm test -- .loop\lib\termination.test.js .loop\lib\task.test.js .loop\lib\wave-runner.test.js`.
- [x] Accumulate neutral usage counters per invocation/task, including failed and repaired legs, and display actual totals at each wave barrier; display preparation costs at Gate 1. Task 9 owns Gate 2 presentation.
      The measured trivial prompt consumed `premiumRequests: 7.5`; treat that as one observation, not a universal per-leg estimate.
      Keep signature, cycle, and total-execution budgets even when cost controls are configured.
      The external `--max-ai-credits` per-leg backstop is deferred by human decision: installed CLI enforcement and terminal outcomes remain unverified; do not wire or enable it without a separately approved bounded probe.
      Do not silently choose a monetary limit or equate AI credits with premium-request units.
      Tests must prevent double-counting terminal usage plus checkpoints/output files, preserve fractional counters, and flag missing usage rather than charging zero.
      Usage-output files are temporary harness evidence, never new durable `.loop` artifacts.
- [x] Stage Task 8 changes and report breaker/budget boundaries and exact test evidence; do not commit or begin Task 9 without authorization.

Task 8 complete for this milestone: standalone loop coverage passed 567/567
across 20 files and combined app/loop coverage passed 1006/1006 across 95 files;
both reached 100% statements, branches, functions, and lines. Task-scoped
ESLint, Markdownlint, Prettier, and staged-diff checks passed. Deterministic
signature, repair-cycle, total-execution, preparation, and usage accounting
remain enforced. Gate 2 usage presentation is Task 9's publication surface.
The Copilot CLI 1.0.88 `--max-ai-credits` defense-in-depth probe was not run;
its real credit ceiling is unverified and not enabled. Premium requests are
measured separately from AI credits.

## Task 9: Complete Gate 2, publish, and retire the conductor

**Build order:** 7.

**Status:** Deterministic implementation complete for this milestone; attended live end-to-end publication acceptance has not run and still requires separate human approval. The Copilot CLI 1.0.88 `--max-ai-credits` probe remains deferred and unwired defense-in-depth from Task 8.

**Verification:** Targeted Task 9 tests passed 140/140 across 7 files; plan-dependent targeted tests passed 117/117 across 5 files. Standalone loop coverage passed 638/638 across 25 files, and combined app/loop coverage passed 1077/1077 across 100 files. Both reached 100% statements, branches, functions, and lines. Task 9-scoped ESLint, Markdownlint, and Prettier passed, as did `git diff --cached --check`. Full `npm run lint` and `npm run build:dev` remain blocked only by the three accepted, unchanged MD025 headings in `stories/US-001.md`, `stories/US-002.md`, and `stories/US-003.md`; Vite did not run for Task 9.

**Files:** Create `.loop/lib/publication.mjs` and `.loop/lib/publication.test.js`; extend orchestrator/host/README; update `.github/workflows/check-gates.yml` to run the new deterministic suite.

**Interfaces:** `publishReviewedRun({ run, groups }, ports)` enforces Gate 2 and calls the selected host's PR operation.
`ports.gate2({ groups, treeDigests, evidence })` pauses once for human review/commit/publication readiness.
`ports.readPublishedTree(group)` returns the remote branch tree identity.
`ports.openPullRequest(group)` returns the actual PR URL; successful completion is `status: 'pr-opened'`.
No port may auto-commit or merge.

- [x] Apply the accepted Gate 2 timing and deterministic dependency-component PR grouping.
      Write the no-commit publication test:

  ```js
  expect(events).toEqual(['final-suite-green', 'gate2', 'verify-published-tree', 'open-pr', 'stop']);
  expect(commit).not.toHaveBeenCalled();
  expect(merge).not.toHaveBeenCalled();
  ```

  `commit` and `merge` are forbidden-operation spies in the host test, not implemented production ports.
  Human commit/push occurs while Gate 2 is open; the runtime must not manufacture a commit to make the test pass.

- [x] Bind final evidence to the staged tree, spec/config/plan hashes, and PR group.
      Require every task reviewed, every wave barrier green, no parked task, and a final full-suite GREEN.
      Verify the human-published branch contains the exact reviewed tree before opening a PR.
      A differing tree invalidates evidence and returns to review/validation without opening a PR under stale approval.
      Commit signing verification uses repository policy; never bypass it.
- [x] Test Gate 2 rejection, uncommitted state, branch not published, mismatched remote tree, changed spec/targets, failed PR API call, authentication failure, and a previously opened matching PR.
      Repeated publication must recover the existing PR by exact head/base identity rather than create duplicates.
      For several approved groups, present all at the same gate and stop only after each actual PR URL is confirmed.
      Never report an API failure as "PR opened".
- [x] Write PR descriptions with issue references, source anchor citations, task/wave grouping, deterministic RED/GREEN evidence summary, and standards used.
      Do not paraphrase acceptance criteria, fabricate test evidence, or upload secrets.
      Use an authenticated deterministic GitHub publication port after Gate 2 eligibility checks, not a Copilot judgment leg asked to create the PR.
      The Copilot subprocess bridge does not grant Node access to the app's native PR tools; publication transport must be wired explicitly and respect the approved PR grouping.
- [x] Port meaningful regression cases into the new colocated tests before deleting the obsolete files.
      Remove these specific repository files/subtrees, not unrelated Actions or product files:

  ```text
  plans/.gitkeep
  plans/US-001.plan.json
  plans/US-003.plan.json
  .loop/legs.json
  .loop/legs.v1.json
  .loop/fixtures/
  .github/tools/loop-decide.mjs
  .github/tools/check-gates.mjs
  .github/tools/check-plan.mjs
  .github/tools/check-plan-cases.mjs
  .github/tools/show-results-shape.mjs
  .github/workflows/loop-conductor.yml
  .github/workflows/loop-leg-stub.yml
  .github/workflows/loop-leg-plan.md
  .github/workflows/loop-leg-plan.lock.yml
  .github/workflows/capture-vitest.yml
  ```

  `stories/` is not the new input source, but its removal is not required by the approved design; retain it unless independently authorized.
  Do not migrate root `plans/` fixtures to `.loop/plans/`.
  The deleted workflow markdown and generated lock must be handled together. No workflow Markdown survives this cleanup, so there is no gh-aw compilation gate to run.
  Do not hand-edit generated `.lock.yml` contents.

- [x] Update `check-gates.yml` to install via the repository's existing authenticated CI convention and run new loop tests, not removed scripts.
      Update path filters to `.loop/**` and relevant test/config files.
      Retain unrelated build, deploy, unit-test, lint, and security workflows.
      Remove obsolete references to the two PATs from tracked files.
      Document operator retirement of repository secrets `LOOP_COMMIT_TOKEN` and `LOOP_DISPATCH_TOKEN` and the remote `loop-state` branch; do not delete remote resources without explicit human authorization.
- [x] Run a tracked-reference search for `verdict.json`, `loop-state`, `legs.json`, old tool/workflow names, `LOOP_COMMIT_TOKEN`, `LOOP_DISPATCH_TOKEN`, and root `plans/`.
      Remaining occurrences should be historical design/plan explanations or deliberate retirement instructions, never executable paths.
      Run `npm run lint`, `npm run test:coverage`, and `npm run build:dev`.
      Ensure the coverage report actually includes `.loop` modules and reaches 100% statements for new code while maintaining existing coverage.
      Full lint and the build prebuild were attempted but stopped at the accepted, unchanged MD025 story headings; the scoped Task 9 linters and both 100% coverage gates passed.
- [ ] Perform an attended v1 acceptance run using an authorized issue/spec and capture in-session evidence: exactly Gate 1 and Gate 2 on the successful path, real parallel children when appropriate, assertion RED before implementation, GREEN before independent review, repairs/budgets owned by harness, human commits only, actual PR URL, no merge.
      Do not create a PR solely for a test without authorization.
      Stage and report the implementation for human review; the human alone commits or publishes.

## Task 10: Package the harness as one Copilot marketplace plugin

**Build order:** 8, after Task 8 termination and Task 9 publication lifecycle,
before the deferred .NET port. Independently reviewable as a packaged,
test-first hand-off; do not retroactively claim Tasks 1-7 ran through `/loop`.

**Files:** Create `.loop/lib/target-config.mjs` and `.test.js`,
`.loop/lib/plugin-invocation.mjs` and `.test.js`, `.loop/plugin/plugin.json`,
`.loop/plugin/com.github.copilot/commands/loop.md`,
`.loop/plugin/com.github.copilot/agents/loop.agent.md`,
`.loop/plugin/bin/launch.mjs` and `.test.js`, `.loop/plugin/build.mjs` and
`.test.js`, `.loop/plugin/marketplace.json`,
`.loop/plugin/examples/repo-settings.json`; modify `.loop/targets.json`,
`.loop/attended.mjs`, `.loop/run.mjs`, their colocated tests,
`.loop/.gitignore`, and `.loop/README.md`. No repo-level
`.github/copilot/settings.json` is created in loop-lab.

**Interfaces:**

```js
// target-config.mjs
// loadTargetConfig({ root: string, target: string }): Promise<TargetConfig>
// Reads <root>/.loop/targets.json, requires $schema_version === 2 and a
// valid, exercised selected target; rejects missing/invalid config.
// TargetConfig = {
//   exercised: true, stack: string, install: string[],
//   build: string[] | null, test: string[], results_format: string,
//   test_pathspecs: string[],
//   red_policy: { require_named_assertion_failure: boolean,
//                 allow_unrelated_failures: boolean },
//   review_standards: {
//     organization: string[], local: string[], repository: string[],
//     guidelines: string[], required: string[]
//   }
// }
//
// plugin-invocation.mjs
// parseLauncherArgs(argv: string[]): LoopInput
// LoopInput = {
//   checkout: string | null, repository: string, issue: number,
//   specPath: string, acceptanceKinds: string[]
// }
// normalizeLoopInvocation(input: LoopInput, { cwd: string }):
//   Promise<{ root: string, argv: [string, string, string, string] }>
// argv = [repository, String(issue), specPath, acceptanceKinds.join(',')]
//
// plugin/bin/launch.mjs
// runPlugin(argv: string[], {
//   cwd: string, pluginRoot: string,
//   loadConfig: typeof loadTargetConfig,
//   spawn: (file: string, args: string[],
//     options: { cwd: string, stdio: 'inherit', shell: false }) =>
//     Promise<{ exitCode: number }>
// }): Promise<number>
// loadConfig is loadTargetConfig; spawn(file, argv, { cwd, stdio, shell })
// runs process.execPath with absolute <pluginRoot>/runtime/run.mjs and
// returns a numeric exit code; --help returns 0 without loading runtime;
// missing/invalid config never calls spawn.
//
// plugin/build.mjs
// buildMarketplace({ sourceRoot: string, outputRoot: string,
//   install: (runtimeDir: string) => Promise<void> }):
//   Promise<{ marketplaceRoot: string, pluginRoot: string, version: string }>
// install runs npm ci --omit=dev --ignore-scripts in the staged runtime.
```

The launcher derives the canonical `pluginRoot` from its own `import.meta.url`,
not an issue argument, repo path, home-directory layout, or environment
variable. If Copilot expands a plugin-root path to invoke it, compare the
canonicalized expanded path with that derived root and reject a mismatch;
never treat an external path as authority for resource resolution. Resolve
target root with `realpath`, require its Git root to be that checkout, reject
`..` traversal before normalization, and use existing `validateRelativePath` and
`prepareFence` to reject absolute/escaping/symlinked spec paths. Resource
imports resolve from `<pluginRoot>/runtime/`; issue/spec/targets resolve from
`root`, never from the package. The child runs with `{ cwd: root, shell:
false }`, preserving the direct diagnostic CLI's relative-target semantics.

- [ ] **Step 1: Write failing config/normalization tests.** Use generated
      temporary target directories and direct module imports. Keep fixtures
      with Windows spaces in path segments and simulate shell-quoted argv
      without ever passing a command string to a shell:

  ```js
  import { expect, it } from 'vitest';
  import { loadTargetConfig } from './target-config.mjs';
  import { parseLauncherArgs, normalizeLoopInvocation } from './plugin-invocation.mjs';

  it('produces the exact diagnostic CLI argv from explicit input', async () => {
    const input = parseLauncherArgs([
      '--checkout',
      checkout,
      '--repository',
      'example/target',
      '--issue',
      '42',
      '--spec',
      'spec/timer rules.html',
      '--acceptance-kinds',
      'Rule,Workflow',
    ]);
    expect(await normalizeLoopInvocation(input, { cwd: outsideRepo })).toEqual({
      root: realCheckout,
      argv: ['example/target', '42', 'spec/timer rules.html', 'Rule,Workflow'],
    });
  });
  it('rejects an old schema explicitly', async () => {
    await expect(loadTargetConfig({ root: oldSchemaRepo, target: 'react-vitest' })).rejects.toThrow(/schema.*2/i);
  });
  ```

  `checkout`, `outsideRepo`, `realCheckout`, and `oldSchemaRepo` are
  test-local temporary paths. Also test missing config, malformed JSON,
  unsupported/noninteger `$schema_version`, unknown/unexercised target,
  wrong target shape, unsupported flag `--plugin-path`/`--marketplace`,
  issue-controlled marketplace/path text, empty/duplicate kinds, unsafe
  repository/issue, traversal (`../sibling`) and symlink escapes for checkout
  and spec, and absolute/relative checkout with spaces or embedded shell
  quotes. Do not let path normalization turn traversal into a valid sibling.

- [ ] **Step 2: Observe RED and implement the shared validator.** Run
      `npm --prefix .loop test -- lib/target-config.test.js lib/plugin-invocation.test.js`;
      expected RED: unresolved imports/missing exports, then explicit failing
      behavior until the target version and boundary tests pass. Implement
      `$schema_version: 2` in `.loop/targets.json` as an explicit migration
      (retain both target profiles and all existing fields). Validate actual
      target shape and reuse `validateRelativePath`; no schema-1 fallback,
      default target, or bundled config. Make `.loop/attended.mjs` call
      `loadTargetConfig` on initial and subsequent context reads; make
      `.loop/run.mjs` preflight it before reading the issue or importing
      preparation dependencies on a real invocation.
      Keep `--help` and invalid usage fast paths independent of parser/jsdom.
      Existing direct-entry tests must show missing/old/malformed config fails
      explicitly and `--help` still avoids the execution graph.

- [ ] **Step 3: Observe GREEN.** Run
      `npm --prefix .loop test -- lib/target-config.test.js lib/plugin-invocation.test.js attended.test.js run.test.js`;
      expected GREEN with schema version 2, without weakening Gate 1 or
      accepting .NET early.

- [ ] **Step 4: Write failing launcher/package tests.** `launch.test.js`
      injects `spawn` and asserts the exact `process.execPath`, absolute
      packaged `runtime/run.mjs` argument, target cwd, `shell: false`, and
      zero spawns for invalid config and version mismatch; `--help` must
      return 0 without importing a poison runtime. An externally expanded
      plugin-root path mismatching the `import.meta.url`-derived canonical
      root must fail before spawn. A poison target `node_modules` and a
      deliberately broken packaged dependency must prove that a valid run
      loads **only** the packaged dependency and propagates the real import
      failure. `build.test.js` stages into a test-owned temp folder and
      checks the exact allowlist: `plugin.json`, both Copilot Markdown
      components, `bin/launch.mjs`, `runtime/*.mjs`,
      `runtime/lib/*.mjs`, `runtime/prompts/*.md`, production package/lock,
      and production dependencies. Require no `*.test.js`, `coverage/`,
      `.npmrc`, `.env*`, `criteria/`, `plans/`, `targets.json`, log files,
      unbounded copied `node_modules`, or dev-only Vitest binaries. Supply
      an injected fake installer for deterministic unit tests; run one real
      production install/build separately before hand-off.

- [ ] **Step 5: Observe RED and assemble only the existing harness.** Run
      `npm --prefix .loop test -- plugin/bin/launch.test.js plugin/build.test.js`;
      expected RED: missing package builder/launcher and inventory mismatch.
      Implement `.loop/plugin/build.mjs` with a sorted file allowlist,
      version read from `plugin.json`, a fresh staging tree, and
      `npm ci --omit=dev --ignore-scripts --no-audit --no-fund
--registry=https://registry.npmjs.org/` executed there against the
      loop's lockfile. Copy `.loop` runtime `.mjs` and prompts without source
      transforms, then install only locked production dependencies adjacent
      to `runtime/run.mjs`. Never copy the source `.loop/node_modules` or
      depend on target-repo node_modules; reject unexpected entries and
      symlinks in the input inventory. Ignore `.loop/dist/` in `.loop/.gitignore`.
      Generated output is
      `.loop/dist/marketplace/.github/plugin/marketplace.json` plus
      `.loop/dist/marketplace/plugins/loop/{plugin.json,bin/,
com.github.copilot/,runtime/}`. The Git-hosted marketplace receives
      exactly this tree after human review/publication, not an npm package.

- [ ] **Step 6: Declare both thin surfaces and repo activation.**
      `plugin.json` uses
      `"$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"`,
      `"name": "loop"`, and `"version": "0.1.0"`. Both
      `com.github.copilot/commands/loop.md` and
      `com.github.copilot/agents/loop.agent.md` direct the user-facing CLI
      to the **same** `bin/launch.mjs` option contract:
      `--checkout`, `--repository`, `--issue`, `--spec`,
      `--acceptance-kinds`. They only collect/pass inputs and display the
      harness's two human decisions; neither edits, judges test results,
      routes findings, or creates PRs. `marketplace.json` uses marketplace
      name `loop-lab`, owner `Loop Lab`, and plugin source
      `./plugins/loop`; the builder sets its plugin catalog version from
      `plugin.json` and checks equality. An inert sample at
      `.loop/plugin/examples/repo-settings.json` contains these **test**
      coordinates, never installed as loop-lab repo settings:

  ```json
  {
    "extraKnownMarketplaces": {
      "loop-lab": {
        "source": { "source": "github", "repo": "example/loop-marketplace" }
      }
    },
    "enabledPlugins": { "loop@loop-lab": true }
  }
  ```

  These are explicit example values, not a live unpublished marketplace.
  Command and agent Markdown may invoke `bin/launch.mjs` only through a
  Copilot-provided plugin-root expansion proven on CLI 1.0.88. The launcher
  derives the canonical plugin root from its own `import.meta.url`; if an
  externally expanded root is passed, reject a canonical-path mismatch.
  Do not inspect or reconstruct CLI-managed `installed-plugins` paths, and
  never interpolate a root supplied by the issue. Documented
  `${PLUGIN_ROOT}` substitution in MCP configuration is **not** evidence
  of interpolation in Markdown bodies. If command and agent Markdown root
  expansion cannot be proven without a model call, leave live `/loop`
  acceptance blocked rather than inventing a layout.

- [ ] **Step 7: Pin the representation with deterministic tests.** Parse
      both packaged Markdown files to assert exactly one common launcher
      contract, all five flags, no extra workflow instructions, and discovery
      at the Agent Plugins 1.0 paths. Supply the same explicit checkout,
      repository, issue, spec and kind inputs via both surface contracts to
      `parseLauncherArgs`, then assert their respective
      `normalizeLoopInvocation(...).argv` arrays are identical and their
      resolved `runtime/run.mjs` and cwd match. Parse
      `repo-settings.json` to assert
      `enabledPlugins['loop@loop-lab'] === true` and the sole marketplace
      source is `example/loop-marketplace`; assert no actual
      `.github/copilot/settings.json` was written to loop-lab. Reject
      unsupported config **before** calling `spawn` or the host and prove
      activation representation is absent in an unrelated target fixture.
      A colliding project-level `loop` agent must be reported as a discovery
      failure, not treated as success when it shadows the plugin's agent.
      These structural tests do not claim the model obeyed a Markdown
      instruction; only an approved live acceptance can prove that path.
      Run `npm --prefix .loop test -- plugin/bin/launch.test.js
plugin/build.test.js lib/target-config.test.js
lib/plugin-invocation.test.js`; expected GREEN.

- [ ] **Step 8: Verify one self-contained build and document updates.** Run
      `node .loop\plugin\build.mjs` (one public-registry production install
      in ignored staging output) and then
      `node .loop\dist\marketplace\plugins\loop\bin\launch.mjs --help`;
      expected exit 0/help without a target config or agent dispatch.
      In a disposable target with only `.loop/targets.json` and a spec,
      run the packaged launcher with invalid/missing config and explicit
      `--checkout`, `--repository example/target`, `--issue 42`,
      `--spec spec/example.html`, `--acceptance-kinds Rule`;
      expected nonzero before issue read, host or agent invocation. For a
      valid target, test parser loading by importing the absolute packaged
      `runtime/lib/criteria.mjs` from a child process with cwd set to the
      target checkout; assert `jsdom` resolves from packaged
      `runtime/node_modules`, not target `node_modules`. Do **not** run
      valid-path CLI preparation in this no-agent smoke. Document
      marketplace add/install (`copilot plugin
marketplace add` with an operator-approved Git repo, followed by
      `copilot plugin install loop@loop-lab`), deliberate update
      (`copilot plugin marketplace update loop-lab`, then
      `copilot plugin update loop`), repo-local settings, global
      `/agent`/`--agent` and `/loop`, version/target schema compatibility,
      release artifact inventory, and direct Node diagnostic path in
      `.loop/README.md`. Do not prescribe an unsupported repo-level
      version-pin key or silently enable custom marketplace auto-update.
      Mention `COPILOT_HOME` only as Copilot's configurable home, never as
      a plugin-root path API for launcher or packaging code.
      Run targeted ESLint/Markdownlint, then request approval before any
      long coverage/build or live CLI probe.

- [ ] **Step 9: Gate live hand-off separately; stage and report.** Propose
      exact `/loop` live command, time limit, premium-request ceiling, and
      checkout/issue with no publication side effects; wait for explicit
      human approval. Only then confirm the real command and agent are
      discoverable in both scopes, repo-local activation is absent outside
      its repo, and one actual `/loop` reaches the harness's Gate 1.
      This is not proven by `/loop-spike` visibility or the 19.46-credit
      accidental exit. Stage only reviewed Task 10 files and report
      unit/integration evidence, artifact size, config migration, and any
      unverified live behavior; do **not** commit, open a PR for a probe, or
      quietly mark hand-off complete if live approval is withheld.

## Task 11: Port to .NET only after v1 and plugin hand-off are accepted

**Build order:** 9, explicitly outside the React v1 and plugin delivery milestones.

**Files:** Create `.loop/lib/trx-results.mjs`, `.loop/lib/trx-results.test.js`, `.loop/lib/dotnet-stubs.mjs`, and `.loop/lib/dotnet-stubs.test.js`; extend target/runner adapters and `.loop/README.md`.

**Interfaces:** `parseTrxResults(xml, processResult, repoRoot): NormalizedRun`.
`renderDotnetStubs(publicSurface): { path: string, content: string }[]`.
The orchestrator still calls the same runner, verdict, task, wave, review, and termination contracts.

- [ ] Write failing TRX tests from an actual small xUnit project run: passing assertion, assertion failure, missing discovery, assembly/fixture error, build error, skipped test, and `NotImplementedException`.
      Map TRX definitions/results by test identity and codebase rather than assuming a display name is unique or a codebase is a source path.
      Use the ephemeral `TestBinding` map to associate test identities with declared source test files.
      Validate namespace-qualified XML, counters, duplicate result IDs, missing definitions, malformed XML, missing result files, and process/report disagreements.

  ```js
  expect(judgeRed(parseTrxResults(trxAssertion, { exitCode: 1 }, root), bindings).status).toBe('RED');
  expect(judgeRed(parseTrxResults(trxFixtureCrash, { exitCode: 1 }, root), bindings).status).toBe('INVALID_RED');
  expect(judgeRed(parseTrxResults(trxUnexpectedPass, { exitCode: 0 }, root), bindings).status).toBe('INVALID_RED');
  expect(judgeRed(parseTrxResults(trxRawNotImplemented, { exitCode: 1 }, root), bindings).status).toBe('INVALID_RED');
  ```

  `trxAssertion`, `trxFixtureCrash`, `trxUnexpectedPass`, `trxRawNotImplemented`, `root`, and `bindings` are test-local captured/generated fixtures with the same defined normalized contract, not invented production helper APIs.
  The human accepted STRICT RED: the raw `NotImplementedException`-only case must be rejected by an explicit regression test, never whitelisted as an assertion.

- [ ] Run `npm test -- .loop\lib\trx-results.test.js .loop\lib\dotnet-stubs.test.js`; require the intended missing implementation failures.
      Use an inert XML parser, reject external entities, and keep parser errors distinct from test failures.
      Evaluate existing parser availability in the eventual .NET target's loop installation; adding one parser dependency is preferable to a hand-written XML regex.
      Use Task 10's packaged Node harness and target-owned `.loop/targets.json` in a .NET checkout; do not require a .NET product to install React or copy runtime tooling into it.
- [ ] Render only approved declared public surfaces.
      Start with ordinary public static class methods, validating identifiers, types, namespace, parameters, and exact owned source paths.
      Reject unsupported members and unsafe source collisions explicitly at Gate 1 rather than guessing how to edit C#.

  ```csharp
  namespace LoopLab.Rounding;

  public static class Rounding
  {
      public static decimal CeilingTo(decimal value, decimal multiple)
          => throw new System.NotImplementedException();
  }
  ```

  This is a deterministic template for the declared signature, not an agent-authored implementation.
  Preserve existing code; unsupported extension of an existing complex type must be reported before execution.
  Freeze the stub overlay as part of the RED baseline.

- [ ] Add a real xUnit assertion-based stub case:

  ```csharp
  [Fact]
  public void CeilingTo_returns_the_next_multiple()
  {
      decimal actual = 0;
      var error = Record.Exception(() => actual = Rounding.CeilingTo(1.1m, 1m));
      Assert.Null(error);
      Assert.Equal(2m, actual);
  }
  ```

  On the stub, `Assert.Null` fails as an assertion about successful return; after implementation, `Assert.Equal` proves the result.
  A compile failure and an unasserted raw stub exception remain INVALID_RED.
  Review still judges whether the test expresses its cited anchor.

- [ ] Extend the existing `.NET` target with `build: ["dotnet", "build", "--no-restore"]`, the strict `red_policy`, and the TRX adapter.
      Keep `results_format: "trx"` and existing `test_pathspecs: ["tests/**"]`.
      Handle separate test-project TRX output directories deterministically; discover/aggregate all expected reports rather than reading an arbitrary first file.
      Run restore, generate approved stubs, build successfully, then author/run tests for valid RED.
      On test repair, restore stub baseline plus revised tests before RED; candidate source remains separate.
- [ ] Run real build -> assertion RED -> implementation -> GREEN -> review in a temporary .NET fixture or authorized port repository.
      Test multiple assemblies and the same budgets/fences/barriers as React without branching the orchestrator on stack-specific report fields.
      Set `exercised: true` only after that real end-to-end pass; otherwise retain `false` with a specific blocking diagnostic.
      Run the common loop suite and target adapter tests together to prove the port did not rewrite v1.
- [ ] Stage Task 11's port files and report exact TRX/RED/GREEN evidence and remaining target limitations; do not commit.

## Acceptance and self-review checklist

- [ ] All nine build-order steps map to Tasks 1-11; steps 1 and 2 precede any agent/runtime integration, Task 10 follows 8/9 and precedes .NET Task 11.
- [ ] No agent performs extraction, wave planning, evidence judgment, routing, budget decisions, or publication eligibility checks.
- [ ] Agent write scope is both restricted and audited; untracked, ignored, deleted, and renamed paths are covered.
- [ ] The reference HTML is parsed as inert HTML, retains actual anchored source content, and supplies all criteria IDs.
- [ ] Plans cite anchors only, include declared ownership/dependencies/public surfaces, and show recomputed waves at Gate 1.
- [ ] Invalid RED never authorizes implementation; repaired tests are tested against the immutable pre-implementation baseline.
- [ ] Same-wave tasks actually overlap in time in isolated worktrees; one-task waves avoid that overhead.
- [ ] No task continues after a repeated per-leg signature or exhausted budget; siblings still drain.
- [ ] Gate 1 re-entry and parked-task barrier behavior are documented without adding new successful-path gates.
- [ ] Exact-tree Gate 2 and human-only commits are resolved before publication is implemented.
- [ ] The Git-hosted marketplace plugin is assembled from one Node harness, its slash/agent entrypoints share an argv contract, the target config/schema fails closed before agent cost, and package resources resolve independently of the target checkout.
- [ ] The package inventory excludes test/dev/credential/run artifacts, repo-only activation stays repo-scoped, global updates are deliberate, and unsupported repo version pinning is not invented.
- [ ] An independently approved, budget-capped live `/loop` invocation reaches Gate 1 before plugin hand-off is claimed; `/loop-spike` visibility and 19.46 accidental credits are not acceptance evidence.
- [ ] Only `.loop` run artifacts remain; prior root plan fixtures and conductor runtime are removed, not migrated.
- [ ] Standards resolution is replaceable by configuration and excludes .NET skills for React.
- [ ] v1 and the deferred .NET milestone are separately demonstrable.
- [ ] New code passes targeted tests, full coverage, lint, and development build before claiming completion.
- [ ] No implementation, dependency change, remote mutation, or commit is authorized by saving this plan.
