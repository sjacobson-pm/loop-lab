# Utilities (`src/utils`)

Shared, framework-agnostic helpers used across the application.
These utilities keep components, hooks, stores, and API layers lean by centralizing small bits of logic (formatting, string generation, regex safety, JSON Patch construction, etc.).

> [!NOTE]
> This README only documents the contents of `src/utils/`.
> Project‑wide setup, installing, testing, and contribution guidelines are already covered in the root project-level `README.md`.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Philosophy](#philosophy)
- [Import Patterns](#import-patterns)
- [`api.js`](#apijs)
  - [`createJsonPatchOperations(data: object): Array<JsonPatchOp>`](#createjsonpatchoperationsdata-object-arrayjsonpatchop)
  - [`getErrorMessage(error: unknown): string | undefined`](#geterrormessageerror-unknown-string--undefined)
- [`dates.js`](#datesjs)
  - [`FormattingStrings`](#formattingstrings)
  - [`calculateElapsedTime(startDate: Date): string`](#calculateelapsedtimestartdate-date-string)
- [`regex.js`](#regexjs)
  - [`escapeRegex(str: string | null | undefined): string`](#escaperegexstr-string--null--undefined-string)
- [`strings.js`](#stringsjs)
  - [`generateAlphanumericString(length: number): string`](#generatealphanumericstringlength-number-string)
- [Extending This Folder](#extending-this-folder)
- [Quick Reference](#quick-reference)

## Philosophy

Keep utilities:

- Pure (no hidden state or side effects aside from pure computation)
- Small and composable
- Well‑named with strong JSDoc / tests (100% coverage requirement still applies)
- Framework neutral (no React imports here)

Where a function starts accumulating domain rules or app state, promote it to a feature module instead of expanding a generic util.

---

## Import Patterns

You can import via the configured alias (`utils`) or relative paths.
Prefer the alias in application code for clarity, and relative paths inside tests colocated with the util files (current pattern).

```js
// Using Vite alias (preferred in app code)
import { createJsonPatchOperations, getErrorMessage } from 'utils/api';
import { FormattingStrings, calculateElapsedTime } from 'utils/dates';
import { escapeRegex } from 'utils/regex';
import { generateAlphanumericString } from 'utils/strings';

// Relative (works if importing from a sibling inside src/)
import { escapeRegex } from '../utils/regex';
```

---

## `api.js`

Helpers that support API layer patterns.

### `createJsonPatchOperations(data: object): Array<JsonPatchOp>`

Builds a JSON Patch (RFC 6902) operation array from a flat object. Each key becomes a `replace` op.

```js
import { createJsonPatchOperations } from 'utils/api';

const partialUpdate = { firstName: 'Ada', active: true };
const patch = createJsonPatchOperations(partialUpdate);
/* patch = [
  { op: 'replace', path: '/firstName', value: 'Ada' },
  { op: 'replace', path: '/active', value: true }
] */

// Send with Axios
await axios.patch('/users/123', patch, { headers: { 'Content-Type': 'application/json-patch+json' } });
```

Notes:

- Only produces `replace` operations (no add/remove/test). Extend if other ops are needed.
- Does not recurse: nested objects are inserted as raw values. For deep diffs, a diffing lib may be more appropriate.
- Keys with `undefined` values are still included. Filter beforehand if your API disallows them.

### `getErrorMessage(error: unknown): string | undefined`

Normalizes an error to a user‑friendly message.

Behavior:

- `AxiosError` with `status === 412` → returns a concurrency/conflict message.
- Other `AxiosError` → returns `error.message`.
- Standard `Error` → returns `error.message`.
- Anything else → `undefined`.

```js
import { getErrorMessage } from 'utils/api';

try {
  await api.updateRecord(id, payload);
} catch (err) {
  const message = getErrorMessage(err) ?? 'Unexpected error';
  toast.error(message);
}
```

Customization:

- If your backend uses other concurrency status codes (e.g., `409`), adapt the condition.
- You can wrap / re-export a project-specific variant in a feature folder if domain messages grow.

---

## `dates.js`

Date/time formatting constants and elapsed time calculation leveraging `date-fns`.

### `FormattingStrings`

Object containing common format tokens (date-fns compatible):

| Key        | Format              | Example              |
| ---------- | ------------------- | -------------------- |
| `date`     | `MM/dd/yyyy`        | `04/09/2025`         |
| `dateTime` | `MM/dd/yyyy h:mm a` | `04/09/2025 3:41 pm` |

Usage:

```js
import { format } from 'date-fns';
import { FormattingStrings } from 'utils/dates';

const display = format(new Date(), FormattingStrings.dateTime);
```

### `calculateElapsedTime(startDate: Date): string`

Returns an `HH:mm:ss` string showing total elapsed hours (can exceed 24) from `startDate` to "now".

```js
import { calculateElapsedTime } from 'utils/dates';

const startedAt = new Date();
// ... later
const label = calculateElapsedTime(startedAt); // e.g. "02:07:14"
```

Notes / Edge Cases:

- Pads each component to two digits.
- Hours are absolute difference (`differenceInHours`), so after 36 hours you get `36:...` (intended—no day folding).
- If `startDate` is in the future, the interval logic could yield negative durations; ensure callers pass a past date (validate upstream if needed).
- Precision is second-level; milliseconds discarded.

---

## `regex.js`

### `escapeRegex(str: string | null | undefined): string`

Escapes regex meta characters so user input can safely compose dynamic RegExp patterns.

```js
import { escapeRegex } from 'utils/regex';

const userInput = 'report(2025).pdf';
const safe = escapeRegex(userInput); // 'report\(2025\)\.pdf'
const pattern = new RegExp(`^${safe}$`, 'i');
```

Notes:

- Returns `''` for `null` or `undefined` (loose equality intentional).
- Only escapes meta characters: `[.*+?^${}()|[\\]\\/]`.
- Always coalesces to string before replacing.

---

## `strings.js`

### `generateAlphanumericString(length: number): string`

Produces a random (non‑cryptographic) alphanumeric string using `Math.random()`.

```js
import { generateAlphanumericString } from 'utils/strings';

const tempPassword = generateAlphanumericString(12); // e.g. 'a9Zk10LmPQ3R'
```

Notes:

- Character set: `A-Z a-z 0-9`.
- Returns `''` when `length <= 0`.
- Not suitable for secrets / tokens (use `crypto.getRandomValues`, UUID, or server issued values for security-sensitive contexts).
- Loop is O(n) with constant space.

---

## Extending This Folder

When adding a new utility:

1. Favor a descriptive filename (e.g., `numbers.js`, `queryString.js`).
2. Add comprehensive JSDoc (parameters, returns, edge cases).
3. Add colocated tests mirroring existing style (`// * ARRANGE / ACT / ASSERT` sections).
4. Keep each file focused—split if it begins to collect unrelated concerns.
5. Re-exporting from an `index.js` barrel is intentionally avoided to keep tree-shaking straightforward and imports explicit.

---

## Quick Reference

| Module       | Export                       | Purpose                                            |
| ------------ | ---------------------------- | -------------------------------------------------- |
| `api.js`     | `createJsonPatchOperations`  | Build JSON Patch `replace` ops from a flat object  |
| `api.js`     | `getErrorMessage`            | Normalize API / generic errors to displayable text |
| `dates.js`   | `FormattingStrings`          | Central date & date-time format tokens             |
| `dates.js`   | `calculateElapsedTime`       | Elapsed hours/minutes/seconds since a start date   |
| `regex.js`   | `escapeRegex`                | Escape user text for safe regex construction       |
| `strings.js` | `generateAlphanumericString` | Random alphanumeric (non-secure) string generator  |

---

Questions or improvements? Open a PR with tests and updated docs in this file.
