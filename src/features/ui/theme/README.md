# Theme Feature

Lightweight, app‑wide color theme management (currently Light & Dark) providing:

- A `<ThemeProvider>` that initializes the active theme on first render
- A persistent store (Zustand) tracking the current theme and dark-mode flag
- A `useTheme()` hook exposing a simple toggle API
- Helpers for applying Bootstrap theming and persisting selection

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Public API](#public-api)
- [Usage](#usage)
- [Examples](#examples)
  - [A. Combined Toggle + Status](#a-combined-toggle--status)
  - [B. Theme Selector (scales if more themes added)](#b-theme-selector-scales-if-more-themes-added)
- [Adding a New Theme](#adding-a-new-theme)
- [Persistence](#persistence)
- [Dependencies](#dependencies)
- [Notes / Edge Cases](#notes--edge-cases)

Themes are applied by setting the `data-bs-theme` attribute on the root `<html>` element (Bootstrap 5 mechanism). The user’s last selection (key: `selected-theme-name`) is restored on load. Defaults to Light when absent (future enhancement: system preference).

## Public API

- `ThemeProvider` – Wrap application (initializes theme once)
- `useTheme()` – Returns `{ isDarkTheme, toggleTheme }`
- `THEMES` – Map containing immutable theme objects `{ name, label, icon }`
- (Advanced) `useThemeStore` – Direct Zustand access

Lower-level helpers (`applyBootstrapTheme`, `getPreferredTheme`, `setStoredThemeName`) are typically handled internally.

## Usage

Wrap your app (or a root layout) once:

```jsx
// e.g. src/main.jsx or a top-level layout
import { ThemeProvider } from 'features/ui/theme/ThemeProvider';
import App from './App.jsx';

export function Root() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}
```

Toggle inside any component:

```jsx
import { useTheme } from 'features/ui/theme/useTheme';
import { THEMES } from 'features/ui/theme/themes';

function ThemeToggleButton() {
  const { isDarkTheme, toggleTheme } = useTheme();
  const nextLabel = isDarkTheme ? THEMES.light.label : THEMES.dark.label;
  return (
    <button type="button" onClick={toggleTheme} aria-label="Toggle color theme">
      Switch to {nextLabel}
    </button>
  );
}
```

Direct store access (advanced):

```jsx
import { useThemeStore } from 'features/ui/theme/store/themeStore';

function StatusBadge() {
  const { theme } = useThemeStore();
  return <span>Active theme: {theme.label}</span>;
}
```

## Examples

### A. Combined Toggle + Status

```jsx
import { useTheme } from 'features/ui/theme/useTheme';
import { THEMES } from 'features/ui/theme/themes';

export function ThemePanel() {
  const { isDarkTheme, toggleTheme } = useTheme();
  const active = isDarkTheme ? THEMES.dark : THEMES.light;
  return (
    <div>
      <p>Current: {active.label}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### B. Theme Selector (scales if more themes added)

```jsx
import { THEMES, applyBootstrapTheme, setStoredThemeName } from 'features/ui/theme/themes';
import { useThemeStore } from 'features/ui/theme/store/themeStore';

export function ThemeSelect() {
  const { theme, setTheme } = useThemeStore();
  const all = Object.values(THEMES);

  function handleChange(e) {
    const selected = THEMES[e.target.value];
    setTheme(selected);
    applyBootstrapTheme(selected);
    setStoredThemeName(selected);
  }

  return (
    <select value={theme.name} onChange={handleChange}>
      {all.map((t) => (
        <option key={t.name} value={t.name}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
```

## Adding a New Theme

1. In `themes.js` add an immutable object, e.g.:  
   `const highContrast = Object.freeze({ name: 'high-contrast', label: 'High Contrast', icon: classicSolidIcons.faEye });`
2. Add it to `THEMES` (extend the object literal).
3. Update any UI selectors (toggle logic still works if binary; adjust if >2 themes).

## Persistence

- Key: `selected-theme-name`
- Read on mount by `ThemeProvider` (`getPreferredTheme`)
- Updated via `toggleTheme()` or manual selection (`setStoredThemeName`)

## Dependencies

- React
- Zustand + devtools middleware
- Bootstrap 5 (consumes `data-bs-theme`)
- Font Awesome config for theme icons

## Notes / Edge Cases

- SSR: direct `document` / `localStorage` access—add guards if SSR introduced
- Call `applyBootstrapTheme` when changing themes manually outside provided helpers
- Theme objects are frozen to prevent accidental mutation

---

Primary entry points: `<ThemeProvider>` + `useTheme()`.
