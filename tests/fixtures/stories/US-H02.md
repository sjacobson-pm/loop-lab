---
id: US-H02
title: Widget limits including an undefined bound
target_repo: loop-lab
target_profile: react-vitest
spec_path: tests/fixtures/spec/widget-limits.html
status: ready
---

# US-H02 — Widget limits including an undefined bound

## Intent

Fixture story for the negative half of HTML anchor resolution. Two cited
anchors exist; rule-absent-entirely does not appear anywhere in the spec. The
accompanying plan proceeds anyway, so the gate must return should_have_blocked
naming only the absent anchor. A resolver that matched every id indiscriminately
would let this through.

## Criteria

Cited by anchor. Do not restate.

- `tests/fixtures/spec/widget-limits.html#rule-minutes-positive`
- `tests/fixtures/spec/widget-limits.html#rule-step-positive`
- `tests/fixtures/spec/widget-limits.html#rule-absent-entirely`

## Acceptance criteria

Artifact shape only. Cited criteria above are the authority.
