# Store Module

This folder centralizes **application-wide global state** using [Zustand](https://github.com/pmndrs/zustand).
Use it **sparingly** for state that truly spans multiple, unrelated features (e.g., feature flags, environment metadata, user session–level UI preferences).
For anything feature-specific, create a colocated store in that feature's folder instead.

Currently the folder contains a single global store (`appStore`).
The structure is intentionally minimal and ready to expand.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Available Stores](#available-stores)
  - [`appStore`](#appstore)
    - [Shape (initial)](#shape-initial)
    - [Basic Usage – Reading State](#basic-usage--reading-state)
    - [Adding State + Action (Pattern)](#adding-state--action-pattern)
    - [Consuming + Updating](#consuming--updating)
    - [Testing Pattern](#testing-pattern)
    - [Notes](#notes)
- [Usage Guidelines](#usage-guidelines)
- [Importing](#importing)
- [Adding a New Store (If Needed Later)](#adding-a-new-store-if-needed-later)
- [Quick Reference](#quick-reference)
- [Future Enhancements (Optional)](#future-enhancements-optional)

## Available Stores

### `appStore`

Global root-level store for miscellaneous cross-cutting state.
Starts with an empty `initialState` and is wrapped with the Zustand `devtools` middleware so actions (once added) appear in Redux DevTools with a readable name.

Exports:

- `initialState` – Plain object defining the baseline global state.
- `useAppStore` – Zustand hook to read/derive/update global state.

#### Shape (initial)

```js
initialState = {
  // Add global properties here, e.g.:
  // theme: 'light',
  // isSidebarOpen: false,
};
```

#### Basic Usage – Reading State

```jsx
import { useAppStore } from 'store/appStore'; // or relative: import { useAppStore } from '../store/appStore';

function Header() {
  const theme = useAppStore((s) => s.theme); // undefined until you add it to initialState
  return <div data-theme={theme}>...</div>;
}
```

#### Adding State + Action (Pattern)

To add a new global value and mutator:

1. Add the property to `initialState`.
2. Add an action inside the store creator function.
3. Prefix the action name for DevTools clarity (REQUIRED – keeps Redux DevTools timelines readable and consistent with other stores).

```diff
// appStore.js
- const initialState = {
-   // someAppWideStateVar: null,
- };
+ const initialState = {
+   someAppWideStateVar: null,
+ };

const actionPrefix = 'app/';

const useAppStore = create()(devtools((set) => ({
  ...initialState,
  setSomeAppWideStateVar: (value) =>
    set({ someAppWideStateVar: value }, undefined, `${actionPrefix}setSomeAppWideStateVar`),
}), { name: devToolsStoreName }));
```

#### Consuming + Updating

```jsx
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from 'store/appStore';

function Demo() {
  // select both value + setter in one subscription; useShallow prevents re-render if neither changed
  const { someAppWideStateVar, setSomeAppWideStateVar } = useAppStore(
    useShallow((s) => ({
      someAppWideStateVar: s.someAppWideStateVar,
      setSomeAppWideStateVar: s.setSomeAppWideStateVar,
    }))
  );

  return <button onClick={() => setSomeAppWideStateVar('updated')}>Current: {String(someAppWideStateVar)}</button>;
}
```

#### Testing Pattern

Tests reset the store to a clean baseline using `setState` + the exported `initialState`:

```js
import { renderHook } from '@testing-library/react';
import { initialState, useAppStore } from 'store/appStore';

beforeEach(() => {
  useAppStore.setState({ ...initialState }, true); // second arg optionally triggers replace
});

it('has expected initial state', () => {
  const { result } = renderHook(() => useAppStore());
  expect(result.current).toEqual(expect.objectContaining(initialState));
});
```

#### Notes

- Keep global state **serializable** when possible (helps DevTools & future persistence).
- Avoid storing large collections or transient UI-only flags better handled locally.
- Prefer selectors `(state) => state.prop` or grouped selections wrapped with `useShallow` to minimize unnecessary re-renders.
- DevTools store name is derived from `constants.APP_ABBR` for consistent identification across environments.
- If you add many actions, consider defining an `actionPrefix` (already scaffolded & commented) for clearer DevTools grouping.

---

## Usage Guidelines

When deciding if something belongs here, ask:

- Is it referenced by 3+ unrelated features?
- Would duplicating it cause inconsistency or bugs?
- Is it not already derivable from existing state / URL / props?

If **no** to most questions, keep it local.

---

## Importing

Use the configured alias (`store`) for readability:

```js
import { useAppStore } from 'store/appStore';
```

Fallback relative example (if aliasing changes):

```js
import { useAppStore } from '../../store/appStore';
```

---

## Adding a New Store (If Needed Later)

If you outgrow a single global store, you can:

1. Create a new file (e.g., `featureFlagsStore.js`).
2. Follow the same pattern: define `initialState`, create the store with `create()` and optional `devtools`, export both.
3. Keep each store focused; avoid a "god store" anti-pattern.

---

## Quick Reference

| Action             | How                                             |
| ------------------ | ----------------------------------------------- |
| Read value         | `useAppStore((s) => s.prop)`                    |
| Update value       | Define setter via `set({ prop: value })` action |
| Reset in tests     | `useAppStore.setState({ ...initialState })`     |
| Add new global key | Extend `initialState`, add action (prefixed)    |

---

## Future Enhancements (Optional)

- Persist selected keys (e.g., theme) using `persist` middleware.
- Add structured action naming via a shared `actionPrefix`.
- Memoized derived selectors if complex calculations appear.

---

Feel free to iterate carefully—global state is powerful; use it judiciously.
