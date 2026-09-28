# Attended development loop

Tasks 1-8 provide criteria extraction, deterministic wave/PR grouping,
validated decomposition, a Copilot CLI transport, layered write auditing,
target execution/result verification, post-approval task/wave/review APIs,
and termination/usage accounting. Task 9's deterministic implementation is
complete for this milestone: it connects Gate 1 through reviewed waves,
staged component trees, one Gate 2, and authenticated PR confirmation.
The attended end-to-end publication path has **not** been accepted live.

`runTarget` and the Task 6 execution adapters remain module APIs and are now
called after Gate 1. Single- and two-task live CLI
acceptance of the Task 6 path passed. The Task 7 review path has not been
exercised with a live agent. Task 8 adds module-level termination and usage
accounting. Task 8's deterministic module APIs are complete; plugin delivery
and .NET portability (Tasks 10-11) remain unauthorized and pending.

Task 7's post-approval review module APIs are complete: standalone loop
coverage passed 543/543 tests and combined app/loop coverage passed 982/982,
both at 100% statements, branches, functions, and lines. Task 7-scoped
ESLint, Markdownlint, and Prettier passed. Full `npm run lint` and the
`npm run build:dev` prebuild remain blocked by only three accepted, unchanged
legacy story headings (`stories/US-001.md`, `US-002.md`, `US-003.md`, MD025).
The human-authorized direct `npx --no-install vite build --mode development`
succeeded. No live reviewer agent was invoked for Task 7.

Task 9 targeted tests passed 140/140 across 7 files; plan-dependent targeted
tests passed 117/117 across 5 files. Standalone loop coverage passed 638/638
across 25 files; combined app/loop coverage passed 1077/1077 across 100 files.
Both coverage runs reached 100% statements, branches, functions, and lines.
Task 9-scoped ESLint, Markdownlint, Prettier, and `git diff --cached --check`
passed. Full `npm run lint` and `npm run build:dev` remain blocked only by
the three accepted, unchanged MD025 story headings above; Vite did not run
for Task 9. No attended live end-to-end publication acceptance was run.
A deterministic full-loop acceptance test now uses temporary Git trees and
synthetic ports; attended live publication acceptance remains unrun.

## Run preparation

Requires Node >=22.15, npm >=10.9, Git, and authenticated GitHub CLI and Copilot CLI.
Install the loop's own public-registry dependencies independently of the app:

```powershell
npm --prefix .loop ci --registry=https://registry.npmjs.org/
npm --prefix .loop run test:coverage
```

`.loop/package.json` and its lockfile own `jsdom` and the loop's test tooling.
No React packages, Font Awesome token, or private registry installation is needed.
This decouples the tooling from React; it does **not** remove the Node/npm
prerequisite in future .NET repositories. Do not vendor a parser or fall back to
ambient app dependencies when the loop installation is missing.

The standalone test command runs only loop tests with a Node environment, without
the app's Vite plugins or test setup. The repository's full suite also includes
the loop tests. The real HTML package under `spec/` remains an integration fixture.
Vitest 3.2.7 fixes the critical UI-server advisory affecting the original 3.2.4
tooling; npm still reports three moderate package entries for the same
[redirect-mock advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)
through `vitest`, `@vitest/mocker`, and `@vitest/coverage-v8`. The vulnerable
dev-server plugin accepts a client-supplied redirect and reads a file without the
server's allowlist check. Its public WebSocket handler is unauthenticated;
Vitest browser-mode RPC additionally requires a token. The published advisory
and installed plugin code identify these server-registration paths, not the
Node `vitest run` path used here; this configuration enables neither browser mode
nor these public mocker plugins. The human accepts that remaining risk to avoid
a major-version migration now. Do not expose a test server using these packages.
The app retains its existing Vitest version; only `.loop` uses 3.2.7.

On Windows, run these commands from the canonical checkout path, not an 8.3
alias such as `SETH~1.JAC`. A disposable isolation probe passed all tests from
the alias but reported zero V8 coverage because source paths had two identities;
running npm from the canonical path produced full coverage. The standalone
config also canonicalizes its root. No coverage thresholds are relaxed.

Run from the repository worktree in an attended terminal:

```powershell
node .loop\run.mjs owner/repo 42 spec/example.html Rule
```

Help and invalid-usage paths do not import the execution graph or `jsdom`.
Execution imports adapters only when needed; import failures are reported as
run failures with a nonzero exit, not hidden by the help fast path.
The issue reader and Git-worktree utilities also avoid preparation-only imports;
criteria extraction loads only when `prepareAttended` reaches preparation.

