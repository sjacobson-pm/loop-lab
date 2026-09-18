# Testing Utilities (`src/__testing__`) 🧪

Central, shared helpers for unit/integration tests:

- `TestRouter.jsx`: Lightweight wrapper to supply an isolated in‑memory React Router context.
- `fakes/`: Deterministic object + data builders so tests stay focused, readable, and DRY.

Use these utilities when the same pattern appears in ≥3 tests. Keep one‑off helpers colocated with the test file.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [`TestRouter` Component](#testrouter-component)
  - [What It Solves](#what-it-solves)
  - [Import Paths](#import-paths)
  - [Props](#props)
  - [Usage Examples](#usage-examples)
    - [a. Simple Wrap](#a-simple-wrap)
    - [b. Multiple Route History Entries](#b-multiple-route-history-entries)
    - [c. Inline with `render`](#c-inline-with-render)
- [`fakes/` Directory](#fakes-directory)
  - [Purpose](#purpose)
  - [Naming Conventions](#naming-conventions)
  - [Determinism](#determinism)
  - [Pattern (Factory + Overrides)](#pattern-factory--overrides)
  - [Usage](#usage)
- [Conventions \& Best Practices](#conventions--best-practices)
- [Extending / Adding](#extending--adding)
- [Quick Reference](#quick-reference)
- [Example End-to-End Snippet](#example-end-to-end-snippet)
- [Notes / Caveats](#notes--caveats)

## `TestRouter` Component

### What It Solves

Provides a minimal, dependency‑free way to render components that expect React Router context (e.g., hooks like `useLocation`, components using `<Link/>`) **without** coupling to the app's real route configuration.

### Import Paths

```js
import { TestRouter } from '../__testing__/TestRouter'; // relative
import { TestRouter } from 'testing/TestRouter'; // via alias (preferred)
```

### Props

| Prop             | Type        | Default    | Description                                                     |
| ---------------- | ----------- | ---------- | --------------------------------------------------------------- |
| `initialEntries` | `string[]`  | `['/']`    | Ordered history stack of path strings passed to `MemoryRouter`. |
| `children`       | `ReactNode` | (required) | Nodes rendered within the router context.                       |

> [!NOTE]
> The implementation simply forwards `initialEntries` to `MemoryRouter`.
> Omitting it lets React Router fall back to its default of `['/']`; explicitly passing it keeps intent clear.

### Usage Examples

#### a. Simple Wrap

```jsx
import { render } from '@testing-library/react';
import { TestRouter } from 'testing/TestRouter';
import { MyNav } from 'features/ui/MyNav';

render(
  <TestRouter>
    <MyNav />
  </TestRouter>
);
```

#### b. Multiple Route History Entries

```jsx
render(
  <TestRouter initialEntries={['/start', '/next']}>
    {/* history[0] -> '/start', current -> '/next' */}
    <MyNav />
  </TestRouter>
);
```

#### c. Inline with `render`

```jsx
render(<TestRouter initialEntries={['/settings']}>{/* component tree */}</TestRouter>);
```

> [!TIP]
> If you need to assert navigation, push multiple `initialEntries` and then inspect `screen` queries after user events.

## `fakes/` Directory

### Purpose

Canonical location for deterministic builders ("fakes") that return plain data objects used in tests. These:

- Avoid repetitive inline literals
- Provide stable defaults (no hidden randomness)
- Allow focused override of just the fields under test

### Naming Conventions

- Factory: `fake<User|Thing>()` (returns a simple object)
- Keep names concrete and domain‑specific: `fakeAuthToken`, `fakeAccountSummary`, `fakeResponse`.
- Optional variants may suffix intent: `fakeUserAdmin`, `fakeUserInactive` (only if meaningfully different & reused ≥3 times).

### Determinism

We use `@faker-js/faker` for realism and concise factory code. Guidelines:

1. Randomness is fine when the exact value is not asserted (e.g., you only assert presence, type, or derived formatting).
2. When a test depends on a specific value, pass an explicit override in the factory call.
3. If multiple related objects must correlate (e.g., `user.id` referenced elsewhere), capture the generated value once and reuse it.
4. If you need reproducible sequences, you may seed faker inside an individual test (e.g., `faker.seed(12345)`), but avoid global seeding that can create hidden coupling across tests.
5. Do not assert against inherently variable fields (like a random UUID) unless you first stabilize them via override.

> [!TIP]
> Prefer overrides for stability rather than snapshotting whole random objects. Keep assertions focused on behavior, not incidental random values.

### Pattern (Factory + Overrides)

```js
// fakes/user.js
import { faker } from '@faker-js/faker';

export const fakeUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  displayName: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  roles: ['standard'],
  isActive: true,
  // add other domain fields here as needed
  ...overrides,
});
```

### Usage

```js
import { fakeUser } from 'testing/fakes/user';

// Generate a random user but force a stable role & email we assert on
const admin = fakeUser({ roles: ['admin'], email: 'admin@example.com' });

expect(admin.roles).toContain('admin');
expect(admin.email).toBe('admin@example.com'); // deterministic via override
```

> [!TIP]
> Avoid deep cloning libraries—return fresh shallow objects.
> If nesting grows complex, consider a second factory for the nested structure.

## Conventions & Best Practices

- Test file names: `*.test.js|*.test.jsx`
- Use AAA comments: `// * ARRANGE`, `// * ACT`, `// * ASSERT`
- Keep helpers pure (no implicit mutation / timers / network)
- Prefer semantic queries (`getByRole`, `getByText`, `getByLabelText`) over DOM traversal
- Promote inline helper → `__testing__` only after 3+ distinct usages
- Keep factories minimal: no class instances, no side effects, no hidden global state

## Extending / Adding

Add a new fake when:

- A literal object shape repeats (≥3 times)
- Multiple tests benefit from consistent defaults
- You need a clear surface for override semantics

Structure new helpers:

1. One file per factory (or cohesive group)
2. Export a single named function
3. Deterministic defaults
4. Shallow override merge via spread (`...overrides` last)
5. JSDoc docstring (purpose + key fields)

Lightweight checklist:

- [ ] Descriptive name
- [ ] Deterministic defaults
- [ ] Override parameter documented
- [ ] No unused fields
- [ ] Test covers at least one override scenario (in its consumer test)

## Quick Reference

| Utility              | What It Does                                         | Example Import                                       | Primary Use Case                         |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `TestRouter`         | Wraps children with isolated `MemoryRouter` context  | `import { TestRouter } from 'testing/TestRouter';`   | Route-aware component & hook tests       |
| `fakeUser` (example) | Returns baseline user object with overridable fields | `import { fakeUser } from 'testing/fakes/fakeUser';` | Consistent user entity in multiple tests |

## Example End-to-End Snippet

Combines `TestRouter`, a fake, and an assertion.

```jsx
import { render, screen } from '@testing-library/react';
import { TestRouter } from 'testing/TestRouter';
import { fakeUser } from 'testing/fakes/fakeUser';
import { UserBadge } from 'features/ui/UserBadge';

// * ARRANGE
const user = fakeUser({ displayName: 'Ada Lovelace' });

render(
  <TestRouter initialEntries={['/profile']}>
    <UserBadge user={user} />
  </TestRouter>
);

// * ASSERT
expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
```

## Notes / Caveats

- Intentionally omits repo‑wide setup, build, and script instructions (see root `README.md`).
- `TestRouter` usage here avoids coupling tests to the app's production routing tree.
- Keep helpers lean—optimize for clarity & stability, not abstraction.
- Revisit and prune unused fakes periodically to reduce cognitive overhead.
