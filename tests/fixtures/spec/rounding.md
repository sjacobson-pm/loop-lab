# Rounding specification

Each criterion below carries an explicit anchor. Plans cite criteria as
`spec/rounding.md#anchor`. Criteria are never restated in a plan.

---

## CeilingTo rounds up to the next multiple {#ceiling-to-basic}

`CeilingTo(value, multiple)` returns the smallest multiple of `multiple` that
is greater than or equal to `value`.

Boundary: when `value` is already an exact multiple, it is returned unchanged.

Observable: return value of `CeilingTo`.

---

## CeilingTo handles negative values {#ceiling-to-negative}

For negative `value`, the result is still the smallest multiple greater than
or equal to `value`. `CeilingTo(-7, 5)` is `-5`, not `-10`.

Boundary: `value` exactly equal to a negative multiple is returned unchanged.

Observable: return value of `CeilingTo`.

---

## CeilingTo rejects a non-positive multiple {#ceiling-to-invalid-multiple}

When `multiple` is zero or negative, `CeilingTo` throws
`ArgumentOutOfRangeException` naming the `multiple` parameter.

Boundary: `multiple` of exactly zero throws; `multiple` of the smallest
positive decimal does not.

Observable: exception type and `ParamName`.

---

## CeilingTo preserves decimal scale of the multiple {#ceiling-to-scale}

The result carries the same scale as `multiple`. `CeilingTo(1.0m, 0.25m)`
returns `1.00`, not `1`.

Boundary: a `multiple` with zero scale produces a result with zero scale.

Observable: `decimal.GetBits` scale component of the return value.

