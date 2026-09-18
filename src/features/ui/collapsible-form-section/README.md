# Collapsible Form Section

A lightweight UI pattern for grouping related form fields inside an expandable/collapsible container.
The component reduces visual noise for large forms while keeping content accessible and keyboard-interactive.
State is internally managed (uncontrolled): clicking the header or the collapsed placeholder toggles expansion.

Core pieces:

- `CollapsibleFormSection` – Public component that wires header + body.
- `SectionHeader` – Renders the title and caret icon (up/down) based on collapsed state.
- `SectionBody` – Hosts children when expanded and shows an ellipsis icon hotspot when collapsed.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
  - [Props (CollapsibleFormSection)](#props-collapsibleformsection)
  - [Behavior \& Accessibility](#behavior--accessibility)
- [Examples](#examples)
  - [Multiple Sections](#multiple-sections)
  - [Nested Layout / Grid](#nested-layout--grid)
- [Dependencies](#dependencies)

## Usage

Import the top-level component.
It accepts minimal props and renders provided children.

```jsx
import { CollapsibleFormSection } from 'features/ui/collapsible-form-section/CollapsibleFormSection';

export const ProfileForm = () => (
  <form>
    <CollapsibleFormSection id="contact-info" title="Contact Information">
      <div className="tw:space-y-4">
        <label>
          <span>Email</span>
          <input type="email" name="email" />
        </label>
        <label>
          <span>Phone</span>
          <input type="tel" name="phone" />
        </label>
      </div>
    </CollapsibleFormSection>
  </form>
);
```

### Props (CollapsibleFormSection)

| Prop       | Type        | Required | Description                                                          |
| ---------- | ----------- | -------- | -------------------------------------------------------------------- |
| `id`       | `string`    | YES      | Applied to root `<div>` (useful for anchoring / tests).              |
| `title`    | `string`    | YES      | Text displayed in the clickable header.                              |
| `children` | `ReactNode` | YES      | Form fields / arbitrary content rendered inside the expandable body. |

### Behavior & Accessibility

- Clicking the header toggles collapsed state.
- When collapsed, only the header plus a compact ellipsis hotspot (inside body) remain; clicking either restores expansion.
- Icons use Font Awesome (solid caret up/down + ellipsis) via the central `fontAwesomeConfig`.
- `SectionBody` uses `role="section-body"` and the collapsed hotspot uses `role="collapsed-content"` (primarily for tests). Enhance with ARIA attributes in future if needed (e.g., `aria-expanded`).

## Examples

### Multiple Sections

```jsx
<>
  <CollapsibleFormSection id="personal" title="Personal Details">
    {/* fields */}
  </CollapsibleFormSection>

  <CollapsibleFormSection id="employment" title="Employment">
    {/* fields */}
  </CollapsibleFormSection>
</>
```

### Nested Layout / Grid

```jsx
<CollapsibleFormSection id="addresses" title="Addresses">
  <div className="tw:grid tw:grid-cols-2 tw:gap-4">
    <label>
      <span>Street</span>
      <input name="street" />
    </label>
    <label>
      <span>City</span>
      <input name="city" />
    </label>
  </div>
</CollapsibleFormSection>
```

## Dependencies

- React (`useState`) – internal collapse state.
- `@fortawesome/react-fontawesome` & centralized `fontAwesomeConfig` for caret + ellipsis icons.
- Local CSS Module: `CollapsibleFormSection.module.css` (applies structural + collapsed styling). Tailwind utility classes can be used inside children without affecting the component.

---

Enhancement ideas (not yet implemented): controlled mode (`isCollapsed` + `onToggle`), ARIA (`aria-controls`, `aria-expanded`), animation hooks.
