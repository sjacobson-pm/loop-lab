# Tables UI Feature

Utility React components for rendering contextual table rows and row-level overlays.
These components provide a consistent, accessible way to surface loading states, errors, informational messages, and actionable reload prompts inside `<tbody>` sections without forcing each feature to re‑implement boilerplate markup.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Included Components](#included-components)
- [Usage](#usage)
  - [Pattern: Conditional Row Rendering](#pattern-conditional-row-rendering)
  - [Pattern: Inline Overlay (e.g., transient reload prompt)](#pattern-inline-overlay-eg-transient-reload-prompt)
- [Component APIs](#component-apis)
  - [`MessageTableRow`](#messagetablerow)
  - [`LoadingMessageTableRow`](#loadingmessagetablerow)
  - [`ErrorMessageTableRow`](#errormessagetablerow)
  - [`TableRowOverlay`](#tablerowoverlay)
- [Behavior Notes](#behavior-notes)
- [Styling](#styling)
- [Dependencies](#dependencies)
- [Testing](#testing)
- [When to Add a New Component](#when-to-add-a-new-component)

## Included Components

- **`MessageTableRow`** – Base wrapper that spans a full logical row with arbitrary children.
- **`LoadingMessageTableRow`** – Standardized loading state (spinner + message).
- **`ErrorMessageTableRow`** – Standardized error state (warning icon + message).
- **`TableRowOverlay`** – Overlay element rendered inside a `<td>` (never directly under `<tr>`) to visually cover that full row for transient status / reload messaging.

> All message rows are meant to live directly inside a `<tbody>` and use `colSpan` to cover all visible columns.

## Usage

Import only what you need:

```jsx
import { LoadingMessageTableRow } from 'features/ui/tables/table-rows/LoadingMessageTableRow';
import { ErrorMessageTableRow } from 'features/ui/tables/table-rows/ErrorMessageTableRow';
import { TableRowOverlay } from 'features/ui/tables/table-rows/TableRowOverlay';
```

### Pattern: Conditional Row Rendering

```jsx
function ExampleTable({ data, isLoading, isError, reload }) {
  const columnCount = 5;

  return (
    <table className="table">
      <thead>{/* ...headers... */}</thead>
      <tbody>
        {isLoading && <LoadingMessageTableRow colSpan={columnCount} loadingMessage="Loading records..." />}
        {isError && !isLoading && <ErrorMessageTableRow colSpan={columnCount} errorMessage="Could not load data" />}
        {!isLoading && !isError && data.length === 0 && (
          <MessageTableRow colSpan={columnCount} className="text-muted">
            No records found
          </MessageTableRow>
        )}
        {!isLoading &&
          !isError &&
          data.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              {/* ...other cells... */}
            </tr>
          ))}
      </tbody>
    </table>
  );
}
```

### Pattern: Inline Overlay (e.g., transient reload prompt)

```jsx
function ReloadableRow({ record, isRefreshing, refresh }) {
  return (
    <tr>
      <td className="relative">
        {/* positioning context for overlay */}
        {record.name}
        {isRefreshing && <TableRowOverlay overlayType="info" message="Refreshing..." details={record.name} />}
      </td>
      <td>{record.status}</td>
      <td>{record.owner}</td>
      <td>{record.updatedAt}</td>
      <td>{/* actions */}</td>
    </tr>
  );
}

// Full-row overlay variant (e.g., row-specific error) using a spanning cell
function RowWithErrorOverlay({ columnCount, error, retry }) {
  if (!error) return null;
  return (
    <tr>
      <td colSpan={columnCount} className="relative p-0">
        <TableRowOverlay
          overlayType="error"
          message="Failed to load row details"
          reloadMessage="Click to retry"
          onReload={retry}
        />
      </td>
    </tr>
  );
}
```

## Component APIs

### `MessageTableRow`

| Prop        | Type        | Required | Description                                                                 |
| ----------- | ----------- | -------- | --------------------------------------------------------------------------- |
| `colSpan`   | `number`    | yes      | Number of table columns to span. Should match current visible column count. |
| `className` | `string`    | no       | Extra classes appended to the `<tr>` element.                               |
| `children`  | `ReactNode` | yes      | Content displayed inside the single spanning `<td>`.                        |

### `LoadingMessageTableRow`

| Prop             | Type     | Required | Description                          |
| ---------------- | -------- | -------- | ------------------------------------ |
| `loadingMessage` | `string` | yes      | Text displayed next to spinner icon. |
| `colSpan`        | `number` | yes      | Passed through to `MessageTableRow`. |
| `className`      | `string` | no       | Additional row classes.              |

### `ErrorMessageTableRow`

| Prop           | Type     | Required | Description                          |
| -------------- | -------- | -------- | ------------------------------------ |
| `errorMessage` | `string` | yes      | Error text shown after warning icon. |
| `colSpan`      | `number` | yes      | Passed through to `MessageTableRow`. |
| `className`    | `string` | no       | Additional row classes.              |

### `TableRowOverlay`

| Prop            | Type                | Required | Description                                                                         |
| --------------- | ------------------- | -------- | ----------------------------------------------------------------------------------- |
| `message`       | `string`            | yes      | Primary bold overlay message.                                                       |
| `details`       | `string`            | no       | Optional secondary detail line; triggers detail container if present.               |
| `reloadMessage` | `string`            | no       | Additional hint (e.g., "Click reload"); also triggers detail container.             |
| `overlayType`   | `'info' \| 'error'` | yes      | Determines color styling (info vs error classes).                                   |
| `onReload`      | `() => void`        | no       | When supplied, a reload icon button is rendered and invokes this callback on click. |

## Behavior Notes

- `LoadingMessageTableRow` and `ErrorMessageTableRow` both delegate layout to `MessageTableRow` to keep styling uniform.
- Icons use the centrally managed Font Awesome configuration (`fontAwesomeConfig.classicSolidIcons`).
- `TableRowOverlay` conditionally renders detail and reload sections only when corresponding props are provided.
- For overlays, ensure the _containing `<td>`_ establishes a positioning context (`position: relative`). Do **not** render `TableRowOverlay` as a direct child of `<tr>`—that is invalid table structure.

## Styling

- Utility classes with `tw:` prefix rely on Tailwind CSS configuration (e.g., thematic colors `tw:bg-red-600/90`).
- Base class hooks: `error-message-table-row`, `loading-message-table-row`, `table-row-overlay`, `overlay-message`, `overlay-message-details`.
- Extend styling via global SCSS or Tailwind layers without modifying component code where possible.

## Dependencies

- **Font Awesome React** (`@fortawesome/react-fontawesome`) for standardized icons; actual icon sets provided through internal `fontAwesomeConfig`.
- **Tailwind CSS** utility classes (prefixed `tw:`) for coloring / layout in overlays.

## Testing

Each component has a colocated `.test.jsx` file covering rendering and conditional logic—use existing tests as reference when extending behavior.

## When to Add a New Component

Create a new specialized table row component only if:

1. It adds distinct semantic meaning (e.g., an "EmptyStateTableRow" with illustration), and
2. The pattern would otherwise be repeated across multiple features.

Otherwise, prefer composing `MessageTableRow` directly.

---

Concise reference for developers; update this file when modifying public props or adding new table row patterns.
