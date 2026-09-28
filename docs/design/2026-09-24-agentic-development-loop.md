# Agentic Development Loop — Design

Date: 2026-09-24
Status: Approved design; Tasks 1-7 implemented as module APIs, delivery pending
Build target: `loop-lab` (sandbox), portable to `partner-performance-hub--api` and `--function-app`

## Problem

Turning a user story into a reviewed pull request currently requires a human to
drive every step. An earlier attempt (the `loop-lab` leg conductor) automated
this as a set of GitHub Actions workflows, one per leg. Because every leg ran as
a separate Actions run with no shared memory, continuity had to be reconstructed
from custom files on disk: `verdict.json` artifacts, a `loop-state` orphan
branch ledger, a `legs.json` transition table, and two fine-grained PATs to
escape gh-aw strict mode.

Those files were not the defect. They were the cost of running each leg in an
isolated process. The defect was choosing isolated processes in the first place.

## Desired outcome

One orchestrator, invoked with a GitHub issue and a spec package already in the
repository, that decomposes the issue into tasks, implements each task under
red-green discipline, reviews the output independently, and opens a pull
request — pausing for the human exactly twice. A versioned Copilot plugin
provides both repo-local and developer-global entrypoints to the same Node
harness; the plugin launchers do not own workflow decisions.

## Constraints

Stated by the human partner:

- Input is a GitHub issue written in prose. The orchestrator maps it to spec
  anchors itself; the issue does not cite anchors.
- The spec package is HTML emitted by a custom product discovery agent
  (`spec/pomodoro-workday-timers-spec.html` is the reference shape).
- Exactly two human checkpoints: after decomposition, and at PR creation.
  Every other step runs without human input.
- PR granularity is the orchestrator's decision, based on story size.
- Attended operation. The human starts the loop and can redirect at gates.
- Decomposed tasks are organized into waves that respect dependencies
  (carried over from GSD Core).
- Coding standards are pluggable. Current `pa-review-dotnet*` skills are a
  starting point and must be replaceable by organization-level skills.
- The human commits and merges. The loop stops at "PR opened".
- Plugin delivery through a Git-hosted Copilot plugin marketplace is required
  before hand-off. Each target checkout supplies its own `.loop/targets.json`
  and spec package; neither entrypoint substitutes a bundled target config.

## Non-goals (v1)

- Unattended operation in GitHub Actions.
- Stories spanning more than one repository.
- Automatic merge.
- A hosted loop service.
- Direct repository plugin installation as the durable delivery mechanism.

## Key decisions

### 1. Red-green is enforced by ordering, not by review

A reviewer inspecting a finished diff cannot verify that tests ever failed; it
sees only green. A reviewer that writes the tests itself, after implementation,
writes tests that pass against whatever was built — self-certification.

Red-green is therefore a property of the pipeline order:

1. `test` writes failing tests, restricted to test paths.
2. The harness runs them and requires a valid RED.
3. `implement` writes production code, forbidden from touching test paths.
4. The harness re-runs and requires GREEN.
5. `review` judges a machine-proven red-to-green transition it did not produce.

The implementer cannot weaken a test to reach green; the test author cannot
implement. This generalizes the no-self-certification rule from the prior
design.

### 2. Valid RED is a verdict, not an exit code

A nonzero exit does not prove RED. Zero-test discovery, fixture crashes, parser
errors, unrelated failures, and unexpected passes are all INVALID_RED and must
not authorize GREEN. The named target test must fail on an assertion about the
planned behavior.

This mirrors `gsd_run check tdd-red-evidence` in GSD Core
(`.github/gsd-core/references/tdd.md`).

### 3. .NET requires a stub step before RED

In C#, a test calling a method that does not exist fails to compile, killing the
whole assembly — producing a build error rather than a per-test failure. Late-
bound stacks such as Vitest fail cleanly per test.

Resolution: the plan declares each task's `public_surface`. A deterministic stub
step creates those signatures throwing `NotImplementedException`, so tests
compile and fail as real assertions. RED then means the same thing in every
stack.