The final argument is an explicit comma-separated acceptance-kind selection.
`Rule` is the human-approved recommendation, not an implicit extractor default.
The issue is read from GitHub as prose; no story fixture or `## Criteria` heading
is required. The current target is `react-vitest` only. Its required `publication_base` in
`.loop/targets.json` selects the exact PR base branch (`main` in this repo);
missing or invalid values fail before an agent starts. The attended run also
requires a clean target checkout at invocation, before agent execution.
Review and commit existing changes yourself before starting; the harness
does not absorb a dirty baseline into a PR.

The parent writes `.loop/criteria/<issue>.json`, seeds a detached worktree from
existing HEAD plus the parent's exact Git-visible staged/unstaged/untracked bytes,
and asks a fresh decomposition context to write `.loop/plans/<issue>.plan.json`.
Worktrees use `--no-checkout` and exclusive file creation, so an inherited HEAD
symlink cannot redirect seeding writes before the agent audit begins.
It never creates commits. Ignored dependencies and credentials are not copied.
Symlinks/non-regular files and ambiguous declarations fail closed.
Only an audited, validated plan is copied back; temporary worktrees are removed.
Disposal uses the stable shared Git directory, so a derived worktree does not
depend on its seeding worktree remaining present. Git disposal failures propagate.

At **Gate 1**, review the full plan, anchors, files, waves, warnings, measured usage,
and every proposed PR group. Reply `approve`, `revise`, or `stop`.
Revision sends feedback to a new decomposition context, subject to the target's
total agent-execution cap (15 by default). An exhausted preparation cap fails
explicitly before another agent call, without charging task siblings.
Editing the saved plan requires validation and another display at the same gate.
Source/configuration/baseline changes invalidate approval and return `stale`.
Approval digests are in-memory; loss of the parent process has no resume guarantee.

Dependency-connected tasks form one PR; independent components form separate PRs,
in stable input order. Grouping ignores edge direction and is harness-computed.
If independent components claim the same file, publication rejects the plan
before execution and requires revised dependencies at Gate 1. Each group has
a distinct disposable branch/worktree rooted in the original reviewed checkout,
with only that group's audited deltas replayed in wave order. Generated
criteria/plan artifacts remain in the target checkout for Gate 1 but are
excluded from each group's staged tree; only audited delta paths are staged.
Its final full suite must be GREEN. At **Gate 2**, inspect the listed paths, Git tree IDs,
and evidence, then **commit and push each group yourself while the prompt is
open** before replying `publish`; `stop` leaves no PR. The harness compares
the staged tree, local branch/commit, and authenticated remote branch/commit
before creating or recovering the actual PR URLs. A changed tree or approval
returns `stale`; an uncommitted or unpublished branch returns
`awaiting-publication`, both with a nonzero exit. Disposable worktrees are
removed when the command returns; no agent commits, pushes, merges, or
silently re-publishes.

## Test execution boundary

`lib/runner.mjs` runs trusted target argv in a supplied worktree. `baseline`
installs dependencies first; `red`, `green`, and `integration` reuse that
installation. A configured build runs before tests. Every invocation uses a new
temporary report directory and removes it before returning. Installation, build,
spawn, cancellation, timeout, report, parser, and cleanup failures remain explicit
in incomplete evidence; they cannot authorize implementation.

The React profile retains `vitest-json`, with an additional harness reporter for
structured errors. The parser cross-checks test identities, states, error messages,
suite/test counts, process exit and timestamps. Named RED requires assertion
comparisons from a recognized test-body runner boundary, not merely an
`AssertionError` string. Setup, returned cleanup and `onTestFinished` assertions
are not valid RED. Unknown provenance fails closed. These contracts were
exercised with app Vitest 3.2.4 and isolated Vitest 3.2.7; unfamiliar runner shapes
require adapter validation, not a relaxed verdict.

Structured errors still cannot establish semantic correctness or resist arbitrary
malicious test code running with the same OS privileges. Independent review must
judge whether the assertion actually represents the cited observable.

`lib/process.mjs` uses literal argv with `shell: false`, bounded subprocess
output (8 MiB of raw bytes by default), and a five-minute default deadline.
On Windows, npm/npx run through the npm CLI bundled beside the selected Node
executable, not a `.cmd` shell fallback; that layout was verified on this host.
Other Windows npm layouts require an explicit adapter change if that CLI is absent.
Cancellation awaits exact-PID process-tree termination and stdio closure.
POSIX commands use supervised process groups without `unref`; their group
termination is unit-tested here, not claimed as a live Linux verification.

