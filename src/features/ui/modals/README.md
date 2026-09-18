# Modals

Lightweight, composable modal primitives built on top of `react-bootstrap/Modal`.
This layer standardizes structure (header / body / footer), centralizes configuration (static backdrop, optional ESC support), and provides a ready‑to‑use `ConfirmationModal` for common confirm / cancel flows.
Use these components to avoid duplicating modal markup and to keep UX consistent across the app.

Key pieces:

- `Modal` – Base wrapper with compound sub-components: `Modal.Header`, `Modal.Body`, `Modal.Footer`.
- `ConfirmationModal` – Opinionated confirm dialog (title + message + primary & secondary buttons).

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
  - [Base Modal](#base-modal)
  - [API (Base `Modal`)](#api-base-modal)
  - [API (`ConfirmationModal`)](#api-confirmationmodal)
- [Examples](#examples)
  - [Confirmation Flow](#confirmation-flow)
  - [Custom Form Modal](#custom-form-modal)
- [Dependencies](#dependencies)

## Usage

Import via feature alias:

```jsx
import { Modal } from 'features/ui/modals/modal/Modal';
import { ConfirmationModal } from 'features/ui/modals/ConfirmationModal';
```

### Base Modal

```jsx
import { useState } from 'react';
import { Modal } from 'features/ui/modals/modal/Modal';

function BasicModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal isOpen={open} onHide={() => setOpen(false)} size="lg" centered allowEscapeClose>
        <Modal.Header title="Sample Modal" />
        <Modal.Body>
          <p>Body content goes here. Render any React nodes.</p>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-outline-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => setOpen(false)}>
            Confirm
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
```

### API (Base `Modal`)

| Prop               | Type     | Required | Default | Notes                                       |
| ------------------ | -------- | -------- | ------- | ------------------------------------------- |
| `isOpen`           | boolean  | yes      | —       | Controls visibility (mapped to `show`)      |
| `onHide`           | function | yes      | —       | Close handler (close button / programmatic) |
| `allowEscapeClose` | boolean  | no       | `false` | Enables ESC key (backdrop still static)     |
| `centered`         | boolean  | no       | —       | Vertical centering (Bootstrap prop)         |
| `size`             | string   | no       | —       | Bootstrap sizes: `sm`, `lg`, `xl`           |
| `children`         | node     | yes      | —       | Usually `Header`, `Body`, `Footer`          |

Sub-components:

- `Modal.Header` – Props: `title` (string, required)
- `Modal.Body` – Props: `children`
- `Modal.Footer` – Props: `children`

### API (`ConfirmationModal`)

| Prop                  | Type         | Required | Notes                               |
| --------------------- | ------------ | -------- | ----------------------------------- |
| `isOpen`              | boolean      | yes      | Visibility control                  |
| `title`               | string       | yes      | Modal header title                  |
| `confirmationMessage` | string\|node | yes      | Main body content                   |
| `confirmButtonText`   | string       | yes      | Primary action label                |
| `cancelButtonText`    | string       | yes      | Secondary action label              |
| `size`                | string       | no       | Passed to base `Modal`              |
| `onConfirm`           | function     | yes      | Called on primary button click      |
| `onCancel`            | function     | yes      | Called on secondary button or close |

Behavior notes:

- Backdrop is static (cannot dismiss by clicking outside).
- ESC key support only available through the base `Modal` (not exposed in `ConfirmationModal` yet).

## Examples

### Confirmation Flow

```jsx
import { useState } from 'react';
import { ConfirmationModal } from 'features/ui/modals/ConfirmationModal';

function DeleteUser({ onDelete }) {
  const [open, setOpen] = useState(false);

  const confirm = () => {
    onDelete();
    setOpen(false);
  };

  return (
    <>
      <button className="btn btn-danger" onClick={() => setOpen(true)}>
        Delete User
      </button>
      <ConfirmationModal
        isOpen={open}
        title="Delete User"
        confirmationMessage="Are you sure you want to permanently delete this user?"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        size="md"
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
```

### Custom Form Modal

```jsx
<Modal isOpen={open} onHide={close} size="lg" centered>
  <Modal.Header title="Create Item" />
  <Modal.Body>
    <ItemForm onSubmit={handleSubmit} />
  </Modal.Body>
  <Modal.Footer>
    <button className="btn btn-link" onClick={close}>
      Cancel
    </button>
    <button className="btn btn-primary" form="item-form">
      Create
    </button>
  </Modal.Footer>
</Modal>
```

## Dependencies

Depends on `react-bootstrap/Modal` (Bootstrap 5). Styling of buttons in examples assumes Bootstrap utility classes are available.
All logic (focus management, portals, animations) delegates to `react-bootstrap`; this layer only organizes structure and props.
