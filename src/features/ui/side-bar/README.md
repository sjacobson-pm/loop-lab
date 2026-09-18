# Side Bar Feature

The side bar provides a collapsible vertical navigation / utility rail. It supports:

- Global show / hide (feature-level visibility)
- Collapse / expand (icon‑only vs. icon + label)
- Routed links (via `LinkMenuItem` / React Router `NavLink`)
- Non‑routing action items (via `MenuItem`)
- Telemetry on expand / collapse (App Insights)
- Optional icon counters (for action items)

When collapsed, only icons render.
When expanded, labels appear next to icons.
A built‑in expander item sits at the bottom.
The component returns `null` (renders nothing) when hidden.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Public Surface](#public-surface)
  - [Store Shape (`useSideBarStore`)](#store-shape-usesidebarstore)
- [Usage](#usage)
- [Adding Menu Items](#adding-menu-items)
  - [Counters](#counters)
- [Example: Custom Action Item + Telemetry Toggle](#example-custom-action-item--telemetry-toggle)
- [Behavior Notes](#behavior-notes)
- [Telemetry](#telemetry)
- [Dependencies (Direct)](#dependencies-direct)
- [Extending](#extending)

## Public Surface

Most consumers only need these exports:

| Export            | Purpose                                                                               |
| ----------------- | ------------------------------------------------------------------------------------- |
| `SideBar`         | Container `<nav>`; place menu items in its JSX children area (see file for comments). |
| `LinkMenuItem`    | Navigation entry (React Router aware). Prevents reload when already active.           |
| `MenuItem`        | Generic clickable (non‑routing) item or layout filler. Supports `counter`.            |
| `useSideBarStore` | Zustand store to control visibility & expanded state.                                 |

Internal (do not import directly): `ExpanderMenuItem`, `MenuItemContents`, `MenuItemIcon`, `MenuItemLabel`.

### Store Shape (`useSideBarStore`)

State:

- `isVisible: boolean`
- `isExpanded: boolean`

Actions:

- `show()` – set `isVisible` true
- `hide()` – set `isVisible` false
- `toggle()` – invert `isExpanded`

## Usage

Add the side bar to a layout shell.
Import via the path alias:

```jsx
import { SideBar } from 'features/ui/side-bar/SideBar';
import { LinkMenuItem } from 'features/ui/side-bar/menu-items/LinkMenuItem';
import { useSideBarStore } from 'features/ui/side-bar/store/sideBarStore';
import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

const Layout = ({ children }) => {
  const { classicSolidIcons } = fontAwesomeConfig;
  const { show, hide, isVisible } = useSideBarStore();

  // example: ensure visible on mount (optional)
  // useEffect(() => show(), [show]);

  return (
    <div className="app-shell">
      <SideBar>{/* Add top section items above the filler comment inside SideBar.jsx if modifying core. */}</SideBar>
      <main>{children}</main>
    </div>
  );
};
```

To control visibility elsewhere:

```jsx
const { hide, show, isVisible } = useSideBarStore();
```

## Adding Menu Items

Edit `SideBar.jsx` and place items where indicated by comments.

```jsx
import { LinkMenuItem } from './menu-items/LinkMenuItem';
import { MenuItem } from './menu-items/MenuItem';
import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
// ...inside <nav> before the filler:
<LinkMenuItem
  to="/dashboard"
  label="Dashboard"
  useLabelAsTitle
  icon={classicSolidIcons.faGauge}
/>
// After filler (bottom cluster) you could add a settings link:
<LinkMenuItem
  to="/settings"
  label="Settings"
  useLabelAsTitle
  icon={classicSolidIcons.faSliders}
/>
```

### Counters

Counters (badge in icon layer) are supported on `MenuItem` via the `counter` prop:

```jsx
<MenuItem icon={classicSolidIcons.faBell} label="Alerts" useLabelAsTitle counter={5} onClick={openAlerts} />
```

(`LinkMenuItem` does not currently accept `counter`; wrap or extend if needed.)

## Example: Custom Action Item + Telemetry Toggle

```jsx
import { MenuItem } from 'features/ui/side-bar/menu-items/MenuItem';
import { useSideBarStore } from 'features/ui/side-bar/store/sideBarStore';
import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

const SideBarCustomItems = () => {
  const { classicSolidIcons } = fontAwesomeConfig;
  const { isExpanded } = useSideBarStore();

  const handleHelp = () => {
    // open help modal
  };

  return (
    <>
      <MenuItem
        icon={classicSolidIcons.faCircleQuestion}
        label="Help"
        useLabelAsTitle
        onClick={handleHelp}
        isActive={false}
      />
      {/* The built-in ExpanderMenuItem remains at the bottom; no extra code needed here */}
    </>
  );
};
```

## Behavior Notes

- Visibility: If `isVisible` is `false`, nothing renders (layout should not rely on its width).
- Collapse: Labels hide; icons stay centered. Toggle via built‑in expander (`ExpanderMenuItem`).
- Active Styling: `LinkMenuItem` gets `active` class from React Router; `MenuItem` can simulate active state via `isActive` prop.
- Invalid Styling: Apply `isInvalid` on `MenuItem` to append an invalid class (CSS module controlled).
- Accessibility: `MenuItem` renders `role="button"` and uses `title` for tooltip/label; `LinkMenuItem` relies on `<a>` semantics.

## Telemetry

`ExpanderMenuItem` invokes `appInsights.trackSideBarExpanderClicked(isExpandedBeforeClick)` via `useAppInsights`.
If extending telemetry, follow the same pattern inside custom items.

## Dependencies (Direct)

- `react`, `react-router` (`NavLink`) – navigation
- `zustand` (+ devtools middleware) – local state store
- `@fortawesome/react-fontawesome` – icon rendering
- App Insights hook (`useAppInsights`) – telemetry integration
- CSS Modules – scoped styling via `SideBar.module.css`

## Extending

Lightweight customization usually only needs to add or reorder items.
For structural or visual changes prefer editing `SideBar.module.css` and the internal components, keeping public prop contracts stable.
If you add counter support to `LinkMenuItem`, mirror the `counter` prop flow used in `MenuItem` → `MenuItemContents` → `MenuItemIcon`.

---

Focused scope: this README intentionally omits project-wide setup and conventions (see root `README.md` for those).
