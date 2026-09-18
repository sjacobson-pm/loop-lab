# Page Overlay

`PageOverlay` is a lightweight, full‑viewport layer used to temporarily cover the application UI (e.g., during loading, blocking interactions, or presenting high‑priority content).
It:

- Stretches edge‑to‑edge using fixed positioning (`tw:fixed tw:inset-0`).
- Sits at the top of the stacking order (`tw:z-[9999]`).
- Supports solid or translucent backgrounds with automatic dark mode variants.
- Simply renders its `children`—it does **not** manage focus, scrolling lock, or dismissal logic (leave that to the caller).

## Table of Contents

- [Table of Contents](#table-of-contents)
- [API](#api)
- [Usage](#usage)
- [Examples](#examples)
  - [A. Full‑screen loading state during app bootstrap](#a-fullscreen-loading-state-during-app-bootstrap)
  - [B. Temporarily disabling interaction behind a wizard step](#b-temporarily-disabling-interaction-behind-a-wizard-step)
- [Dependencies / Styling](#dependencies--styling)
- [Implementation Notes / Extensibility](#implementation-notes--extensibility)

## API

```tsx
import { PageOverlay } from 'features/ui/page-overlay/PageOverlay';

<PageOverlay isTranslucent={boolean}>…children…</PageOverlay>;
```

| Prop            | Type        | Default | Description                                                                                                   |
| --------------- | ----------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `isTranslucent` | `boolean`   | `false` | If `true`, uses semi‑opaque backdrop (`white/80` & dark mode `pm-granite-950/80`). Otherwise a solid surface. |
| `children`      | `ReactNode` | —       | Content rendered centered/positioned by you (no internal layout applied).                                     |

Notes:

- The component sets `role="page-overlay"` purely for internal testing. This is **not** a standard ARIA role. If shipping to production, consider adding appropriate semantics (e.g., `aria-modal="true"` on a dialog child) or replace with `data-testid` in tests.
- No keyboard trapping or ESC handling is included—compose with a modal/dialog library if needed.

## Usage

Basic (solid background):

```tsx
import { PageOverlay } from 'features/ui/page-overlay/PageOverlay';

function BlockingLoader() {
  return (
    <PageOverlay>
      <div className="tw:flex tw:h-full tw:items-center tw:justify-center">
        <span className="tw:text-pm-granite-700 tw:dark:text-white">Loading…</span>
      </div>
    </PageOverlay>
  );
}
```

Translucent overlay (let underlying layout subtly show through):

```tsx
<PageOverlay isTranslucent>
  <div className="tw:flex tw:h-full tw:items-center tw:justify-center">
    <div className="tw:rounded tw:bg-white tw:p-6 tw:shadow-lg tw:dark:bg-pm-granite-800">
      <h2 className="tw:mb-2 tw:text-lg tw:font-semibold">Processing</h2>
      <p className="tw:text-sm tw:opacity-80">Please wait…</p>
    </div>
  </div>
</PageOverlay>
```

## Examples

### A. Full‑screen loading state during app bootstrap

```tsx
function AppBootstrapGate({ isReady, children }) {
  if (!isReady) {
    return (
      <PageOverlay>
        <div className="tw:flex tw:h-full tw:flex-col tw:items-center tw:justify-center tw:gap-4">
          <Spinner />
          <span className="tw:text-sm tw:tracking-wide">Initializing session…</span>
        </div>
      </PageOverlay>
    );
  }
  return children;
}
```

### B. Temporarily disabling interaction behind a wizard step

```tsx
function WizardStep({ isSubmitting }) {
  return (
    <div className="tw:relative">
      {isSubmitting && (
        <PageOverlay isTranslucent>
          <div className="tw:flex tw:h-full tw:items-center tw:justify-center">
            <Spinner />
          </div>
        </PageOverlay>
      )}
      {/* underlying step form */}
      <StepForm />
    </div>
  );
}
```

## Dependencies / Styling

- Relies on the project Tailwind setup (prefixed utilities `tw:`) and a custom color token `pm-granite-950` (including dark mode variants).
- No third‑party component dependencies; purely functional.

## Implementation Notes / Extensibility

- Add scroll locking by pairing with `document.body.style.overflow = 'hidden'` (ensure cleanup) or a higher-level layout gate.
- For accessibility when presenting critical modal content, wrap children in a focus-managed dialog and move ARIA attributes there.
- If multiple overlays are possible, prefer centralizing z‑index tokens to avoid collisions.

---

Maintain tests in `PageOverlay.test.jsx` when modifying behavior (e.g., new class names or semantic attributes).
