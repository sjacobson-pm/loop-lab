# Site Header Feature

The site header renders a persistent top bar containing:

- Brand/logo link to the root route (`/`)
- Current page title and optional subtitle (driven by a local Zustand store)
- A right‑aligned navigation area (currently: theme toggle button)

It centralizes page context (title/subtitle) and lightweight user utilities (theme toggle) so feature pages only set state rather than duplicating markup.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Public Surface](#public-surface)
  - [Store Shape (`useSiteHeaderStore`)](#store-shape-usesiteheaderstore)
- [Usage](#usage)
- [Examples](#examples)
  - [A. Dynamic Subtitle (e.g., detail page)](#a-dynamic-subtitle-eg-detail-page)
  - [B. Clearing Subtitle](#b-clearing-subtitle)
  - [C. Custom Utility Nav Item](#c-custom-utility-nav-item)
- [Behavior Notes](#behavior-notes)
- [Dependencies (Direct)](#dependencies-direct)
- [Extending](#extending)

## Public Surface

| Export               | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `SiteHeader`         | The header component (logo, titles, utilities nav).            |
| `usePageSetup`       | Convenience hook to set page title / subtitle + sidebar state. |
| `useSiteHeaderStore` | (Advanced) direct Zustand store access (titles + setters).     |
| `ThemeToggleNav`     | (Optional) nav item that toggles light/dark theme + telemetry. |

### Store Shape (`useSiteHeaderStore`)

State:

- `pageTitle: string` – defaults to app name
- `pageSubtitle: string`

Actions:

- `setPageTitle(title: string)`
- `setPageSubtitle(subtitle: string)`

## Usage

Place `SiteHeader` near the top of your layout so it persists across route changes.
For most pages, prefer the `usePageSetup` hook to declaratively set the title / subtitle (and optionally sidebar visibility) rather than calling the store directly.

```jsx
import { usePageSetup } from 'pages/hooks/usePageSetup';
import { SiteHeader } from 'features/ui/site-header/SiteHeader';

const DashboardPage = () => {
  usePageSetup({ title: 'Dashboard', subtitle: 'Overview' });
  return <div>Content...</div>;
};

const AppLayout = () => (
  <>
    <SiteHeader />
    <Outlet />
  </>
);
```

Update titles from any descendant by calling `usePageSetup` (idempotent; safe to call on every render).
If you only need to adjust the title you can omit `subtitle`:

```jsx
usePageSetup({ title: 'Reports' });
```

Need to also control the sidebar? Pass `showSideBar: true`:

```jsx
usePageSetup({ title: 'Reports', showSideBar: true });
```

Still need imperative control? You can fall back to the underlying store:

```jsx
import { useSiteHeaderStore } from 'features/ui/site-header/store/siteHeaderStore';
const { setPageTitle } = useSiteHeaderStore();
setPageTitle('Reports');
```

## Examples

### A. Dynamic Subtitle (e.g., detail page)

```jsx
const UserDetailPage = ({ user }) => {
  // Re-runs effect when displayName changes (hook depends on values passed in)
  usePageSetup({ title: 'User Profile', subtitle: user.displayName });
  return <section>...</section>;
};
```

### B. Clearing Subtitle

```jsx
usePageSetup({ title: 'User Profile', subtitle: '' });
```

### C. Custom Utility Nav Item

Add more items by editing `SiteHeader.jsx` inside the `<nav>` element:

```jsx
<nav className={`nav justify-content-end ${styles.nav}`}>
  <ThemeToggleNav />
  <button className={`btn btn-link ${styles.navLink}`} onClick={openHelp}>
    Help
  </button>
</nav>
```

## Behavior Notes

- Empty title/subtitle elements are not rendered (conditional spans).
- Logo uses a root‑relative image path and React Router `Link`.
- Theme toggle records telemetry via `useAppInsights.trackThemeToggleClicked(isDark)` then flips theme via `useTheme`.
- Store uses Zustand + devtools naming (`APP_ABBR | SiteHeaderStore`). `usePageSetup` is a thin convenience layer over this store (plus sidebar control) and should be preferred for page components.

## Dependencies (Direct)

- `react-router` – `Link`
- `zustand` (+ `devtools` middleware)
- `@fortawesome/react-fontawesome` – icon in theme toggle
- Theme hook: `useTheme` (local feature, supplies `isDarkTheme`, `toggleTheme`)
- App Insights hook: `useAppInsights` for telemetry
- CSS Modules: `SiteHeader.module.css`

## Extending

- Add additional nav utilities inside the existing `<nav>` region.
- Replace the logo by editing the `<img>` in `SiteHeader.jsx` (keep accessible `alt`).
- For broader page context (e.g., breadcrumbs), consider composing a breadcrumb component beside the titles container.

---

This README focuses solely on the site header feature. Project-wide setup lives in the root `README.md`.
