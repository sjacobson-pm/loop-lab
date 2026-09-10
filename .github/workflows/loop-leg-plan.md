---
name: loop-leg-plan

# The planner. Reads a story and the spec it cites, emits a plan.
#
# The agent writes ONLY plans/<story>.plan.json. It does not write the verdict.
# verdict.json is assembled in post-steps by check-plan.mjs, which the agent
# cannot reach or influence. This is the no-self-certification rule expressed
# as job structure rather than instruction.

on:
  workflow_dispatch:
    inputs:
      task_id:
        description: Task identifier
        required: true
        type: string
      attempt:
        description: Attempt number for this leg
        required: true
        type: string
      story:
        description: Story id, e.g. US-001
        required: true
        type: string

permissions:
  contents: read

engine:
  id: copilot

# Reading markdown and writing JSON. No package registries needed.
network: defaults

timeout-minutes: 15
max-turns: 30

tools:
  edit:
  bash:
    - "ls"
    - "cat"
    - "mkdir"

# Structural scope enforcement. The planner cannot write outside plans/,
# so it cannot touch src/, tests/, spec/, or its own tooling.
sandbox:
  agent:
    config:
      filesystem:
        allowWrite:
          - "plans/**"

post-steps:
  # Deterministic. Validates the plan against the story's cited criteria and
  # writes verdict.json. Exits 0 even when the plan is bad - a rejected plan
  # is a leg outcome, not a leg failure. Only a harness fault exits non-zero.
  - name: Validate plan and assemble verdict
    env:
      TASK_ID: ${{ inputs.task_id }}
      ATTEMPT: ${{ inputs.attempt }}
      STORY: ${{ inputs.story }}
    run: |
      set -euo pipefail
      node .github/tools/check-plan.mjs \
        --story "stories/${STORY}.md" \
        --plan "plans/${STORY}.plan.json" \
        --task-id "${TASK_ID}" \
        --attempt "${ATTEMPT}" \
        --out verdict.json
      jq . verdict.json | tee -a "$GITHUB_STEP_SUMMARY"

  - name: Upload verdict
    uses: actions/upload-artifact@v4
    with:
      name: verdict
      path: verdict.json
      retention-days: 7

  - name: Upload plan
    if: always()
    uses: actions/upload-artifact@v4
    with:
      name: plan
      path: plans/
      retention-days: 7
      if-no-files-found: ignore
---

# Planner

Produce an implementation plan for a single user story.

## Inputs

- Story: `stories/${{ inputs.story }}.md`
- Spec: the file named in the story's `spec_path` frontmatter field.

Read both before writing anything.

## Output

Write exactly one file: `plans/${{ inputs.story }}.plan.json`.

Write nothing else. Do not create branches, commits, or pull requests. Do not
modify the story, the spec, or any file under `src/` or `tests/`.

The file must be valid JSON with this shape:

```json
{
  "story_id": "US-001",
  "spec_path": "spec/rounding.md",
  "target_profile": "dotnet-xunit",
  "criteria": [
    {
      "anchor": "spec/rounding.md#some-anchor",
      "coverage": "primary",
      "tasks": ["T1"]
    }
  ],
  "tasks": [
    {
      "id": "T1",
      "summary": "One sentence describing the change.",
      "files": ["src/Rounding.cs"]
    }
  ]
}
```

## Rules

1. **Every criterion the story cites appears exactly once** in `criteria`,
   with its anchor copied verbatim from the story. Do not add criteria the
   story does not cite. Do not omit any it does.

2. **Never restate criterion text.** Cite by anchor. The anchor is the
   reference; the spec is the source. A task `summary` describes work, not
   the criterion.

3. **Every criterion lists at least one task**, and every task id listed
   resolves to an entry in the top-level `tasks` array.

4. **Every criterion owns at least one task that no other criterion lists.**
   A plan where every criterion points at the same tasks says nothing about
   which work discharges which criterion. Decompose until each criterion has
   work that is uniquely its own.

5. **`coverage` is `primary` for every criterion.** This story lives in one
   repository, so nothing is inherited.

6. **`PROJECT.md` is advisory context only.** You may read it for background.
   You may not cite it as a criterion, and you may not treat statements in it
   as acceptance criteria.

7. **Respect the story's out-of-scope list.** Do not plan work it excludes.

## If you cannot produce a plan

Some stories cannot be planned: a cited anchor may not exist in the spec, two
criteria may contradict, or a criterion may describe nothing observable.

In that case write the plan file anyway, containing only:

```json
{
  "story_id": "US-001",
  "blocked": true,
  "blocked_criteria": ["spec/rounding.md#the-anchor-at-fault"],
  "reason_code": "missing_anchor"
}
```

Valid `reason_code` values: `missing_anchor`, `contradictory_criteria`,
`unobservable_criterion`, `out_of_scope_required`.

Report being blocked rather than guessing. A plan built on a criterion you
could not verify is worse than no plan.

