# Staff Autocomplete

StaffAutocomplete provides a ready-to-use React component for searching and selecting a staff member by name (or id), returning the selected staff id.
It wraps the shared `Autocomplete` control and wires it to the Staff API via lightweight hooks.
When initialized with an existing staff id, it resolves and displays the person’s preferred name automatically.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
  - [StaffAutocomplete](#staffautocomplete)
  - [Hook: useStaffSearch](#hook-usestaffsearch)
- [Examples](#examples)
- [API](#api)
  - [Props](#props)
  - [useStaffSearch() return](#usestaffsearch-return)
- [Dependencies](#dependencies)

## Usage

### StaffAutocomplete

Import and render as a controlled input.
You must provide `name`, `value`, and `onChange`.

```jsx
import { useState } from 'react';
import { StaffAutocomplete } from 'features/ui/form-controls/staff-autocomplete/StaffAutocomplete';

export function ExampleForm() {
  const [staffId, setStaffId] = useState(''); // stores the selected staff id

  const handleChange = (event) => {
    // event.displayTarget: what the user sees/typed (string)
    // event.valueTarget: the actual selected value (staff id)
    setStaffId(event.valueTarget?.value || '');
  };

  return (
    <form>
      <StaffAutocomplete name="approver" value={staffId} onChange={handleChange} placeholder="Search staff..." />
    </form>
  );
}
```

Notes

- Two inputs are rendered under the hood:
  - Display input name: `${name}--autocomplete`
  - Hidden value input name: `${name}--value` (contains the staff id)
- When `value` contains a valid staff id, the component fetches and displays the corresponding person’s name.

### Hook: useStaffSearch

For advanced scenarios (e.g., building a custom search experience) you can use the hook directly.

```jsx
import { useStaffSearch } from 'features/ui/form-controls/staff-autocomplete/hooks/useStaffSearch';

export function CustomStaffPicker() {
  const { staffSearchTerm, setStaffSearchTerm, isSearching, staffSearchResults, clearStaffSearchResults } =
    useStaffSearch();

  return (
    <div>
      <input
        value={staffSearchTerm}
        onChange={(e) => setStaffSearchTerm(e.target.value)}
        placeholder="Type a name..."
      />

      {isSearching && <div>Searching…</div>}

      <ul>
        {staffSearchResults.map((s) => (
          <li key={s.id}>
            {s.preferredFullName} ({s.id})
          </li>
        ))}
      </ul>

      <button type="button" onClick={clearStaffSearchResults}>
        Clear
      </button>
    </div>
  );
}
```

## Examples

- Basic controlled field with initial value

```jsx
function EditForm({ initialStaffId }) {
  const [id, setId] = useState(initialStaffId);
  return (
    <StaffAutocomplete
      name="reviewer"
      value={id}
      onChange={(e) => setId(e.valueTarget?.value || '')}
      disabled={false}
    />
  );
}
```

- Custom display text rendering (already built-in)
  The component renders suggestions as "Preferred Name (id)" and highlights matched text automatically.

## API

### Props

- `name` (string, required): Base name for the inputs.
- `value` (string, required): The selected staff id (empty string if none).
- `onChange` (function, required): Receives an `AutocompleteChangeEvent` with shape:
  - `displayTarget: { name: string, value: string }`
  - `valueTarget: { name: string, value: string }` // staff id
- `placeholder` (string, optional, default: "Type to search (at least 3 characters)...")
- `disabled` (boolean, optional, default: `false`)

### useStaffSearch() return

- `staffSearchTerm` (string)
- `setStaffSearchTerm(term: string)`
- `isSearching` (boolean)
- `staffSearchResults` (Array<{ id: string, preferredFullName: string }>)
- `clearStaffSearchResults()`

Behavior

- Requests up to 15 results (`id`, `preferredFullName`), sorted by name.
- Searching is enabled only when a non-empty term is set.

## Dependencies

- React (hooks)
- Internal: shared `Autocomplete` control and `highlightMatch` utility
- Internal: PM API query hooks for staff (`useStaffByIdQuery`, `useStaffCollectionQuery`)
  - Requires the app-level data layer (e.g., QueryClientProvider) configured as in the project setup.
