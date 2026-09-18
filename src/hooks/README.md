# React Hooks (`src/hooks`)

This folder contains small, focused custom React hooks used across the application to encapsulate reusable logic (authentication context aggregation, UI behaviors, etc.).
Each hook is intentionally minimal, well‑tested, and safe to compose with others.
Add new hooks here when logic is: (a) needed in more than one component, (b) related to UI or data lifecycle, and (c) benefits from a declarative abstraction.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Available Hooks](#available-hooks)
  - [`useAuthenticatedUser`](#useauthenticateduser)
    - [Signature](#signature)
    - [Returns](#returns)
    - [Example – Basic Usage](#example--basic-usage)
    - [Example – Handling Roles (Extensible)](#example--handling-roles-extensible)
    - [Edge Cases \& Notes](#edge-cases--notes)
  - [`useInputFocus`](#useinputfocus)
    - [Signature](#signature-1)
    - [Parameters](#parameters)
    - [Behavior](#behavior)
    - [Example – Simple Input](#example--simple-input)
    - [Example – Conditional Mounting](#example--conditional-mounting)
    - [Edge Cases \& Notes](#edge-cases--notes-1)
- [Usage Patterns](#usage-patterns)
  - [Importing](#importing)
  - [Composing Hooks](#composing-hooks)
- [Testing Guidance](#testing-guidance)
- [Adding New Hooks](#adding-new-hooks)
- [FAQ](#faq)

## Available Hooks

### `useAuthenticatedUser`

Aggregates authenticated account information (from MSAL) with the current user's CDS staff record (fetched via TanStack Query) and returns a single object you can destructure inside components.

#### Signature

```js
const { currentUser, currentStaff } = useAuthenticatedUser();
```

#### Returns

| Property       | Type             | Description                                                                                                                           |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `currentUser`  | `object \| null` | Active MSAL account (or `null` / `undefined` early or after sign‑out). Typical shape: `{ tenantId, localAccountId, username, name }`. |
| `currentStaff` | `UseQueryResult` | TanStack Query result for the current staff member (`data`, `isLoading`, `isError`, `error`, `refetch`, etc.).                        |

> Caching: The underlying query (`useAuthenticatedStaffQuery`) uses a 60‑minute `staleTime` to reduce refetches.

#### Example – Basic Usage

```jsx
import { useAuthenticatedUser } from 'hooks/useAuthenticatedUser';

function WelcomeBanner() {
  const { currentUser, currentStaff } = useAuthenticatedUser();

  if (!currentUser) return null; // or a skeleton / sign-in prompt
  if (currentStaff.isLoading) return <p>Loading profile…</p>;
  if (currentStaff.isError) return <p>Unable to load staff record.</p>;

  const name = currentStaff.data?.preferredFullName || currentUser.name;
  return <h1 className="tw:text-xl">Welcome back, {name}</h1>;
}
```

#### Example – Handling Roles (Extensible)

The hook is structured to easily expose role flags later:

```js
// Inside useAuthenticatedUser (future enhancement):
// const userRoles = getUserRoles();
// return { currentUser, currentStaff, isAppAdmin: userRoles.isAppAdmin };
```

#### Edge Cases & Notes

- `currentUser` may be `null` very early in the app lifecycle or after logout.
- `currentStaff.data` may be `undefined` while loading or if the backend returns no record.
- Because the query result object is stable, prefer selecting derived values inside components (avoid unnecessary re-renders by not spreading the whole object into dependency arrays).
- For testing components that use this hook, mock it via `src/hooks/__mocks__/useAuthenticatedUser.js` (Vitest auto-mock pattern) and adjust returned shape using the exposed helper methods.

---

### `useInputFocus`

Automatically focuses a referenced input (or any focusable element) on the initial render.

#### Signature

```js
useInputFocus(inputRef);
```

#### Parameters

| Name       | Type                           | Required | Description                                         |
| ---------- | ------------------------------ | -------- | --------------------------------------------------- |
| `inputRef` | `React.RefObject<HTMLElement>` | Yes      | Ref whose `.current` points to a focusable element. |

#### Behavior

- Runs a `useEffect` exactly once (on mount) to call `.focus()` if `inputRef.current` exists.
- No value is returned.

#### Example – Simple Input

```jsx
import { useRef } from 'react';
import { useInputFocus } from 'hooks/useInputFocus';

function QuickSearch() {
  const searchRef = useRef(null);
  useInputFocus(searchRef);

  return <input ref={searchRef} type="text" placeholder="Search…" className="tw:rounded tw:border tw:p-2" />;
}
```

#### Example – Conditional Mounting

If the ref is `null` initially (e.g., conditional render), the effect safely no‑ops:

```jsx
function MaybeField({ show }) {
  const ref = useRef(null);
  useInputFocus(ref); // Safe even if ref.current is null at first
  return show ? <input ref={ref} /> : null;
}
```

#### Edge Cases & Notes

- Does nothing if `inputRef.current` is falsy.
- Will not refocus after rerenders (idempotent by design). If you need refocus on condition change, implement a separate effect keyed to that condition.
- Avoid using on components that manage their own focus lifecycle (e.g., complex modal libraries) to prevent focus jank.

---

## Usage Patterns

### Importing

Use path aliases for clarity:

```js
import { useAuthenticatedUser } from 'hooks/useAuthenticatedUser';
import { useInputFocus } from 'hooks/useInputFocus';
```

Relative imports are also valid when co-located:

```js
import { useInputFocus } from '../hooks/useInputFocus';
```

### Composing Hooks

```jsx
function StaffSearchPanel() {
  const { currentUser, currentStaff } = useAuthenticatedUser();
  const inputRef = useRef(null);
  useInputFocus(inputRef);

  if (!currentUser || currentStaff.isLoading) return <p>Loading…</p>;

  return (
    <section>
      <h2>Hi {currentStaff.data?.preferredFirstName || currentUser.name}</h2>
      <input ref={inputRef} placeholder="Search staff" />
    </section>
  );
}
```

---

## Testing Guidance

- Each hook has a dedicated test file with 100% coverage using `@testing-library/react`'s `renderHook` API.
- When a component depends on `useAuthenticatedUser`, mock it:

```js
vi.mock('hooks/useAuthenticatedUser');
import { useAuthenticatedUser } from 'hooks/useAuthenticatedUser';
useAuthenticatedUser.mockReturnValue({
  currentUser: { name: 'Dev' },
  currentStaff: { data: { preferredFullName: 'Dev Example' }, isLoading: false },
});
```

- For `useInputFocus`, assert `focus` calls using a ref stub (`{ current: { focus: vi.fn() } }`).

---

## Adding New Hooks

Follow existing patterns:

1. Keep scope tight; one responsibility.
2. Export via named export: `export { useMyHook };`.
3. Add a colocated `*.test.js[x]` with clear ARRANGE / ACT / ASSERT sections.
4. Provide a mock if widely reused in testing.
5. Update this README with: description, signature, return contract, example(s), and edge cases.

---

## FAQ

**Why does `useAuthenticatedUser` return the full query object instead of just `data`?**\
Consumers often need `isLoading`, `isError`, or `refetch`; exposing the full object preserves flexibility.

**Can I destructure deeply?**\
Yes, but prefer narrowing inside render scope to avoid unnecessary hook consumers re-rendering when unrelated query metadata changes.

**What if I need to refocus an input later?**\
Write a small effect keyed on your trigger: `useEffect(() => ref.current?.focus(), [shouldRefocus]);` rather than expanding `useInputFocus`.

---

Maintained by the application development team.
Keep examples minimal, accurate, and production‑aligned.
