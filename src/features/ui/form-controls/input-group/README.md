# Input Group UI Components

Flexible, unit‑tested building blocks for composing Bootstrap input groups with consistently styled, declarative add‑ons.
An add‑on is metadata or an affordance that visually attaches to an input (text label, icon, action button, or icon with contextual popover).
These components centralize logic (conditional rendering, popover wiring, click handling, Font Awesome integration) so feature code only supplies structured config objects.

Core pieces:

- `InputGroup` – Thin wrapper around `react-bootstrap/InputGroup` that renders optional `prependAddOns` and `appendAddOns` arrays.
- `AddOnCollection` – Iterates over add‑on definitions and dispatches to a concrete add‑on component based on `addOnType`.
- Concrete add‑ons:
  - `TextAddOn` – Static text (e.g., units, prefixes).
  - `ButtonAddOn` – Action button (search, clear, trigger modal, etc.).
  - `IconAddOn` – Font Awesome icon, optionally clickable and/or with an informational popover.
  - `IconAddOnContents` / `IconAddOnContentsWithPopover` – Internal rendering details (extracted for isolated testing & popover branching).
- `INPUT_GROUP_ADD_ON_TYPE` – Frozen enum ensuring type safety at runtime (icon | text | button).

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
- [Examples](#examples)
  - [A. Search Bar with Action \& Info Popover](#a-search-bar-with-action--info-popover)
  - [B. Read‑Only Field with Disabled Icon](#b-readonly-field-with-disabled-icon)
- [Add‑On API Summary](#addon-api-summary)
- [Error Handling / Edge Considerations](#error-handling--edge-considerations)
- [Dependencies](#dependencies)
- [Testing Notes](#testing-notes)
- [Extension Patterns](#extension-patterns)

## Usage

Define one or more add‑on config objects and pass them to `InputGroup` via `prependAddOns` and/or `appendAddOns`.
Each object must include `addOnType` referencing a value from `INPUT_GROUP_ADD_ON_TYPE` plus the props required by that specific add‑on.

```jsx
import Form from 'react-bootstrap/Form';
import { InputGroup } from 'features/ui/form-controls/input-group/InputGroup';
import { INPUT_GROUP_ADD_ON_TYPE } from 'features/ui/form-controls/input-group/add-ons/enums/inputGroupAddOnType';

function Example() {
  const prependAddOns = [
    { addOnType: INPUT_GROUP_ADD_ON_TYPE.text, text: 'https://' },
    { addOnType: INPUT_GROUP_ADD_ON_TYPE.icon, icon: 'lock', disabled: false },
  ];

  const appendAddOns = [
    {
      addOnType: INPUT_GROUP_ADD_ON_TYPE.icon,
      icon: 'circle-info',
      extendedContainerClass: 'info-icon',
      popover: { title: 'Hint', content: 'Enter domain only', placement: 'top' },
    },
    {
      addOnType: INPUT_GROUP_ADD_ON_TYPE.button,
      text: 'Go',
      variant: 'primary',
      onClick: () => console.log('Submit clicked'),
    },
  ];

  return (
    <InputGroup prependAddOns={prependAddOns} appendAddOns={appendAddOns}>
      <Form.Control type="text" placeholder="example.com" />
    </InputGroup>
  );
}
```

## Examples

### A. Search Bar with Action & Info Popover

```jsx
const prepend = [{ addOnType: INPUT_GROUP_ADD_ON_TYPE.text, text: 'Search' }];
const append = [
  {
    addOnType: INPUT_GROUP_ADD_ON_TYPE.icon,
    icon: 'circle-question',
    popover: { title: 'Tips', content: 'Use quotes for exact phrases' },
  },
  { addOnType: INPUT_GROUP_ADD_ON_TYPE.button, text: 'Go', variant: 'secondary', onClick: doSearch },
];

<InputGroup prependAddOns={prepend} appendAddOns={append}>
  <Form.Control onKeyDown={handleKey} />
</InputGroup>;
```

### B. Read‑Only Field with Disabled Icon

```jsx
const prepend = [{ addOnType: INPUT_GROUP_ADD_ON_TYPE.icon, icon: 'user', disabled: true }];

<InputGroup prependAddOns={prepend}>
  <Form.Control plaintext readOnly defaultValue={userName} />
</InputGroup>;
```

## Add‑On API Summary

All add‑ons share a discriminant property: `addOnType`.

`TextAddOn`

- Props: `text: string`

`ButtonAddOn`

- Props: `text: string`, `variant?: string`, `disabled?: boolean`, `onClick?: () => void`

`IconAddOn`

- Props: `icon: IconProp`, `disabled?: boolean`, `extendedContainerClass?: string`, `onClick?: () => void`, `popover?: { title?: string, content: ReactNode, placement?: string }`
- Behavior: Adds `clickable` CSS class when `onClick` provided and not disabled. Appends `hover-info` when popover active.

`InputGroup`

- Props:
  - `prependAddOns?: (TextAddOnProps | IconAddOnProps | ButtonAddOnProps)[]`
  - `appendAddOns?: (TextAddOnProps | IconAddOnProps | ButtonAddOnProps)[]`
  - `children: ReactNode` (usually one `Form.Control` but can be multiple inputs)

## Error Handling / Edge Considerations

- Unknown `addOnType` entries are ignored (render returns `null`).
- Empty or `null` add‑on arrays produce no wrappers—only the raw children are rendered.
- Disabled icon/button suppresses click handlers.
- Popover requires a `content` field; `title` and `placement` are optional (`placement` defaults to `auto`).

## Dependencies

- `react-bootstrap` – Structural components (`InputGroup`, `Button`, `OverlayTrigger`, `Popover`).
- `@fortawesome/react-fontawesome` – Icon rendering (consumer must have library & relevant icons registered elsewhere in the app).

## Testing Notes

- All components are covered by colocated `*.test.jsx` files with interaction tests (click behaviors, popover branching, conditional rendering, className logic).
- Changes to shape of add‑on props should update `types.js` JSDoc typedefs and relevant tests.

## Extension Patterns

- To add a new add‑on type: extend `INPUT_GROUP_ADD_ON_TYPE`, create a component, and add a `case` in `AddOnCollection` switch. Provide tests mirroring existing patterns.

---

Concise reference intended for internal contributors; see root project docs for global conventions.