## Task execution APIs

`execution.mjs` supplies `createExecution({ root, target, index, agent, runner })`
for explicit post-approval callers. It owns private baseline identifiers and
disposable worktrees. Its `runTask` and `runWave` methods do not modify the caller's
working tree, create commits, or publish. Call `dispose()` after use; shutdown
rejects new tasks immediately and drains already-started work before cleanup.
The CLI imports this adapter after Gate 1 approval.

Each replay installs and verifies a fresh baseline, then applies immutable test
patches (including support files without named bindings). GREEN additionally
applies the audited source patch. Git-visible source, tests, and configuration
must remain unchanged while the runner executes them. Ignored dependency/cache
outputs are not treated as source changes. This is not an OS sandbox.
The completed write audit hands its physical after-snapshot to patch capture
without a second capture that could trust a subsequent write. Fresh captures
still check for intervening changes before test freeze, the next author leg,
and final delta acceptance. Candidate baselines retain the runner-verified
after-snapshot; later baseline reads recapture and reject drift.

After candidate GREEN, Task 7 requires an independent read-only review in a
fresh disposable worktree replaying the audited task delta. The reviewer
inspects anchored criteria, bindings, RED/GREEN reports, source/test changes and
resolved standards; it cannot edit or override a harness verdict. Its physical
write audit and transport evidence must be clean before findings are accepted.
The harness requires exact recorded `view` requests for every resolved repository
standard file; missing reads park the task. This proves files were opened, not
that the reviewer applied their guidance.
Configured optional standards missing from the actual repository or the
caller's explicitly supplied skill-availability catalog are recorded as missing.
Missing required standards park the task. The React target excludes .NET-only
skills; the declared .NET target remains unexercised. Review findings route to
test, implementation, or Gate 1 by deterministic priority. A repaired test must
still RED on the original frozen baseline and GREEN on candidate source;
implementation repair repeats GREEN, and both paths re-review. Per-leg repair
attempts use Task 8's per-task, in-memory signature breaker and target-configured
limits. `.loop/targets.json` declares `budgets: { "cycle": 3, "total": 15 }`;
`cycle` bounds each backward repair route, while `total` counts all task agent
legs, including initial test, implementation, and review. A repeated
destination-leg finding parks work before a cycle or total-cap check.
Trusted test commands are not agent calls. No ledger or verdict file is written.

The wave barrier drains all siblings, preflights ownership, applies binary-safe
patches to a disposable candidate in plan order, and requires full-suite GREEN
before returning an accepted baseline identifier. Failures never partially
overwrite the caller's working tree. Completed sibling deltas remain in evidence.
Decomposition findings are aggregated at the drained barrier; `reenterGate1`
invalidates the prior approval and requires human revision plus a newly
validated, displayed plan before work can resume. The CLI now routes this
back to the same Gate 1 after disposing the previous execution.

## Publication operations

The approved spec/config/plan bytes are hashed before execution and checked
again before staging and after Gate 2. `publication-local.mjs` selects
dependency-connected groups and reads real local Git tree and commit identities;
`github-publication.mjs` uses literal authenticated `gh` argv for remote
identity, existing-PR lookup, PR creation, and response confirmation.
GitHub transport errors are failures, never inferred absence of a branch or
success. Existing matching PRs are recovered; no merge is performed. PR bodies
cite the issue, source anchors, tasks/waves, deterministic RED/GREEN evidence,
and resolved standards without paraphrasing criteria.

The removed Actions conductor, legacy state branch, fixture runner, root
`plans/` fixtures, and token references are not execution paths. A repository
operator must separately retire secrets `LOOP_COMMIT_TOKEN` and
`LOOP_DISPATCH_TOKEN` and the remote `loop-state` branch after review; this
implementation does not delete GitHub secrets or remote refs. Do not run
live publication without separately approved issue/spec, command, time and
premium-request ceiling.

## Host boundary

`host.mjs` alone knows Copilot argv and JSONL. `attended.mjs` owns GitHub reads,
worktree lifecycle, artifact I/O and the mandatory audit.
`lib/orchestrator.mjs` owns deterministic coordination and injected human gates.
Pure extraction, validation, waves, and fence policy never import the host.

GitHub Copilot CLI **1.0.88** was exercised on this Windows host:

