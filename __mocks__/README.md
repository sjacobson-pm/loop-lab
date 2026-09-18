# **\_\_mocks\_\_** Directory

Central place for **manual mocks of third‑party dependencies** (auth, telemetry, networking, UI libs).\
NOT for: feature fixtures, domain test data, or per‑test variations.\
Goal: make tests fast, deterministic, side‑effect free.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [When to Use vs Inline `vi.mock`](#when-to-use-vs-inline-vimock)
- [How Vitest Resolves These Mocks](#how-vitest-resolves-these-mocks)
- [Current Mocks](#current-mocks)
- [Adding a New Mock](#adding-a-new-mock)
- [Usage Examples](#usage-examples)
  - [a) Automatic mock (manual file + standard call)](#a-automatic-mock-manual-file--standard-call)
  - [b) Explicit inline override](#b-explicit-inline-override)
  - [c) Partial mock with real implementation](#c-partial-mock-with-real-implementation)
- [Best Practices](#best-practices)
- [Limitations / Anti-Patterns](#limitations--anti-patterns)
- [Troubleshooting](#troubleshooting)
- [Quick Reference](#quick-reference)
- [FAQ](#faq)

## When to Use vs Inline `vi.mock`

Use a file here when:

- Module is mocked in many tests.
- Real implementation is heavy (network/auth/DOM complexity).
- You need consistent, shared minimal API surface.

Use inline `vi.mock()` in a test when:

- One‑off override / shape experimentation.
- You need test‑specific behavior.
- You partially monkey‑patch only one export.

## How Vitest Resolves These Mocks

- `vi.mock('pkg')` first looks for `__mocks__/pkg.{js,jsx,ts,tsx}` and uses it if present.
- Scoped packages: place at `__mocks__/@scope/package.js`.
- Deep paths (e.g. `react-bootstrap/Popover`) replicate folder structure under `__mocks__`.
- ESM/CommonJS interop: keep export names & default parity (missing exports break imports).
- No implicit auto‑mocking without a `vi.mock()` call unless the test or setup explicitly invokes it.
- Path aliases aren’t used here—these mocks only mirror external package resolution.

## Current Mocks

| File                                 | Mocked module                    | Purpose                                                             |
| ------------------------------------ | -------------------------------- | ------------------------------------------------------------------- |
| `axios.js`                           | `axios`                          | Stub HTTP client (avoid real network; simple promise API).          |
| `react-autosuggest.jsx`              | `react-autosuggest`              | Lightweight deterministic input component.                          |
| `react-datepicker.jsx`               | `react-datepicker`               | Simplified date picker (plain input, controlled value).             |
| `@azure/msal-react.js`               | `@azure/msal-react`              | Stub MSAL provider/hooks; bypass real auth flows.                   |
| `@fortawesome/react-fontawesome.jsx` | `@fortawesome/react-fontawesome` | Replace icon rendering with inert span; avoid SVG + registry noise. |
| `@tanstack/react-query.js`           | `@tanstack/react-query`          | Minimal QueryClient + hooks; disable caching/network side effects.  |
| `react-bootstrap/OverlayTrigger.jsx` | `react-bootstrap/OverlayTrigger` | Pass‑through wrapper; strips timing/placement logic.                |
| `react-bootstrap/Popover.jsx`        | `react-bootstrap/Popover`        | Simple structural placeholder component.                            |

## Adding a New Mock

1. Identify external module causing flakiness / slowness / side effects.
2. Mirror its path under `__mocks__` (respect scopes & subpaths).
3. Export the same symbols (named + default) with minimal no‑op implementations.
4. Keep behavior tiny (return constants, resolved promises, simple elements).
5. Add a concise row to the table above.
6. Write/adjust a test asserting the mock shape (`vi.isMockFunction`, presence of exports).
7. Avoid embedding logic—tests can override per case with inline factories.

## Usage Examples

### a) Automatic mock (manual file + standard call)

```js
import axios from 'axios';

// The call to vi.mock is hoisted, so it doesn't matter where you call it.
// Place it in the proper `mock external dependencies` section within the test file
vi.mock('axios');

test('axios mock shape', () => {
  expect(axios.get).toBeTypeOf('function');
  expect(vi.isMockFunction(axios.get)).toBe(true);
});
```

### b) Explicit inline override

```js
import axios from 'axios';

vi.mock('axios', () => ({
  get: vi.fn().mockResolvedValue({ data: { override: true } }),
  post: vi.fn().mockRejectedValue(new Error('blocked')),
}));
```

### c) Partial mock with real implementation

```js
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  };
});
```

## Best Practices

- Keep mocks minimal and stable; fewer moving parts = fewer brittle tests.
- Mirror API surface precisely; missing exports create misleading failures.
- Avoid domain logic—tests can layer behavior via inline overrides.
- Prevent real network/auth/telemetry calls (security + speed).
- Ensure deterministic return values (no Date.now()/Math.random() unless controlled).

## Limitations / Anti-Patterns

- Not a dumping ground for bulk JSON/data fixtures.
- Don’t store per‑test mutable state here—use test-local factories.
- Avoid embedding timers, async loops, or internal caches.
- Don’t mix feature mocks (keep only external/vendor abstractions).

## Troubleshooting

| Issue                           | Check                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| Mock not picked up              | Call `vi.mock()` before first import; path exactness (scopes, casing).                  |
| Wrong exports                   | Ensure both `default` and named exports where original had them.                        |
| ESM vs CJS mismatch             | Use `export default` plus named; avoid `module.exports` in ESM tests.                   |
| State leakage                   | Use `afterEach(() => vi.clearAllMocks())`; use `resetModules` if module state persists. |
| `vi.clearAllMocks()` not enough | Use `vi.resetAllMocks()` to remove custom implementations.                              |

## Quick Reference

| Pattern                        | Purpose                           |
| ------------------------------ | --------------------------------- |
| `vi.mock('pkg')`               | Activate manual/mock factory.     |
| `vi.mock('pkg', factory)`      | Inline custom override.           |
| `await vi.importActual('pkg')` | Get real module for partial mock. |
| `vi.spyOn(obj, 'method')`      | Spy/override specific method.     |
| `vi.clearAllMocks()`           | Reset call history.               |
| `vi.resetAllMocks()`           | Reset implementations + history.  |
| `vi.restoreAllMocks()`         | Restore originals after spies.    |

## FAQ

Q: Why isn’t my mock used?\
A: `vi.mock()` must run before the first import of that module; ensure path matches exactly and no early side-effect import preloads it.

Q: How do I partially restore the real module?\
A: Use a factory with `vi.importActual()` and selectively override exports; or call `vi.unmock('module')` then re-import.

Q: How do I mock a dynamically imported module?\
A: Call `vi.mock('module')` (or define its factory) before invoking `await import('module')`.

Q: Can I change behavior for just one test?\
A: Use `vi.mock()` inside that test file with a custom factory or `vi.spyOn()` a specific export; don’t edit the shared mock.

Q: Why exclude these files from coverage?\
A: They are infrastructure scaffolding; excluding them keeps coverage focused on real application logic.

---

Keep mocks lean, explicit, and boring—the best mock is one you rarely need to read twice.
