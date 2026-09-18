# Error Fallback

The `ErrorFallback` component provides a consistent, user‑friendly UI when an uncaught runtime error is trapped by a React error boundary.
It is used as the `FallbackComponent` for `react-error-boundary` at the root of the application (`main.jsx`).
Besides informing the user something went wrong, it:

- Adapts its logo to the active theme (dark vs light) via `useTheme()`.
- Shows a contextual error message (only if the supplied `error` prop is an actual `Error` instance—non‑Error values are ignored to avoid leaking unintended data).
- Provides a "Retry" button that invokes the `resetErrorBoundary` callback supplied by `react-error-boundary`, allowing the boundary to attempt a re‑render.
- Uses a Font Awesome expressive icon and a Bootstrap `Alert` for visual clarity.

This keeps error presentation centralized and branded while enabling telemetry (the boundary's `onError` callback elsewhere reports to App Insights).

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
  - [Props (injected by `react-error-boundary`)](#props-injected-by-react-error-boundary)
- [Examples](#examples)
  - [1. Scoped Boundary Around a Risky Widget](#1-scoped-boundary-around-a-risky-widget)
  - [2. Programmatic Reset Trigger (e.g., after clearing state)](#2-programmatic-reset-trigger-eg-after-clearing-state)
- [Dependencies](#dependencies)
- [Notes](#notes)

## Usage

Wrap application (or a feature subtree) with `ErrorBoundary` from `react-error-boundary` and reference `ErrorFallback` as the `FallbackComponent`.

```jsx
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from 'features/ui/error-fallback/ErrorFallback';

function Root() {
  const handleError = (error, info) => {
    // (Optional) send to telemetry
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      <App />
    </ErrorBoundary>
  );
}
```

### Props (injected by `react-error-boundary`)

- `error: unknown` – Whatever was thrown. Displayed only if `instanceof Error`.
- `resetErrorBoundary: () => void` – Call to reset internal boundary state and retry rendering.

You normally do not pass these manually—`react-error-boundary` wires them when `ErrorFallback` is used as a `FallbackComponent`.

## Examples

### 1. Scoped Boundary Around a Risky Widget

```jsx
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from 'features/ui/error-fallback/ErrorFallback';
import { RiskyChart } from './RiskyChart';

export function DashboardSection() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RiskyChart />
    </ErrorBoundary>
  );
}
```

If `RiskyChart` throws, users see the fallback with a retry option—other parts of the page stay functional.

### 2. Programmatic Reset Trigger (e.g., after clearing state)

```jsx
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from 'features/ui/error-fallback/ErrorFallback';
import { SearchPanel } from './SearchPanel';

export function SearchModule() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        /* clear local caches / query state */
      }}
      resetKeys={
        [
          /* values that when changed auto-reset boundary */
        ]
      }>
      <SearchPanel />
    </ErrorBoundary>
  );
}
```

Using `resetKeys` or invoking `resetErrorBoundary()` (wired to the Retry button) will attempt a clean re-render of the faulting subtree.

## Dependencies

Direct runtime dependencies used by this component:

- `react-error-boundary` (via props contract; boundary owned by parent)
- `react-bootstrap` (`Alert` presentation)
- `@fortawesome/react-fontawesome` (icon rendering) and configured icons from `fontAwesomeConfig`
- Local theming hook: `useTheme()` (to select appropriate branded logo asset)

## Notes

- Avoid passing sensitive error details—only the `error.message` is rendered and only for real `Error` objects.
- Telemetry is handled outside the component (see boundary `onError` handler in `main.jsx`).
- Customize styling (spacing, icon, colors) by editing `ErrorFallback.jsx`; keep semantic structure for accessibility.
