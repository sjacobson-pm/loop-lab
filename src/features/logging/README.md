# Logging & Telemetry (Application Insights)

This feature module centralizes client-side telemetry for the application using **Azure Application Insights**.
It provides:

- A thin initialization layer (`telemetryService`) with a React plugin + route tracking
- A provider component that defers rendering until telemetry is ready
- A hook (`useAppInsights`) exposing opinionated event helpers
- A utility to consistently track errors (`trackErrorWithAppInsights`)

Telemetry is opt-in at runtime: when the configured connection string is the literal value `LOCAL`, events are written only to the console (not sent to Azure) to aid local development without polluting real telemetry.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [`telemetryService`](#telemetryservice)
  - [Initialization](#initialization)
  - [Error Tracking](#error-tracking)
  - [Direct Access](#direct-access)
- [`TelemetryProvider`](#telemetryprovider)
  - [Usage](#usage)
- [`useAppInsights` Hook](#useappinsights-hook)
  - [Example](#example)
  - [Adding New Event Helpers](#adding-new-event-helpers)
- [Naming Conventions](#naming-conventions)
- [Extending Telemetry](#extending-telemetry)
- [Usage Summary](#usage-summary)
- [Adding New Logging Features](#adding-new-logging-features)
- [Troubleshooting](#troubleshooting)
- [Security \& Privacy](#security--privacy)
- [Quick Reference](#quick-reference)

## `telemetryService`

Source: `appInsights/telemetryService.js`

Exports:

- `telemetryService` – singleton with `{ reactPlugin, appInsights, initialize(connectionString) }`
- `trackErrorWithAppInsights(error, customProperties?)`
- `getAppInsights()` – accessor returning the underlying Application Insights instance (after init)

### Initialization

```js
import { telemetryService } from 'features/logging/appInsights/telemetryService';

telemetryService.initialize(appInsightsConnectionString);
```

Behavior:

- Throws if `connectionString` is falsy.
- If `connectionString === 'LOCAL'`:
  - Substitutes a dummy connection string.
  - Disables network transmission (`disableTelemetry: true`).
  - Adds a telemetry initializer that logs every envelope to `console.log` and returns `false` to prevent sending.
- Enables:
  - React route change tracking (via `ReactPlugin` + history integration).
  - Page visit time tracking (`autoTrackPageVisitTime`).
  - Automatic route tracking (`enableAutoRouteTracking: true`).
  - Batching with a low `maxBatchInterval` (500ms) to surface events quickly in lower environments.

> [!NOTE]
> `initialize` should only be called once. Use `TelemetryProvider` to guard this automatically in React apps.

### Error Tracking

`trackErrorWithAppInsights(error, customProperties?)` normalizes various error inputs:

- `AxiosError` – attaches the `response` object to `properties`.
- Native `Error` – tracked directly.
- Anything else – coerced to string and wrapped in a new `Error`.

```js
import { trackErrorWithAppInsights } from 'features/logging/appInsights/telemetryService';

try {
  await apiCall();
} catch (err) {
  trackErrorWithAppInsights(err, { feature: 'user-profile', action: 'load' });
}
```

Edge cases / notes:

- Safe to call even before initialization; however, no telemetry is sent/logged until after `initialize` runs.
- Avoid passing large objects (e.g., huge API payloads) in `customProperties`; Application Insights truncates oversized fields.

### Direct Access

```js
import { getAppInsights } from 'features/logging/appInsights/telemetryService';

const ai = getAppInsights();
ai?.trackEvent({ name: 'custom-event', properties: { foo: 'bar' } });
```

> [!TIP]
> Use direct access sparingly; prefer encapsulated helpers in hooks for consistency and discoverability.

---

## `TelemetryProvider`

Source: `appInsights/TelemetryProvider.jsx`

Lightweight component that:

- Reads the connection string from `appInsightsConfig`.
- Invokes `telemetryService.initialize(...)` the first time it renders with a truthy value.
- Renders its children only after successful initialization (avoids race conditions where components log before the SDK is ready).

### Usage

Wrap near the root (after config/env is resolvable, before components that may log events):

```jsx
import { TelemetryProvider } from 'features/logging/appInsights/TelemetryProvider';

export function AppProviders({ children }) {
  return <TelemetryProvider>{children}</TelemetryProvider>;
}
```

Edge cases / notes:

- Returns `null` until initialized; do not rely on children side effects on first render if the connection string may be late-bound.
- Safe to nest once (only first mount initializes); avoid intentional multiple mounts.

---

## `useAppInsights` Hook

Source: `appInsights/useAppInsights.js`

Provides opinionated event helpers tied to UI interactions.
It also captures an `actor` metadata object derived from the authenticated user (via `useAuthenticatedUser`).

Exports (return value):

- `trackSideBarExpanderClicked(prevIsExpanded: boolean)`
- `trackThemeToggleClicked(prevIsDarkTheme: boolean)`

Each helper:

- Emits an event with a descriptive kebab cased name (e.g., `site--theme-toggle-clicked`).
- Includes `actor` (tenantId, accountId, username, name) and a normalized `originalState` / `newState` delta.

### Example

```jsx
import { useAppInsights } from 'features/logging/appInsights/useAppInsights';

function ThemeToggleButton({ isDark, onToggle }) {
  const { trackThemeToggleClicked } = useAppInsights();

  function handleClick() {
    trackThemeToggleClicked(isDark); // derives new state internally
    onToggle(!isDark);
  }

  return (
    <button type="button" onClick={handleClick}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
```

### Adding New Event Helpers

1. Add a function inside `useAppInsights.js` following the existing pattern.
2. Keep event names scoped (`<area>--<action>--<past-tense>` or similar): `feature-x--panel-opened`.
3. Include `actor` where user context matters.
4. Prefer explicit before/after state objects (`originalState`, `newState`) for stateful toggles.

> [!NOTE]
> Avoid raw `trackEvent` usage across the codebase—centralize patterns here to enforce naming conventions and payload shape.

---

## Naming Conventions

| Telemetry Type | Pattern / Notes                                                                     |
| -------------- | ----------------------------------------------------------------------------------- |
| Event          | `area--thing--verb` (kebab case, past tense preferred for user actions)             |
| Errors         | Use `trackErrorWithAppInsights` (auto-normalizes)                                   |
| Custom Props   | Flat, primitive-friendly keys; nest only when helpful (`originalState`, `newState`) |

> [!TIP]
> Keep event names stable; changing them creates fragmented analytics.
> Add new names only when semantics truly change.

---

## Extending Telemetry

Add custom telemetry initializers (e.g., global correlation IDs):

```js
import { getAppInsights } from 'features/logging/appInsights/telemetryService';

const ai = getAppInsights();
ai?.addTelemetryInitializer((envelope) => {
  envelope.tags = envelope.tags || {};
  envelope.tags['ai.cloud.role'] = 'web-client';
  // return false to drop
});
```

Tracking a custom metric:

```js
getAppInsights()?.trackMetric({ name: 'search-results-count', average: results.length });
```

Tracking a custom page view manually (rarely needed because auto route tracking is enabled):

```js
getAppInsights()?.trackPageView({ name: 'Custom Wizard Step 3' });
```

---

## Usage Summary

Typical flow:

1. `TelemetryProvider` mounts (initializes SDK once).
2. Feature code calls helpers from `useAppInsights` (UI events) or `trackErrorWithAppInsights` (errors).
3. Local mode (`LOCAL`) prints envelopes to console; any other connection string ships to Azure.

---

## Adding New Logging Features

When expanding this module:

- Prefer **small, composable helpers** over scattering direct SDK calls.
- Document new helpers here (brief description + example).
- Keep user context capture consistent (re-use the `actor` structure or extend thoughtfully).
- Guard sensitive data: never log secrets, tokens, or PII beyond what is already permissible (username / display name as provided by identity platform is acceptable if policy allows).

---

## Troubleshooting

| Symptom                    | Likely Cause                                                       | Fix                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| No events visible in Azure | Using `LOCAL` connection string                                    | Use real connection string for target env                                                                                 |
| `trackEvent` is undefined  | Accessed before provider init                                      | Wrap code under `TelemetryProvider` or defer call                                                                         |
| Large object truncated     | App Insights payload limit                                         | Serialize only needed fields                                                                                              |
| Duplicate events           | Helper called twice (e.g., React Strict Mode double render in dev) | React 19 Strict Mode intentional double-invocation – ensure helpers execute in user-triggered handlers, not during render |

---

## Security & Privacy

- Do not log access tokens or raw API responses containing sensitive fields.
- Redact or hash identifiers if in doubt.
- Follow organizational telemetry retention & data handling guidelines.

---

## Quick Reference

```js
// Error
trackErrorWithAppInsights(err, { feature: 'x' });

// Event (via hook)
const { trackThemeToggleClicked } = useAppInsights();
trackThemeToggleClicked(true);

// Direct / advanced
getAppInsights()?.trackEvent({ name: 'custom-event', properties: { foo: 'bar' } });
```

---

If you add or modify telemetry capabilities, update this README to keep it authoritative.
