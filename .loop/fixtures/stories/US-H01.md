---
id: US-H01
title: Widget limit values validate against their spec bounds
target_repo: loop-lab
target_profile: react-vitest
spec_path: .loop/fixtures/spec/widget-limits.html
status: ready
---

# US-H01 — Widget limit values validate against their spec bounds

## Intent

Fixture story for the HTML anchor-resolution branch of check-plan.mjs. Every
cited anchor is present in the spec, so a planner that proceeds is correct and
the gate must return pass. Two anchors are double-quoted in the spec and one is
single-quoted.

## Criteria

Cited by anchor. Do not restate.

- `.loop/fixtures/spec/widget-limits.html#rule-minutes-positive`
- `.loop/fixtures/spec/widget-limits.html#rule-step-positive`
- `.loop/fixtures/spec/widget-limits.html#rule-offset-nonneg`

## Acceptance criteria

Artifact shape only. Cited criteria above are the authority.