### 4. Waves are computed, not guessed

Two deterministic stages, both modeled on GSD Core:

1. Topological sort over `depends_on` produces dependency levels
   (`plan-dependency-graph.cjs`, Kahn's algorithm).
2. Within a level, greedy first-fit on `files_modified` partitions tasks so no
   two tasks sharing a file cohabit a wave
   (`file-overlap-partitioner.cjs`).

Caveat inherited from that algorithm: a task declaring an empty `files_modified`
array overlaps nothing and coalesces into the first wave. The partitioner cannot
guard against undeclared writes. Accurate `files_modified` is load-bearing,
which is why the human reviews it at Gate 1.

### 5. Per-task worktrees

Waves are only worth computing if same-wave tasks run concurrently, and
concurrent agents need isolated checkouts. Each task in a wave of more than one
runs as a child session with its own worktree; a wave of one degenerates to a
plain sub-agent with no worktree overhead. A merge barrier integrates worktrees
and re-runs the full suite before the next wave starts.

### 6. Agents judge; the harness decides

The orchestrator owns all deterministic work: extraction, wave planning, running
tests, parsing results, routing findings, enforcing budgets. Sub-agents own only
the four judgment legs. No agent reports its own verdict.

### 7. One versioned plugin, two thin entrypoints

Deliver one versioned GitHub Copilot plugin through a Git-hosted Copilot plugin
marketplace. The plugin bundles the shared, prebuilt Node harness, a
Copilot-specific `/loop` slash command, and a custom loop agent. Both entrypoints
only normalize invocation inputs and launch that same harness; neither
decomposes, edits, reviews, decides verdicts, nor publishes. The harness is the
sole workflow owner and retains the two human gates.

- **Repo-local:** the target repository retains `.loop/targets.json` and its
  spec package, and declares the configured marketplace/plugin in
  `.github/copilot/settings.json`. Copilot activates it only in that repository.
- **Developer-global:** the developer adds the marketplace once and installs
  the same plugin globally. Its `/loop` command or custom agent (selected by
  `/agent` or `--agent`) targets the current checkout or an explicit local
  repository path with the required config and spec.

Both modes accept a target checkout, GitHub issue, spec path, and explicit
acceptance kinds. The launchers pass these to the harness without changing their
meaning. A missing or invalid target config fails closed with actionable
diagnostics before any agent cost. The current `.loop/` runtime files are the
source to package, not a second implementation to copy into every target repo.
Direct `node .loop/run.mjs` in this development repository remains a
developer/diagnostic entrypoint, not an assumed file in every target checkout
or the primary hand-off experience.

Repo-local declarations select or pin an explicit marketplace plugin version
according to verified marketplace capabilities; developer-global updates are
deliberate and visible. The packaged harness checks the existing
`$schema_version` in the repository's `.loop/targets.json` against its
supported schema versions and rejects a mismatch before execution. The exact
manifest and update mechanics belong to the implementation plan, not an
assumed CLI capability.

Only the configured marketplace and plugin source are trusted. An issue cannot
supply a plugin path, marketplace, or executable code location. No registry
credentials, npm publishing secrets, or package tokens belong in target repos.
The Git-hosted marketplace/repository can be shared as a versioned source now
and organization-pinned or managed later. Direct repository installation is
not the durable design: Copilot CLI 1.0.88 warns that route is deprecated.
Neither npm nor Azure Artifacts is required to deliver the loop.

## Pipeline

```text
repo-local /loop OR global /loop / custom agent
      |          thin launcher: checkout + issue + spec + acceptance kinds
  [Node harness: validate target config and schema before agent cost]
      |
  [extract]      deterministic: HTML -> criteria index
      |
  [decompose]    agent: tasks with anchors, depends_on, files_modified
      |
  [wave-plan]    deterministic: topo levels -> file-overlap partition
      |
=== GATE 1 (human) ===  review tasks, deps, file sets, wave layout
      |
  per wave, per task, in parallel worktrees:
      [stub]       declared public surface -> NotImplementedException
      [test]       agent: failing tests, test paths only
      [RED]        harness runs -> must be valid RED
      [implement]  agent: source paths only
      [GREEN]      harness runs -> must pass
      [review]     agent: criteria coverage + standards
      |
  [merge-wave]   integrate worktrees, re-run full suite
      |          (repeat for next wave)
=== GATE 2 (human) === review staged tree; human commits/publishes
      |
  [verify published tree] -> [open PR]
```

## Legs

| Leg | Kind | Writes | Fence |
| --- | --- | --- | --- |
| extract | deterministic | criteria index | n/a |
| decompose | agent | `.loop/plans/<issue>.plan.json` | plan file only |
| wave-plan | deterministic | plan `waves` array | n/a |
| stub | deterministic | source paths | `public_surface` only |
| test | agent | test paths | `test_pathspecs` |
| implement | agent | source paths | inverse of `test_pathspecs` |
| review | agent | findings (in-session) | writes no code |

Both fences derive from a single config key, `test_pathspecs`, so they cannot
drift apart.

## Review failure routing

The reviewer never edits code. Editing would make it the author of the work it
reviews on the next pass. It emits findings, each tagged with a fault domain
naming the leg at fault; the orchestrator routes.

| Finding | At fault | Routes to |
| --- | --- | --- |
| Criterion has no test exercising it | test | `test` |
| Test asserts something the anchor does not say | test | `test` |
| Criterion tested but behavior wrong | implement | `implement` |
| Standards violation (naming, SOLID, security) | implement | `implement` |
| Task touched files outside its declared set | implement | `implement` |
| Anchor contradictory or unobservable | decompose | Gate 1 |
| Work needs a file another task owns | decompose | Gate 1 |

The two `decompose` rows are re-decomposition. Because the human owns
decomposition at Gate 1, these surface rather than silently re-planning. All
other findings are repaired inside the task without human involvement.

Re-entry rules:

- Routing to `implement` re-runs GREEN.
- Routing to `test` re-runs RED and then GREEN. A changed test must still fail
  against the stub before it is allowed to pass; otherwise a "fix" that merely
  asserts current behavior passes unnoticed.
- `review` always runs last, against the repaired state.

## Termination

Carried over from `loop-decide.mjs`:

- **Loop breaker.** Normalize findings, hash them into a per-leg signature. A
  repeated signature halts that task immediately — an identical complaint twice
  means the repair produced no new information, so remaining budget is
  irrelevant.
- **Budgets.** Per-cycle and per-task execution caps as backstops.

A task that trips either is parked. Its siblings in the wave run to completion;
parked tasks are surfaced together at the merge barrier rather than
interrupting the wave.

## Artifacts

Three durable execution files under `.loop/`. Each is justified by a gate or a
fence; everything else stays in-session. A target repository carries its
`.loop/targets.json` and spec package, plus `.github/copilot/settings.json` for
repo-local plugin activation. The harness is distributed by the plugin rather
than copied into each target checkout. Generated criteria and plans still stay
under `.loop/`; a root-level `plans/` directory would read as product content
in a repository such as `partner-performance-hub--api`.

### `.loop/targets.json` (existing, extended)

Per stack: `install`, `test`, `results_format`, `test_pathspecs`, plus new
`build` (for the .NET stub compile) and `red_policy`.

`test_pathspecs` serves three purposes: results discovery, the `test` leg write
fence, and the inverse fence for `implement`.

Current state: `react-vitest` is `exercised: true`; `dotnet-xunit` is declared
but `exercised: false` with no trx parser. Adding .NET is a target entry plus a
trx parser, not new architecture.

The target config declares a schema version checked against the packaged
harness before agent dispatch. Absence, invalid contents, or an unsupported
version are errors, never permission to use a bundled default target.

### `.loop/criteria/<issue>.json`

Deterministic projection of the spec HTML. The discovery agent emits
machine-readable attributes on every anchored element — `data-pd-slot`,
`data-pd-name`, `data-pd-kind`, `data-pd-screen`, `data-pd-detail` — so a parser
can produce an anchored criteria index without an agent reading 316KB of HTML.

Generated by a parser, never by an agent, so no agent can invent a criterion.

### `.loop/plans/<issue>.plan.json`

The single agent-authored artifact, existing because Gate 1 needs a reviewable
object. Per task: `id`, `summary`, `criteria` (anchors), `depends_on`,
`files_modified`, `public_surface`. Plus the computed `waves` array so the human
reviews the actual parallel layout, not just its inputs.

### Removed from the prior design

`verdict.json`, the `loop-state` ledger branch, `legs.json` transitions,
`loop-conductor.yml`, the fixture and stub-leg scaffolding, and both PATs
(`LOOP_COMMIT_TOKEN`, `LOOP_DISPATCH_TOKEN`). All existed to carry memory
between isolated Actions runs. Test results become ephemeral in-session data;
the ledger becomes in-memory state; transitions become the routing table above.

The existing root-level `plans/` directory goes with them. Its contents
(`US-001.plan.json`, `US-003.plan.json`) are fixtures of the prior design and
are removed rather than migrated; new plans are written to `.loop/plans/`.

## Standards resolution

The reviewer loads whatever is present, in precedence order:

1. Organization-level review skills, when available.
2. Local `pa-review-dotnet` / `pa-review-dotnet-security` skills.
3. Repository `copilot-instructions.md` and `CONTRIBUTING.md`.
4. The `github-process-docs` C# guidelines.

Stack-appropriate only: .NET skills do not run against a React repository.
Replacing these with organization skills is a configuration edit.

## Criteria citation

Criteria are cited by anchor and never restated. The anchor is the reference;
the spec is the source. This rule is carried forward unchanged from the prior
design, where it prevented plans from drifting away from spec text by
paraphrase.

## Delivery acceptance

Deterministic tests prove that repo-local `/loop`, developer-global `/loop`,
and the custom agent normalize the same inputs into the same harness
invocation. Missing, malformed, or schema-incompatible target configuration
fails before agent cost. Repo-scoped activation stays inactive outside its
declaring repository. The packaged harness resolves its own resources from the
plugin while reading target config and spec from the selected checkout. Tests
also verify slash-command and custom-agent discovery in both supported scopes.

A separately approved, budget-capped live acceptance must demonstrate an
actual `/loop` invocation reaching the harness's human Gate 1. The feasibility
spike did not invoke `/loop` intentionally to avoid model cost; it accidentally
consumed 19.46 AI credits while exiting, made no changes, and is not
acceptance evidence.

## Build order

1. Criteria extractor (spec HTML to criteria index) — deterministic, testable
   in isolation.
2. Wave planner (topological sort plus file-overlap partition) — deterministic.
3. Orchestrator skeleton with Gate 1, stopping after wave planning.
4. `test` and `implement` legs with fences, RED/GREEN verdicts.
5. `review` leg with fault-domain routing.
6. Loop breaker and budgets.
7. PR creation and Gate 2.
8. Package the existing Node harness as the versioned Copilot marketplace
   plugin, add both thin invocation modes and schema handshake, and verify
   hand-off acceptance. This follows the Task 8 budget and Task 9 publication
   work, and precedes any hand-off; the exact source/build layout is a
   separate implementation-plan decision.
9. Port: `dotnet-xunit` target entry and trx parser (deferred until the React
   target and plugin delivery are exercised).

Steps 1 and 2 are pure functions with no agent involvement and should be built
and tested first.

## Open items

- Trx parser does not yet exist; `dotnet-xunit` remains unexercised until step 9.
- Organization-level review skills are not yet published; the reviewer uses
  local skills until they are.
- Verify repo-local version selection/pinning, global plugin updates, agent
  and slash-command discovery, and access to packaged Node code in the target
  Copilot CLI/marketplace before fixing the plugin layout.
- The Git-hosted plugin marketplace is the accepted delivery channel; exact
  source/build and organization management remain to be designed. Azure
  Artifacts is an investigated but unselected candidate; the loop does not
  depend on that feed.
