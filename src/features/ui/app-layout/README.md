# App Layout

`AppLayout` defines the top‑level visual shell of the application: a fixed header, a persistent sidebar, and a scrollable main content region.
It centralizes structural markup so feature routes only implement their own page content.
Child route elements are rendered via React Router's `<Outlet />` inside the main scroll container.
Styling uses Tailwind (prefixed `tw:`) flex utilities to achieve a full‑height column layout with horizontal subdivision for sidebar + content.

Key characteristics:

- Header and sidebar are isolated in `SiteHeader` and `SideBar` components
- Main content area scrolls independently (`overflow-auto`), header & sidebar remain fixed in place
- Pure layout component: no props, state, effects, or business logic
- Acts as the parent element for nested routes (routing boundary)

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
- [Examples](#examples)
- [Dependencies](#dependencies)

## Usage

Import and assign `AppLayout` as the element for a parent `<Route>`; declare child routes beneath it.
All child routes render inside the layout's main content panel.

```jsx
// Example routing integration (simplified)
import { BrowserRouter, Routes, Route } from 'react-router';
import { AppLayout } from 'features/ui/app-layout/AppLayout';
import { HomePage } from 'pages/sample-home/HomePage';
import { ReportsPage } from 'pages/reports/ReportsPage';
import { PageNotFound } from 'pages/page-not-found/PageNotFound';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {' '}
          {/* layout wrapper */}
          <Route index element={<HomePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

Notes:

- Add, remove, or reorder pages only in your route config; `AppLayout` needs no changes.
- To modify header or sidebar content, edit `SiteHeader` or `SideBar` (same `ui` feature folder hierarchy).
- If future requirements need per‑page layout variants, consider introducing props (e.g., `showSidebar`) or composing a higher‑order wrapper—but the current implementation intentionally stays minimal.

## Examples

**A. Minimal content page** (automatically placed inside the scrollable region):

```jsx
// src/pages/reports/ReportsPage.jsx
export const ReportsPage = () => {
  return (
    <section className="tw:p-6">
      <h1 className="tw:mb-4 tw:text-xl tw:font-semibold">Reports</h1>
      <p>All analytics and generated reports live here.</p>
    </section>
  );
};
```

**B. Adding a sticky sub-header inside page content** (layout stays unchanged):

```jsx
export const DashboardPage = () => (
  <div className="tw:flex tw:h-full tw:flex-col">
    <div className="tw:sticky tw:top-0 tw:z-10 tw:border-b tw:bg-white tw:p-4">
      <h2 className="tw:text-lg tw:font-medium">Dashboard Overview</h2>
    </div>
    <div className="tw:flex-grow tw:overflow-auto tw:p-4">{/* Scrollable dashboard widgets */}</div>
  </div>
);
```

## Dependencies

- **React Router**: Uses `<Outlet />` for nested route rendering (ensure `react-router` v7 as configured project-wide).
- **Internal UI Components**: `SideBar`, `SiteHeader` (sibling feature directories under `ui`).
- **Tailwind CSS**: Layout + spacing via prefixed `tw:` utility classes.

No external runtime props or configuration—`AppLayout` is a stable structural wrapper.
