# Pages (`src/pages`)

High‑level, routable screens of the application.
Each file (or folder + file) here represents a user‑navigable page mounted by React Router and rendered inside the global `AppLayout`.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [What belongs here](#what-belongs-here)
- [Current Contents](#current-contents)
- [Naming \& File Structure Conventions](#naming--file-structure-conventions)
- [Routing Pattern](#routing-pattern)
- [Page Bootstrapping with `usePageSetup`](#page-bootstrapping-with-usepagesetup)
- [Adding a New Page (Checklist)](#adding-a-new-page-checklist)
- [Example Minimal Page](#example-minimal-page)
- [Testing Guidance](#testing-guidance)
- [When to Create a Page vs. a Feature Component](#when-to-create-a-page-vs-a-feature-component)
- [Import Paths Recap](#import-paths-recap)
- [FAQ](#faq)

## What belongs here

Put only top‑level page components and (optionally) page‑scoped hooks that orchestrate:

- Page title / subtitle + layout chrome decisions
- Page‑level data fetching coordination
- High‑level compositional wiring of feature/UI components

Do **not** place low‑level reusable UI, feature logic, or cross‑cutting hooks here (those live under `features/`, `hooks/`, etc.).

## Current Contents

| Item                              | Type | Purpose                                                                |
| --------------------------------- | ---- | ---------------------------------------------------------------------- |
| `sample-home/SampleHome.jsx`      | Page | Example showcase of components (excluded from coverage intentionally). |
| `page-not-found/PageNotFound.jsx` | Page | Catch‑all 404 screen.                                                  |
| `hooks/usePageSetup.js`           | Hook | Standardizes page header + sidebar visibility setup.                   |

## Naming & File Structure Conventions

- Directory names: kebab‑case (e.g., `user-settings/`).
- Component file: PascalCase matching exported component (e.g., `UserSettings.jsx`).
- One page component per folder (keep related page‑specific assets beside it).
- Test file colocated: `ComponentName.test.jsx`.
- Avoid index/barrel files (keeps import paths explicit & lints happy).
- Import via Vite alias: `import { PageNotFound } from 'pages/page-not-found/PageNotFound';`

## Routing Pattern

Defined in `App.jsx` using React Router v7 nested routing:

```jsx
<Routes>
  <Route path="*" element={<AppLayout />}>
    {' '}
    {/* layout shell */}
    <Route path="" element={<SampleHome />} /> {/* root ("/") */}
    {/* additional page routes go here */}
    <Route path="*" element={<PageNotFound />} /> {/* final catch-all */}
  </Route>
</Routes>
```

Add new pages **above** the final wildcard `PageNotFound` route.
Prefer simple, semantic paths (e.g., `"user-settings"`, `"reports/:reportId"`).
Keep route decisions (feature flags, conditional inclusion) inside `App.jsx` so pages stay declarative and free of routing logic.

## Page Bootstrapping with `usePageSetup`

All pages should call `usePageSetup` immediately (top of the component body, before render) to ensure consistent layout behavior.

```jsx
import { usePageSetup } from 'pages/hooks/usePageSetup';

const UserSettings = () => {
  usePageSetup({
    title: 'User Settings', // defaults to app name if omitted
    subtitle: 'Manage profile', // defaults to ''
    showSideBar: true, // controls global sidebar visibility
  });

  return <div>...</div>;
};
```

Responsibilities handled by the hook:

- Sets page title & subtitle in the site header store.
- Shows or hides the global sidebar.
- Uses sensible defaults (`title` → app name, `subtitle` → empty string, sidebar hidden unless requested).

Do **not** replicate this logic manually inside pages; always delegate to the hook to keep behavior uniform.

## Adding a New Page (Checklist)

1. Create folder: `src/pages/user-settings/`.
2. Add component file: `UserSettings.jsx` (PascalCase export `UserSettings`).
3. At top of component: call `usePageSetup({...})`.
4. Compose feature + UI components (no direct store mutations outside approved hooks).
5. Add route in `App.jsx` before the catch‑all.
6. Write colocated test: `UserSettings.test.jsx` (mock `usePageSetup` if asserting call args; otherwise let it execute).
7. Ensure 100% coverage (unless explicitly documented as a sample/demo page — avoid this for real pages).

## Example Minimal Page

```jsx
// src/pages/user-settings/UserSettings.jsx
import { usePageSetup } from 'pages/hooks/usePageSetup';

const UserSettings = () => {
  usePageSetup({ title: 'User Settings', subtitle: 'Manage your profile', showSideBar: true });
  return (
    <section className="tw:container tw:mx-auto tw:p-8">
      <h1>User Settings</h1>
      <p>Update your preferences.</p>
    </section>
  );
};

export { UserSettings };
```

Add to `App.jsx`:

```jsx
<Route path="user-settings" element={<UserSettings />} />
```

Test skeleton (`UserSettings.test.jsx`):

```jsx
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePageSetup } from 'pages/hooks/usePageSetup';
import { UserSettings } from './UserSettings';

vi.mock('pages/hooks/usePageSetup');

describe('UserSettings', () => {
  it('calls usePageSetup with expected args', () => {
    render(<UserSettings />);
    expect(usePageSetup).toHaveBeenCalledWith({
      title: 'User Settings',
      subtitle: 'Manage your profile',
      showSideBar: true,
    });
  });
});
```

## Testing Guidance

- Mock `usePageSetup` when you only care that it was called with correct params.
- When verifying rendered title/subtitle behavior, prefer integration tests at components that surface those values (e.g., site header), not each page redundantly.
- Keep test bodies structured with the standard sections: `// * ARRANGE`, `// * ACT`, `// * ASSERT` to align with existing patterns.
- Avoid `/* v8 ignore */` pragmas on real pages—`SampleHome` is the lone intentional exception (demo only).

## When to Create a Page vs. a Feature Component

Create a page when:

- It has a distinct route / URL.
- It orchestrates multiple feature areas.
- It influences layout chrome (title, sidebar).

Create a feature or UI component instead when the artifact is embedded within another page or is reusable across pages.

## Import Paths Recap

Use aliased paths (avoid relative `../../`):

```js
import { PageNotFound } from 'pages/page-not-found/PageNotFound';
import { SampleHome } from 'pages/sample-home/SampleHome';
```

## FAQ

**Q: Where should I put a page‑specific helper hook?**\
Inside `src/pages/hooks/` if it is reusable across multiple pages. If it is tightly coupled to a single page, colocate it next to that page component instead.

**Q: Can pages manage their own document `<title>` tag?**\
No—set the logical page title via `usePageSetup`; any document title synchronization should occur centrally (the store / layout layer handles it).

**Q: How do I show the sidebar by default on a page?**\
Pass `showSideBar: true` to `usePageSetup`.

---

Concise scope: this README intentionally omits global project setup, dependency installation, and contribution guidelines—refer to the root `README.md` for those topics.