```text
copilot -p <prompt> --output-format json -C <worktree>
  --available-tools view glob grep create edit
  --no-ask-user --allow-all-tools --disable-builtin-mcps
  --no-custom-instructions --deny-tool write(<exact-absolute-path>)
```

Review exposes only view/glob/grep and denies all built-in `write`.
No shell, network, MCP, or delegation tools are exposed.
No `--allow-all-paths`, `--add-dir`, `--fleet`, or `--acp` is enabled.
Explicit `profile.model` and `profile.reasoningEffort` can be supplied through
`prepareAttended`; otherwise the CLI's configured model selection applies.
`--fleet` (built-in agent orchestration) and `--acp` (server transport) are
unevaluated alternatives, not adopted scheduling behavior.

The stream parser handles split UTF-8, CRLF, partial final lines, unknown events,
messages and tool requests. It requires one valid terminal `result`, valid write
telemetry and usage, and matching successful process/result exits.
Timeout, spawn/protocol failure, missing evidence, or oversized stdout fails the
transport. Shutdown waits for subprocess closure before the audit.
A successful transport is **not** an accepted plan or a test verdict.

Usage counters are measured premium requests, not dollars or AI credits.
Each terminal result contributes once; failed invocations retain known usage.
The live read/write/decomposition probes each reported 7.5 premium requests with
the configured model; isolated sandbox probes reported 1 each. This is not a
fixed per-leg cost.
Task 8 totals terminal usage once per invocation and reports missing evidence
as incomplete, not as zero cost. Task and wave APIs return measured counters
and parked reasons. Preparation usage remains visible at Gate 1; Gate 2
displays approved wave evidence in the deterministic publication lifecycle,
but this presentation has not been accepted live. The optional Copilot
`--max-ai-credits` ceiling is deferred defense-in-depth: CLI 1.0.88 enforcement
and terminal behavior remain unverified without a separately approved live
probe. It is not wired or enabled, and is not a premium-request cap.

## Three fence layers

1. **Exact preventive denies.** The shared Git `test_pathspecs` classifies task
   declarations. Test authors deny declared source; implementers deny declared
   tests; known harness/spec/config/evidence paths are denied as exact absolute
   paths. Decomposition may produce only its exact issue-plan file.
2. **Optional shell hardening.** An isolated MXC probe failed on this host:
   PowerShell requires Process Security Environment 1.1 filesystem enumeration,
   which this Windows build does not report. No global settings were changed and
   no bypass was enabled. Built-in edits are not OS-sandboxed even on supported
   hosts. Production legs do not expose shell tools.
3. **Authoritative acceptance audit.** Compare pre/post content, logical index,
   NUL-delimited Git status, ignored/untracked files, deletions and both rename
   endpoints. Union those paths with terminal write telemetry. Reject undeclared,
   wrong-leg, protected, outside-worktree, symlink and incomplete-evidence writes,
   including after failed/timed-out legs. Never integrate rejected output.

The Git matcher uses a disposable repository/index, so nested `*.test.js` behaves
like Git and candidate untracked paths are included without altering the real
index. Declarations use exact literal identity; no case folding or normalization
is performed by the wave planner.
Snapshot failure drains every parallel inventory/Git operation before returning,
so callers cannot remove the worktree while sibling subprocesses still use it.

This audit is an acceptance guarantee, **not a hostile-process sandbox**. It
cannot prove absence of transient reverted shell writes, unreported outside-tree
writes, remote effects or aliases such as hard links. Keep unrelated credentials
and mutation-capable tools inaccessible. Complete ignored-file inventory has a
cost proportional to worktree contents.

## Measured integration constraints

- Relative `write(src)` is not a subtree fence. A live exact-file denial blocked
  a future source write while allowing a declared test. A second, undeclared
  source write succeeded in the disposable context and was rejected by the audit.
- The real criteria index serializes to about 141 KB, exceeding Windows' 32,767
  character process-command limit. Prompts reference the full protected index in
  the seeded worktree rather than inlining it. Oversized argv fails before spawn.
- Built-in `create` does not create missing parent directories. The harness
  provisions the plan directory before its baseline snapshot.
- Windows short TEMP paths and canonical paths differ. The adapter retains the
  caller's root alias for telemetry mapping and uses canonical preventive paths;
  this does not relax literal task-file ownership.

See [module contracts](lib/README.md), the
[approved design](../docs/design/2026-09-24-agentic-development-loop.md), and the
[implementation plan](../docs/design/2026-09-24-agentic-development-loop.plan.md).
