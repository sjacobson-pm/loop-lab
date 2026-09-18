# Autocomplete

A reusable Autocomplete input built on top of `react-autosuggest`. It renders:

- A visible text input for the display value, and
- A hidden input for the actual selected value

The component is generic and works with any suggestion shape.
You provide how to fetch/clear suggestions, and how to render each suggestion.
It includes built‑in debouncing, a configurable minimum character threshold, and an optional loading spinner.

Key behaviors:

- Suggestions aren’t shown on focus; they appear only when the input length ≥ `minimumSearchChars`.
- Input changes emit a structured event containing both display and hidden value targets.
- Fetch requests are debounced by `searchDelayMs`.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
- [Examples](#examples)
  - [1) Basic async search (people)](#1-basic-async-search-people)
  - [2) Tuning search behavior](#2-tuning-search-behavior)
- [Dependencies](#dependencies)

## Usage

Import:

```jsx
import { Autocomplete } from 'features/ui/form-controls/autocomplete/Autocomplete';
import { highlightMatch } from 'features/ui/form-controls/autocomplete/utils/highlightMatch';
```

Props (most commonly used):

- `name` string (required): base name for inputs. The component derives:
  - display input name/id: `${name}--autocomplete`
  - hidden value input name/id: `${name}--value`
- `value` string: current selected value (hidden input)
- `displayValue` string: current display text (visible input)
- `placeholder` string
- `disabled` boolean (default: `false`)
- `minimumSearchChars` number (default: `3`)
- `searchDelayMs` number (default: `500`)
- `isLoading` boolean: shows a spinner when true
- `suggestions` array: items to render
- `suggestionTextPropName` string: which field to use as display text
- `suggestionValuePropName` string: which field to use as the underlying value
- `renderSuggestion` (suggestion, { query, isHighlighted }) => ReactNode
- `onChange` ({ displayTarget, valueTarget }) => void
- `onSuggestionsFetchRequested` (value: string) => void
- `onSuggestionsClearRequested` () => void

Change event shape:

```ts
{
  displayTarget: { name: string, value: string },
  valueTarget:   { name: string, value: string }
}
```

---

## Examples

### 1) Basic async search (people)

```jsx
import { useState } from 'react';
import { Autocomplete } from 'features/ui/form-controls/autocomplete/Autocomplete';
import { highlightMatch } from 'features/ui/form-controls/autocomplete/utils/highlightMatch';
// import { api } from 'utils/api'; // your data source

export function PeoplePicker() {
  const [fields, setFields] = useState({
    'person--autocomplete': '',
    'person--value': '',
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = ({ displayTarget, valueTarget }) => {
    setFields((prev) => ({
      ...prev,
      [displayTarget.name]: displayTarget.value,
      [valueTarget.name]: valueTarget.value,
    }));
  };

  const fetchSuggestions = async (query) => {
    if (!query) return;
    setLoading(true);
    try {
      // const results = await api.searchPeople(query);
      // Example shape: [{ id: '123', preferredFullName: 'Jane Doe' }, ...]
      const results = [];
      setSuggestions(results);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return (
    <Autocomplete
      name="person"
      value={fields['person--value']}
      displayValue={fields['person--autocomplete']}
      placeholder="Search people by name"
      isLoading={loading}
      suggestions={suggestions}
      suggestionTextPropName="preferredFullName"
      suggestionValuePropName="id"
      renderSuggestion={(s, { query }) => <div>{highlightMatch(s.preferredFullName, query)}</div>}
      onChange={handleChange}
      onSuggestionsFetchRequested={fetchSuggestions}
      onSuggestionsClearRequested={clearSuggestions}
    />
  );
}
```

### 2) Tuning search behavior

```jsx
<Autocomplete
  name="product"
  value={fields['product--value']}
  displayValue={fields['product--autocomplete']}
  placeholder="Find a product"
  suggestions={productSuggestions}
  isLoading={loading}
  minimumSearchChars={2}
  searchDelayMs={250}
  suggestionTextPropName="productName"
  suggestionValuePropName="sku"
  renderSuggestion={(p, { query }) => (
    <div>
      {highlightMatch(p.productName, query)} ({p.sku})
    </div>
  )}
  onChange={handleChange}
  onSuggestionsFetchRequested={fetchProductSuggestions}
  onSuggestionsClearRequested={() => setProductSuggestions([])}
/>
```

Notes:

- Manage `value` and `displayValue` in your component state. Use the provided `name` to map the derived input names.
- Provide stable `renderSuggestion` output; use `highlightMatch` to bold the query.

---

## Dependencies

- `react-autosuggest` — suggestion engine + keyboard interactions
- `@fortawesome/react-fontawesome` — loading spinner (configured via `configs/fontAwesomeConfig`)
- Internal utility: `utils/regex.escapeRegex` used by `utils/highlightMatch`

Styling: CSS class names are provided via `theme.js` and are expected to be styled by the app’s SCSS/CSS (e.g., React Autosuggest styles).
