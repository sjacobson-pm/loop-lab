# Styles Directory

Centralized styling system for the application. This folder defines global styles, design tokens, Bootstrap customization, Tailwind integration, utility layers, and shared component/style primitives. Treat it as the single entry-point for app-wide styling concerns.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Goals](#goals)
- [File Overview](#file-overview)
- [Import \& Usage](#import--usage)
- [Layering Order (Simplified)](#layering-order-simplified)
- [Design Tokens](#design-tokens)
- [Bootstrap Customization](#bootstrap-customization)
- [Tailwind (`tw:` Prefix)](#tailwind-tw-prefix)
- [Utility \& Helper Classes](#utility--helper-classes)
- [Adding a New Global Layer](#adding-a-new-global-layer)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Extending](#extending)
- [Quick Reference](#quick-reference)

## Goals

- Consistent visual language (tokens + naming conventions)
- Predictable cascade & layering
- Minimal duplication (one global entry import)
- Flexible extension without breaking existing styles

---

## File Overview

| File                          | Purpose                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `_variables.scss`             | Core design tokens (colors, spacing, typography aliases). Source of truth.        |
| `_sass-variables.scss`        | Additional SASS-only computed variables / maps derived from core tokens.          |
| `_bs-sass-var-overrides.scss` | Bootstrap variable overrides (must load before Bootstrap).                        |
| `_bs-css-var-overrides.scss`  | Runtime CSS variable overrides layered after Bootstrap output.                    |
| `_customized-bootstrap.scss`  | Bootstrap import + any selective component inclusion or pruning.                  |
| `_react-bootstrap.scss`       | React-Bootstrap specific adjustments (structure / utility alignment).             |
| `_react-autosuggest.scss`     | Customizations for the react-autosuggest component (dropdown, theming, z-index).  |
| `_components.scss`            | Global component-level primitives (buttons, forms, layout helpers). Keep generic. |
| `_tanstack-query.scss`        | Styling & theming hooks for TanStack Query devtools / loaders.                    |
| `_bs-custom-classes.scss`     | Extra utility/semantic helper classes not provided by Bootstrap/Tailwind.         |
| `_base.scss`                  | Base resets, html/body defaults, typography base rules.                           |
| `tailwind.css`                | Tailwind layer directives + prefix (`tw:`) configuration hook.                    |
| `index.scss`                  | Single aggregated entry; imports all partials in the correct order.               |

Notes:

- Files beginning with `_` are partials—never imported directly by components.
- Add new global layers via a new partial + import inside `index.scss` only.

---

## Import & Usage

Global styles should be imported exactly once—typically in the app root (e.g. `main.jsx`):

```jsx
// main.jsx
import 'styles/index.scss';
```

Component‑scoped styles (if needed) should use CSS/SCSS Modules colocated with the component (e.g. `MyWidget.module.scss`). Avoid re‑importing global partials inside those modules.

Tailwind utilities use the `tw:` prefix to prevent collisions with Bootstrap classes:

```jsx
<div className="p-3 border rounded tw:flex tw:items-center tw:gap-4">...</div>
```

Combine carefully: let design tokens flow through SCSS for reusable abstractions; use Tailwind for quick layout/utility composition; use Bootstrap components when they reduce duplication.

---

## Layering Order (Simplified)

1. Tokens & computed maps (`_variables.scss`, `_sass-variables.scss`)
2. Bootstrap SASS variable overrides (`_bs-sass-var-overrides.scss`)
3. Bootstrap core / customized import (`_customized-bootstrap.scss`)
4. Post-bootstrap CSS var overrides (`_bs-css-var-overrides.scss`)
5. Framework integrations (`_react-bootstrap.scss`, `_tanstack-query.scss`, `_react-autosuggest.scss`)
6. Base + structural (`_base.scss`)
7. Component primitives (`_components.scss`)
8. Custom helpers/utilities (`_bs-custom-classes.scss`)
9. Tailwind layers (`tailwind.css`)

`index.scss` enforces this sequence—add new imports where they logically belong. Earlier layers define variables; later layers consume them.

---

## Design Tokens

Example token usage:

```scss
// _variables.scss
$color-primary: #0057b8;
$spacing-2: 0.5rem;

// _sass-variables.scss
$button-padding-y: $spacing-2;

// _components.scss
.btn-primary-custom {
  background: $color-primary;
  padding: $button-padding-y $spacing-2 * 2;
}
```

When you need a new token:

1. Add it to `_variables.scss` (keep naming consistent & generic)
2. Add computed derivatives (maps, scaling) in `_sass-variables.scss`
3. Reference only the token (not hard-coded hex/values) in other partials

Avoid redefining already existing tokens; expand thoughtfully.

---

## Bootstrap Customization

Change bootstrap SASS variables in `_bs-sass-var-overrides.scss` before the Bootstrap import.
Use CSS variable overrides for runtime theming or when you must alter a value after compilation.

Example:

```scss
// _bs-sass-var-overrides.scss
$btn-border-radius: 0.25rem;

// _bs-css-var-overrides.scss
:root {
  --bs-body-bg: #f8f9fb;
}
```

Keep overrides grouped & commented (e.g., // Buttons, // Forms, // Layout) for scanability.

---

## Tailwind (`tw:` Prefix)

Use Tailwind utilities for layout, spacing, flex/grid, and rapid prototyping. Prefer SCSS for:

- Complex stateful styles
- Themeable / token-driven patterns
- Reusable component abstractions

Example hybrid component:

```jsx
import styles from './Panel.module.scss';

export function Panel({ children }) {
  return <section className={`tw:rounded tw:p-4 tw:shadow-sm ${styles.panel}`}>{children}</section>;
}
```

```scss
// Panel.module.scss
.panel {
  background: $color-primary;
  color: #fff;
}
```

---

## Utility & Helper Classes

Add only when a semantic abstraction adds clarity vs. chaining many utilities.
Place them in `_bs-custom-classes.scss` or an appropriately named new partial if logically grouped (e.g., `_layout-helpers.scss`).

Naming guidelines:

- Prefer single-responsibility (`.u-inline-code`, `.u-sr-only`)
- Avoid duplication with existing Bootstrap or Tailwind utilities
- Document intent via a short comment above the class

---

## Adding a New Global Layer

1. Create `_your-layer-name.scss`
2. Place it in this directory (keep grouping logical)
3. Import it in `index.scss` at the correct cascade position
4. Write a brief header comment explaining purpose & scope

If the layer is experimental or feature-specific, consider collocating it with the feature instead of global scope.

---

## Examples

Global import (already done in root):

```jsx
import 'styles/index.scss';
```

Consume token inside SCSS Module:

```scss
// Tag.module.scss
@use '../styles/variables' as *; // If using the SASS module system (optional pattern)

.tag {
  background: $color-primary;
  padding: $spacing-2;
}
```

Responsive + utilities:

```jsx
<div className="md:tw:grid-cols-3 tw:grid tw:grid-cols-1 tw:gap-6">
  {items.map((i) => (
    <Card key={i.id} {...i} />
  ))}
</div>
```

---

## Best Practices

Do:

- Import only `index.scss` globally
- Keep tokens abstract (no brand-specific semantics like `$blue-xyz`—prefer `$color-primary`)
- Consolidate override rationale with comments (WHY not just WHAT)
- Prefer composition over specificity escalation (`.a .b .c` → avoid)
- Use Tailwind for quick layout; SCSS for reusable patterns

Avoid:

- Hard-coded colors / spacing in component styles
- Importing partials directly in components
- Creating utility classes that duplicate existing frameworks
- Deep selector chains or `!important` (fix source ordering instead)

Lint & formatting tools enforce conventions—run them before committing.

---

## Troubleshooting

| Issue                      | Check                                                                             |
| -------------------------- | --------------------------------------------------------------------------------- |
| Styles missing             | Ensure `index.scss` is imported once at app root                                  |
| Unexpected Bootstrap style | Confirm override is in the SASS (pre) layer, not after import                     |
| Token not applied          | Verify it was added to `_variables.scss` and not shadowed later                   |
| Class conflict             | Tailwind prefix `tw:` should prevent overlap—look for duplicated custom utilities |

---

## Extending

When introducing theming (e.g., dark mode):

1. Introduce CSS variable fallbacks in `_bs-css-var-overrides.scss`
2. Add a `[data-theme='dark'] { ... }` block overriding only the necessary variables
3. Keep component logic theme-agnostic (consume variables, not static values)

---

## Quick Reference

Single import: `import 'styles/index.scss';`  
Add token: `_variables.scss` → derive in `_sass-variables.scss`  
Change Bootstrap variable: `_bs-sass-var-overrides.scss`  
Add utility helper: `_bs-custom-classes.scss` (with comment)  
Use Tailwind: `tw:` prefix only

---

Questions or edge cases not covered here should be resolved by inspecting existing patterns before introducing new ones.
