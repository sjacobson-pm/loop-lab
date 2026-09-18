# PM APIs (Plante Moran Internal APIs)

This directory contains modules for interacting with **Plante Moran–owned (first‑party) APIs**.
Code here centralizes authentication, URL construction, query key strategy, and React Query hooks so consuming components stay declarative and side‑effect free.

> [!NOTE]
> Integrations with **third‑party / external vendor APIs** belong in a separate location (not `pm-apis`).\
> This folder is strictly for PM platform & domain services exposed via APIM.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Contents](#contents)
- [Available APIs](#available-apis)
- [Design Overview](#design-overview)
  - [Goals](#goals)
  - [High-Level Flow](#high-level-flow)
- [Shared Module: `common.js`](#shared-module-commonjs)
  - [Internal Helper Methods](#internal-helper-methods)
    - [`HelperMethods.acquireToken(scopes: string[]): Promise<AuthResult>`](#helpermethodsacquiretokenscopes-string-promiseauthresult)
    - [`HelperMethods.buildResourceQueryParams({...}): string`](#helpermethodsbuildresourcequeryparams-string)
    - [`HelperMethods.buildUrl(baseUrl, apimPath, resourcePath, queryParams): string`](#helpermethodsbuildurlbaseurl-apimpath-resourcepath-queryparams-string)
  - [Exported Functions](#exported-functions)
    - [`deleteResource`](#deleteresource)
    - [`getResource`](#getresource)
    - [`getResourceCollection`](#getresourcecollection)
    - [`patchResource`](#patchresource)
    - [`postResource`](#postresource)
  - [Concurrency \& ETag Notes](#concurrency--etag-notes)
- [React Query Strategy](#react-query-strategy)
- [Usage Examples](#usage-examples)
  - [1. Consuming a Hook in a Component (Recommended)](#1-consuming-a-hook-in-a-component-recommended)
  - [2. Additional Staff Hooks](#2-additional-staff-hooks)
- [Adding a New PM API Resource](#adding-a-new-pm-api-resource)
- [Error Handling \& Edge Cases](#error-handling--edge-cases)
- [Testing Notes](#testing-notes)
- [Quick Reference](#quick-reference)
- [Future Enhancements (Optional)](#future-enhancements-optional)

## Contents

```text
pm-apis/
├── common.js               # Shared helpers (token acquisition, URL + query param builders, generic collection fetch)
└── central-data-store/
  └── root/
    └── staff/
      ├── staff.js          # Domain function: getStaffForAuthenticatedUser()
      └── queries.js        # TanStack Query hook + query keys
```

Additional API domains will follow the same pattern: `<api-name>/<resource-group>/<resource>/[resource files + queries]`.

---

## Available APIs

| Path                 | Endpoints     | Description                                                     |
| -------------------- | ------------- | --------------------------------------------------------------- |
| `central-data-store` |               | This is the Plante Moran Central Data Store API                 |
|                      | `/root/staff` | Staff directory data sourced from the Central Data Store (CDS). |

---

## Design Overview

### Goals

- Provide a **consistent, testable abstraction** over raw HTTP calls.
- Keep **authentication + cross‑cutting concerns** (headers, scopes, versioning, pagination header parsing) in one place.
- Expose **React Query hooks** for components; discourage calling low‑level Axios helpers directly in UI code.
- Enable **strong caching semantics** via structured query keys.

### High-Level Flow

1. A feature component calls a hook (e.g. `useAuthenticatedStaffQuery`).
2. The hook delegates to a domain function (e.g. `getStaffForAuthenticatedUser`).
3. The domain function constructs resource‑specific `searchParams` and calls the generic `getResourceCollection` in `common.js`.
4. `getResourceCollection` handles: token acquisition, query param assembly, URL building, HTTP GET, pagination header extraction.

This separation keeps concerns layered:

| Layer                        | Responsibility                                                      |
| ---------------------------- | ------------------------------------------------------------------- |
| Hook (`queries.js`)          | Query keys, cache policy, enabling flags, surface errors / status   |
| Domain function (`staff.js`) | Business filtering, field selection, transformation (first element) |
| Common (`common.js`)         | Auth, URL + query param composition, HTTP + pagination              |

---

## Shared Module: `common.js`

`common.js` exports:

### Internal Helper Methods

#### `HelperMethods.acquireToken(scopes: string[]): Promise<AuthResult>`

Silently acquires an access token for the given scopes using MSAL.
Automatically binds the currently authenticated account.

#### `HelperMethods.buildResourceQueryParams({...}): string`

Builds a query string (no leading `?`) from optional fields:
`apiVersion, pageSize, pageNumber, filter, searchQuery, orderBy, fields` — only defined values are included.
Values are URL encoded individually.

Example:

```js
HelperMethods.buildResourceQueryParams({
  apiVersion: 1,
  pageSize: 25,
  pageNumber: 2,
  filter: 'isActive eq true',
  orderBy: 'displayName asc',
  fields: 'id,displayName',
});
// => 'apiVersion=1&pageSize=25&pageNumber=2&filter=isActive%20eq%20true&orderBy=displayName%20asc&fields=id%2CdisplayName'
```

#### `HelperMethods.buildUrl(baseUrl, apimPath, resourcePath, queryParams): string`

Combines parts into a fully qualified URL using `url-join` semantics and sets the search string if provided.

Notes:

- `resourcePath` may include or omit a leading slash (e.g., `staff` or `/staff`). Both forms are supported.
- Empty values are handled as expected (e.g., no query string when `queryParams` is an empty string).

### Exported Functions

#### `deleteResource`

Deletes a resource using optimistic concurrency. Sends an `If-Match` header with the supplied `etag`.
Resolves with no return value.

Responsibilities:

- Acquire token
- Build URL + query params
- Issue `DELETE` with `Authorization`, `Accept`, `If-Match` headers

Example:

```js
await deleteResource(pmApiConfig.centralDataStore, '/lookups/widgets/123', { apiVersion: 1 }, widget.etag);
```

Common errors: `412 Precondition Failed` (stale ETag), `404 Not Found`.

#### `getResource`

Fetches a single resource. If the server returns an `ETag` header it is added to the returned object as `etag` to support later conditional updates.

Responsibilities:

- Acquire token
- Build URL + query params
- Issue `GET`
- Merge `etag` header (if present)

Example:

```js
const widget = await getResource(pmApiConfig.centralDataStore, '/lookups/widgets/123', {
  apiVersion: 1,
  fields: 'id,displayName',
});
```

#### `getResourceCollection`

Generic fetch for collection endpoints.

Responsibilities:

- Acquire token using `pmApiConfig.scopes`.
- Construct query params via `HelperMethods.buildResourceQueryParams`.
- Build full URL using the APIM base + `pmApiConfig.apimPath` + `path`.
- Perform `GET` with standard headers.
- Parse pagination metadata from `x-pagination` (JSON string expected).

> [!IMPORTANT]
> Prefer calling this through a domain function + React Query hook for caching and consistent error handling.

##### Pagination Metadata

Returned shape is standard across all PM APIs: `{ currentPage, pageSize, totalItemCount, totalPageCount }`.
Always inspect `pagination` before paging UI logic.

#### `patchResource`

Applies JSON Patch operations (RFC 6902) to a resource with optimistic concurrency via `If-Match` and returns the new ETag value.

Responsibilities:

- Acquire token
- Build URL + query params
- Issue `PATCH` with `application/json-patch+json`
- Return updated `etag` header

Example:

```js
const newEtag = await patchResource(
  pmApiConfig.centralDataStore,
  '/lookups/widgets/123',
  { apiVersion: 1 },
  widget.etag,
  [{ op: 'replace', path: '/displayName', value: 'Updated Name' }]
);
```

> [!TIP]
> Update or invalidate related query cache entries after a successful patch.

#### `postResource`

Creates (POST) a new resource and returns the created object.
Caller is responsible for cache invalidation (e.g. invalidate list query keys or optimistically insert into cache).

Responsibilities:

- Acquire token
- Build URL + query params
- Issue `POST` with JSON body
- Return created resource

Example:

```js
const created = await postResource(
  pmApiConfig.centralDataStore,
  '/lookups/widgets',
  { apiVersion: 1 },
  { displayName: 'New Widget' }
);
```

### Concurrency & ETag Notes

Helpers send the `If-Match` header with the entity tag wrapped in double quotes.
Provide an unquoted entity tag value to avoid double‑quoting.

- What you pass: the opaque ETag value without surrounding quotes (e.g., `abc123`)
- What the helper sends: `If-Match: "abc123"`

Important:

- `getResource` returns `etag` exactly as provided by the server (which may already include quotes).
- If the returned `etag` includes surrounding quotes, strip the quotes before passing it to `patchResource` or `deleteResource` to avoid `""etag""` being sent.
- Handle `412 Precondition Failed` by refetching the latest state (to get a fresh ETag) before retrying the mutation.

---

## React Query Strategy

Structured query keys convey resource hierarchy. Pattern:

```js
export const resourceKeys = {
  all: ['resource'],
  lists: () => [...resourceKeys.all, 'list'],
  list: (params = {}) => [...resourceKeys.lists(), params],
  details: () => [...resourceKeys.all, 'detail'],
  byId: (id) => [...resourceKeys.details(), id],
  ...
};
```

Benefits:

- Predictable cache invalidation (e.g. `queryClient.invalidateQueries(resourceKeys.details())`).
- Extensible for additional variants (e.g. `archived`, `stats`).
- Avoids accidental collisions vs ad-hoc string keys.

When adding a new API resource, replicate the pattern and add only keys you genuinely need.
Avoid speculative keys—they create maintenance burden.

Hook defaults used in this package:

- `staleTime`: 5 minutes (300,000 ms)
- `enabled`: true by default in the provided hooks
- `throwOnError`: false by default

---

## Usage Examples

### 1. Consuming a Hook in a Component (Recommended)

```jsx
import { useAuthenticatedStaffQuery } from 'apis/pm-apis/central-data-store/root/staff/queries';

function StaffBadge() {
  const { data: staff, isFetching } = useAuthenticatedStaffQuery();
  if (!staff) return null;
  return (
    <div className="tw:flex tw:items-center tw:gap-2">
      <span>{staff.preferredFullName}</span>
      {isFetching && <span className="tw:text-xs tw:opacity-60">(refreshing)</span>}
    </div>
  );
}
```

> [!WARNING]
> Using the generic fetcher directly in UI code bypasses standardized caching, makes error/loading states repetitive, and complicates refactors.
> Always consider a domain wrapper + hook first.

### 2. Additional Staff Hooks

Fetch a paged staff collection with optional filters/sorts/field projections:

```jsx
import { useStaffCollectionQuery } from 'apis/pm-apis/central-data-store/root/staff/queries';

function StaffTable() {
  const params = { pageSize: 25, pageNumber: 1, orderBy: 'displayName asc', fields: 'id,displayName,emailAddress' };
  const { data, isLoading, error } = useStaffCollectionQuery(params);

  if (isLoading) return <div>Loading…</div>;
  if (error) return <div>Failed to load</div>;

  const { data: rows, pagination } = data;
  return (
    <>
      <div>
        Page {pagination.currentPage} of {pagination.totalPageCount}
      </div>
      {/* render rows */}
    </>
  );
}
```

Fetch a single staff member by id (cached under a detail key):

```jsx
import { useStaffByIdQuery } from 'apis/pm-apis/central-data-store/root/staff/queries';

function StaffDetail({ id }) {
  const { data: staff, isFetching } = useStaffByIdQuery(id);
  if (!staff) return null;
  return (
    <div>
      <h2>{staff.preferredFullName}</h2>
      {isFetching && <small>Refreshing…</small>}
    </div>
  );
}
```

---

## Adding a New PM API Resource

1. Ensure a configuration object exists in `configs/apiConfig.js` with `apimPath` + `scopes`.
2. Create a directory mirroring domain taxonomy (e.g. `central-data-store/lookups/widgets`).
3. Add a domain file (e.g. `widgets.js`) exporting functions that call `getResourceCollection`, `getResource`, `postResource`, etc.
4. Add a `queries.js` defining query keys + hooks that wrap the domain functions.
5. Add a `mutations.js` if you need to perform writes (future enhancement).
6. Write tests mirroring existing patterns.
7. Export only what consumers need (avoid leaking helper internals).

Keep domain functions thin: construct params, call shared helper, shape the output.

---

## Error Handling & Edge Cases

- Missing / malformed `x-pagination` header: current implementation expects it. If an endpoint won’t paginate, enhance `getResourceCollection` to guard (`try/catch JSON.parse`) and default `pagination = null`.
- Empty collections: domain wrappers should decide whether to return `null`, `[]`, or throw. `getStaffForAuthenticatedUser` assumes at least one record after filtering; if none, it returns `undefined` — upstream code should defensively handle that.
- Token acquisition failures: MSAL may trigger an interactive flow outside silent path (depends on broader auth setup). Surface errors via React Query (`error` state) to display a user‑friendly message or redirect.
- Field projections: backends may reject unknown field names. Keep projections tight and validated.

---

## Testing Notes

Patterns illustrated in existing tests:

- **Mock isolation**: Each external module (`axios`, MSAL helpers, config) is mocked to assert interaction, not implementation.
- **Helper methods**: Unit tests enumerate inclusion/exclusion of query params to guarantee no accidental regressions.
- **Query hooks**: Render with `@testing-library/react`’s `renderHook` and assert `useQuery` args to lock cache key + staleTime semantics.

When adding new APIs, duplicate these patterns to maintain 100% coverage.

---

## Quick Reference

| Task                         | Where                                    |
| ---------------------------- | ---------------------------------------- |
| Build query params           | `HelperMethods.buildResourceQueryParams` |
| Get single resource          | `getResource`                            |
| Get resource collection      | `getResourceCollection`                  |
| Create resource              | `postResource`                           |
| Update resource (JSON Patch) | `patchResource`                          |
| Delete resource              | `deleteResource`                         |

---

## Future Enhancements (Optional)

- Add automatic retry / exponential backoff policy abstractions.
- Extend pagination parsing to gracefully handle absent headers.
- Provide a lightweight OpenAPI client generator wrapper once specifications are available.

---

Made with ❤️ for maintainable, testable internal API integration.
