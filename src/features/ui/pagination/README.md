# Pagination UI

Responsive, accessible pagination primitives used to navigate a multi‑page data set and adjust the active page size.
The feature provides:

- `<Pagination />` – composite control (page navigation + page size selector)
- `<PaginationItem />` – low‑level page / control button (number, icon, or both)
- `<PageSizeSelector />` & `<PageSizeSelectorItem />` – horizontal list to change the page size

Behavior highlights:

- Condenses on small screens: only first («), previous (<), current, next (>), last (») items show (page numbers & separators hidden via Bootstrap responsive classes).
- Large screens show a sliding numeric window around the current page plus optional leading / trailing ellipsis (`...`).
- Always shows all page numbers when the total page count is small enough.
- Pure presentational logic – caller owns data fetching and state management.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
- [Examples](#examples)
  - [A. Default (implicit defaults for `pageSizeOptions`)](#a-default-implicit-defaults-for-pagesizeoptions)
  - [B. Large Result Set (mid-range current page)](#b-large-result-set-mid-range-current-page)
- [Component APIs](#component-apis)
  - [`<Pagination />`](#pagination-)
  - [`<PaginationItem />` (internal)](#paginationitem--internal)
  - [`<PageSizeSelector />` (internal)](#pagesizeselector--internal)
  - [`<PageSizeSelectorItem />` (internal)](#pagesizeselectoritem--internal)
- [Dependencies](#dependencies)
- [Notes \& Best Practices](#notes--best-practices)

## Usage

Import using configured path aliases (relative shown here for clarity):

```jsx
import { Pagination } from 'features/ui/pagination/Pagination';

function Example() {
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Derive total pages from your data (server response, etc.)
  const totalItems = 1375;
  const totalPageCount = Math.max(1, Math.ceil(totalItems / pageSize));

  const handlePageChange = (page) => setCurrentPage(page);
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1); // usually reset to first page
  };

  return (
    <Pagination
      pageSizeOptions={[10, 25, 50, 100]}
      pageSize={pageSize}
      currentPage={currentPage}
      totalPageCount={totalPageCount}
      prePostItemCount={2}
      onPageItemClick={handlePageChange}
      onPageSizeItemClick={handlePageSizeChange}
    />
  );
}
```

## Examples

### A. Default (implicit defaults for `pageSizeOptions`)

```jsx
<Pagination
  pageSize={15}
  currentPage={1}
  totalPageCount={8}
  prePostItemCount={2}
  onPageItemClick={(p) => console.log('page ->', p)}
  onPageSizeItemClick={(s) => console.log('page size ->', s)}
/> // shows all pages because totalPageCount is small
```

### B. Large Result Set (mid-range current page)

```jsx
<Pagination
  pageSizeOptions={[25, 50, 100]}
  pageSize={50}
  currentPage={24}
  totalPageCount={100}
  prePostItemCount={3}
  onPageItemClick={fetchPage}
  onPageSizeItemClick={(s) => {
    updatePageSize(s);
    fetchPage(1);
  }}
/> // renders: 1 … 21 22 23 *24* 25 26 27 … 100
```

## Component APIs

### `<Pagination />`

| Prop                  | Type                     | Required | Default         | Description                                                                                    |
| --------------------- | ------------------------ | -------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `pageSizeOptions`     | `number[]`               | No       | `[10,15,25,40]` | Values rendered in the page size selector.                                                     |
| `pageSize`            | `number`                 | Yes      | –               | Currently selected page size.                                                                  |
| `currentPage`         | `number`                 | Yes      | –               | 1-based active page index.                                                                     |
| `totalPageCount`      | `number`                 | Yes      | –               | Total number of pages (>= 1).                                                                  |
| `prePostItemCount`    | `number`                 | Yes      | –               | Count of numeric page items shown before _and_ after the current page (sliding window radius). |
| `onPageItemClick`     | `(page: number) => void` | Yes      | –               | Invoked when a non-active page / control (first, prev, next, last) is clicked.                 |
| `onPageSizeItemClick` | `(size: number) => void` | Yes      | –               | Invoked when a different page size is chosen.                                                  |

Window math:

```text
SLIDING_BLOCK_ITEM_COUNT = 1 + prePostItemCount * 2
MAX_PAGE_ITEM_COUNT = SLIDING_BLOCK_ITEM_COUNT + 4  // first, last, two separators
```

If `totalPageCount <= MAX_PAGE_ITEM_COUNT` all pages are rendered (no ellipsis).
Otherwise first & last pages are always shown; low / high ellipsis appear unless the current page is near the respective edge.

### `<PaginationItem />` (internal)

| Prop                | Type               | Description                                        |
| ------------------- | ------------------ | -------------------------------------------------- |
| `label`             | `string \| number` | Textual label (page number or descriptor).         |
| `icon`              | `IconDefinition`   | Font Awesome icon (optional).                      |
| `swapLabelPosition` | `boolean`          | Renders icon before label when true.               |
| `title`             | `string`           | Tooltip / accessible title.                        |
| `isActivePage`      | `boolean`          | Adds active styling.                               |
| `disabled`          | `boolean`          | Adds disabled styling & prevents clicks.           |
| `className`         | `string`           | Additional Bootstrap / utility classes.            |
| `onClick`           | `() => void`       | Click handler (undefined when disabled or active). |

### `<PageSizeSelector />` (internal)

| Prop                  | Type                     | Description                               |
| --------------------- | ------------------------ | ----------------------------------------- |
| `pageSizeOptions`     | `number[]`               | Available page sizes.                     |
| `selectedPageSize`    | `number`                 | Current size (disabled + active styling). |
| `onPageSizeItemClick` | `(size: number) => void` | Change handler (receives chosen size).    |

### `<PageSizeSelectorItem />` (internal)

| Prop         | Type                     | Description                                    |
| ------------ | ------------------------ | ---------------------------------------------- |
| `label`      | `string \| number`       | Display text / number. Numbers are selectable. |
| `isActive`   | `boolean`                | Active styling.                                |
| `isDisabled` | `boolean`                | Disabled styling & blocks click.               |
| `onClick`    | `(size: number) => void` | Fired with numeric `label` when enabled.       |

## Dependencies

- React 19
- Bootstrap 5 classes for responsive + base styles (pagination + list-group)
- Font Awesome (icons pulled from `fontAwesomeConfig.classicSolidIcons`)

## Notes & Best Practices

- Always guard server queries with updated `currentPage` & `pageSize` after user actions.
- Reset `currentPage` to 1 when `pageSize` changes to avoid requesting an out-of-range page.
- Provide a stable `prePostItemCount` (2–4 works well for large sets). Very large values reduce the benefit of ellipsis.
- Ensure `totalPageCount` never drops below 1 to avoid empty renders.

---

This README documents only the pagination feature. For global project setup or contribution guidelines, see the root-level documentation.
