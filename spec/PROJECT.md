# Rounding utilities

Advisory context for the rounding library. **Not a source of acceptance
criteria.** Nothing here may be cited by a plan as a criterion; only anchors
in `spec/rounding.md` are citable.

## Why this exists

Several downstream reports round monetary and duration values to arbitrary
multiples (nearest 5 minutes, nearest 25 cents). Each has grown its own
implementation and they disagree at the boundaries. This library replaces
them.

## Conventions

- Target framework is .NET 10, C# with file-scoped namespaces.
- Public surface lives in `src/`, tests in `tests/unit/`.
- Tests are xUnit. One assertion concept per test.

## Known open questions

- Whether a banker's rounding variant is needed. Out of scope for now.
- Decimal vs double. Current answer is decimal only.

