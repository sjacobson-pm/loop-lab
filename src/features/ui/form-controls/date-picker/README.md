# Date Picker

Lightweight wrapper around `react-datepicker` providing:

- Consistent styling (Bootstrap form-control + calendar icon add-on)
- Unified date format (defaults to `MM/dd/yyyy` via `FormattingStrings.date`)
- A normalized `onChange` event that mimics native inputs: `{ target: { name, value } }`
- Easy extension via pass‑through props to the underlying `ReactDatePicker`

> Scope: This README only documents the contents of `features/ui/form-controls/date-picker/`.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
  - [With Additional `react-datepicker` Props](#with-additional-react-datepicker-props)
- [Examples](#examples)
  - [1. Generic Form Handler](#1-generic-form-handler)
- [API](#api)
  - [`<DatePicker />`](#datepicker-)
  - [`<CustomInput />`](#custominput-)
- [Event Contract](#event-contract)
- [Dependencies](#dependencies)
- [Extensibility Tips](#extensibility-tips)
- [Testing Notes](#testing-notes)
- [Quick Reference](#quick-reference)

## Usage

```jsx
import { useState } from 'react';
import { DatePicker } from 'features/ui/form-controls/date-picker/DatePicker';

export function Example() {
  const [form, setForm] = useState({ startDate: null });

  const handleChange = (e) => {
    const { name, value } = e.target; // value is a Date (or null if cleared)
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <DatePicker
      name="startDate"
      value={form.startDate}
      placeholder="Select a start date"
      minDate={new Date()}
      onChange={handleChange}
    />
  );
}
```

### With Additional `react-datepicker` Props

Any extra props are forwarded, allowing feature‑level customization without changing this wrapper.

```jsx
<DatePicker
  name="dob"
  value={dob}
  placeholder="MM/DD/YYYY"
  onChange={handleChange}
  showMonthDropdown
  showYearDropdown
  dropdownMode="select"
  maxDate={new Date()}
  dateFormat="MM/dd/yyyy" // override if needed (default already this)
/>
```

---

## Examples

### 1. Generic Form Handler

```jsx
const initial = { start: null, end: null };
const [filters, setFilters] = useState(initial);

const handleChange = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));

<DatePicker name="start" value={filters.start} placeholder="Start" onChange={handleChange} />
<DatePicker name="end" value={filters.end} placeholder="End" minDate={filters.start} onChange={handleChange} />
```

---

## API

### `<DatePicker />`

| Prop          | Type                           | Required | Default | Description                                                                                                                        |
| ------------- | ------------------------------ | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | `string`                       | Yes      | —       | Used for the input `id` and emitted in `onChange.target.name`.                                                                     |
| `value`       | `Date \| null`                 | No       | `null`  | The currently selected date. Passed to `react-datepicker` as `selected`.                                                           |
| `placeholder` | `string`                       | No       | —       | Placeholder text (mapped to `placeholderText`).                                                                                    |
| `minDate`     | `Date`                         | No       | —       | Earliest selectable date.                                                                                                          |
| `disabled`    | `boolean`                      | No       | `false` | Disables the control & calendar icon.                                                                                              |
| `onChange`    | `(SyntheticEventLike) => void` | Yes      | —       | Called with `{ target: { name, value } }` where `value` is the chosen `Date` (or `null` if cleared when `isClearable` is enabled). |
| `...rest`     | any `react-datepicker` prop    | No       | —       | Forwarded untouched (e.g., `maxDate`, `showMonthDropdown`, `dateFormat`, etc.).                                                    |

**Built‑in defaults applied unless overridden via `...rest`:**

- `className="form-control"`
- `dateFormat={FormattingStrings.date}` (currently `MM/dd/yyyy`)
- `isClearable={false}`
- `showPopperArrow={false}`
- `customInput={<CustomInput />}`

### `<CustomInput />`

Used internally. It:

- Wraps the native `<input>` in an `InputGroup`.
- Adds a single append icon add‑on (Font Awesome calendar) that triggers the picker (`onClick`).
- Forwards every prop & the `ref` to the inner `<input>` (important for `react-datepicker` focus management).

You normally do **not** import or use this directly; override by supplying another `customInput` prop if bespoke behavior is needed.

---

## Event Contract

`onChange` deliberately mimics native input change events so existing generic handlers (e.g., `handleChange(e)`) work across text fields, selects, and the date picker alike.

Edge considerations:

- If you enable `isClearable`, the picker can emit `null`; ensure downstream code handles nullable dates.
- The returned `Date` is in the user’s local timezone; normalize (e.g., to UTC midnight) at the data layer if required for APIs.

---

## Dependencies

Direct / notable dependencies used internally:

- `react-datepicker` – Core calendar UI & popup logic
- `utils/dates` (`FormattingStrings.date`) – Centralized format string
- `features/ui/form-controls/input-group` – Layout & add‑on icon composition
- `configs/fontAwesomeConfig` – Calendar icon (`faCalendarDays`)

---

## Extensibility Tips

- Pass any prop from `react-datepicker` via `...rest` (e.g., `filterDate`, `showTimeSelect`).
- Override the date format (`dateFormat`) or provide a time variant (`dateTime`) if needed.
- Supply your own `customInput` to adjust layout or icons; maintain ref forwarding for focus.

---

## Testing Notes

Unit tests validate:

- Prop forwarding (`id`, `name`, `selected`, `placeholderText`, `minDate`, `disabled`)
- Event emission shape for `onChange`
- `CustomInput` add‑on rendering & click behavior
- Ref forwarding to the underlying `<input>`

When adding new behavior (e.g., time selection), ensure tests cover any altered defaults and maintain 100% coverage.

---

## Quick Reference

| Need                     | Approach                                      |
| ------------------------ | --------------------------------------------- |
| Generic form integration | Use unified `onChange` event shape            |
| Add dropdown month/year  | Pass `showMonthDropdown` / `showYearDropdown` |
| Allow clearing           | Add `isClearable` prop                        |
| Constrain range          | Use `minDate` / `maxDate`                     |
| Change format            | Override `dateFormat` prop                    |
| Custom UI                | Provide alternate `customInput`               |

---

Questions or enhancements? Open an issue / PR referencing this folder.
