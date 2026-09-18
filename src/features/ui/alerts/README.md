# Alerts UI Components

Reusable alert components that provide consistent, accessible inline feedback messaging across the application.
They wrap `react-bootstrap`'s `Alert` and standardize iconography via the central `fontAwesomeConfig`.
Each specialized alert (Info, Loading, Success, Error) maps to a semantic variant and Font Awesome icon so feature code stays lean and consistent.

Core goals:

- Single styling & behavior surface (padding, typography, icon placement)
- Zero repetition of variant/icon wiring in feature code
- Predictable accessibility: all alerts render with `role="alert"` (inherited from `Alert`)
- Easy extension: create new alert types by composing `AlertBase`

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Components \& API](#components--api)
  - [`AlertBase`](#alertbase)
  - [`InfoAlert`](#infoalert)
  - [`LoadingAlert`](#loadingalert)
  - [`SuccessAlert`](#successalert)
  - [`ErrorAlert`](#erroralert)
- [Usage](#usage)
  - [Conditional lifecycle example](#conditional-lifecycle-example)
  - [Error handling example](#error-handling-example)
  - [Extending with `AlertBase`](#extending-with-alertbase)
- [Behavior \& Styling Notes](#behavior--styling-notes)
- [Dependencies](#dependencies)
- [Testing](#testing)

## Components & API

### `AlertBase`

Low-level building block. Use directly only when creating a new specialized alert.

Props:

| Prop            | Type                            | Required | Description                                                                                 |
| --------------- | ------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `variant`       | `string`                        | yes      | Passed to `react-bootstrap/Alert` (e.g. `info`, `danger`, `success`, `warning`).            |
| `icon`          | `IconDefinition` (Font Awesome) | yes      | Icon displayed to the left of the text. Sourced from `fontAwesomeConfig.classicSolidIcons`. |
| `iconSpinPulse` | `boolean`                       | no       | Enables animated spinner / pulse (used by `LoadingAlert`).                                  |
| `displayText`   | `string`                        | yes      | Primary message text. Rendered immediately after the icon.                                  |
| `children`      | `ReactNode`                     | no       | Additional structured content (e.g., details, actions). Rendered after `displayText`.       |

### `InfoAlert`

Props: `{ displayText: string }`

### `LoadingAlert`

Props: `{ displayText: string }` – Uses an animated spinner (`iconSpinPulse`).

### `SuccessAlert`

Props: `{ displayText: string }`

### `ErrorAlert`

Props:

| Prop          | Type                                    | Required | Description                                      |
| ------------- | --------------------------------------- | -------- | ------------------------------------------------ |
| `displayText` | `string`                                | yes      | High-level error summary / user-friendly text.   |
| `error`       | `{ message: string; traceId?: string }` | yes      | Raw error info. `traceId` shown only if present. |

Renders structured children beneath the summary: a horizontal rule, the technical `error.message`, and optional trace id.

## Usage

Import components directly (there is no barrel file in this folder):

```jsx
import { InfoAlert } from 'features/ui/alerts/InfoAlert';
import { LoadingAlert } from 'features/ui/alerts/LoadingAlert';
import { SuccessAlert } from 'features/ui/alerts/SuccessAlert';
import { ErrorAlert } from 'features/ui/alerts/ErrorAlert';
```

Basic render:

```jsx
<InfoAlert displayText="Profile loaded." />
```

### Conditional lifecycle example

```jsx
function ProfileStatus({ isLoading, error, profile }) {
  if (isLoading) return <LoadingAlert displayText="Loading profile..." />;
  if (error) return <ErrorAlert displayText="Unable to load profile" error={error} />;
  if (profile) return <SuccessAlert displayText="Profile ready" />;
  return <InfoAlert displayText="No profile selected" />;
}
```

### Error handling example

```jsx
async function loadData(setState) {
  try {
    setState({ loading: true });
    const data = await api.get('/widgets');
    setState({ data, loading: false });
  } catch (e) {
    // Shape the error to match the ErrorAlert contract
    setState({ error: { message: e.message, traceId: e.traceId }, loading: false });
  }
}
```

```jsx
{
  state.error && <ErrorAlert displayText="Widget retrieval failed" error={state.error} />;
}
```

### Extending with `AlertBase`

Create a new alert type (e.g., Warning):

```jsx
import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { AlertBase } from 'features/ui/alerts/AlertBase';

export const WarningAlert = ({ displayText, details }) => (
  <AlertBase
    variant="warning"
    icon={fontAwesomeConfig.classicSolidIcons.faTriangleExclamation}
    displayText={displayText}>
    {details ? <div className="tw:mt-2 tw:text-base">{details}</div> : null}
  </AlertBase>
);
```

## Behavior & Styling Notes

- Typography: root text size is elevated via `tw:text-xl`; nested details use `tw:text-base` when added manually (see `ErrorAlert`).
- Icon spacing handled with an HTML entity (`&ensp;`) in `AlertBase` for consistent visual separation.
- All alerts inherit Bootstrap contextual color classes via `variant`.
- Children content appears directly after the primary message—prefer semantic containers (`<div>`, `<ul>`) if adding structure.

## Dependencies

- `react-bootstrap/Alert` – structural & accessible alert wrapper.
- `@fortawesome/react-fontawesome` – icon rendering (size fixed at `xl`).
- Internal: `configs/fontAwesomeConfig` supplies curated icon definitions.

## Testing

Each component has a dedicated test ensuring:

- Correct variant & icon wiring
- Spin animation only where expected (`LoadingAlert`)
- Conditional rendering of `traceId` in `ErrorAlert`
- Children passthrough in `AlertBase`

When adding a new alert type, mirror existing test patterns to maintain coverage.

---

For questions or enhancements (e.g., dismissible alerts, inline actions), create a feature ticket and reference this folder in the description.
