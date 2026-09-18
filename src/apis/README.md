# APIs Folder

High‑level documentation for the `src/apis` directory.
This guide orients developers on structure, patterns, responsibilities, and how to add new API integrations.
It intentionally stays platform‑agnostic and does **not** repeat project‑wide setup, nor the resource‑specific details already documented inside sub‑folders (e.g. `pm-apis/`).

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Purpose](#purpose)
- [Principles](#principles)
- [Layering Model](#layering-model)
- [Typical Anatomy](#typical-anatomy)
- [Cross-Cutting Concerns](#cross-cutting-concerns)
  - [Authentication / Tokens](#authentication--tokens)
  - [Base URLs \& Configuration](#base-urls--configuration)
  - [Query Parameter Construction](#query-parameter-construction)
  - [Optimistic Concurrency (ETags)](#optimistic-concurrency-etags)
  - [Error Handling](#error-handling)
  - [Caching \& React Query](#caching--react-query)
- [Naming Conventions](#naming-conventions)
- [Adding a New API Domain](#adding-a-new-api-domain)
- [Designing Domain Functions](#designing-domain-functions)
- [Designing Query Hooks](#designing-query-hooks)
- [Mutation Guidelines](#mutation-guidelines)
- [Testing Patterns](#testing-patterns)
- [Security \& Hardening Notes](#security--hardening-notes)
- [FAQ / Decision Log](#faq--decision-log)
- [Future Enhancements](#future-enhancements)

## Purpose

Provide a **consistent, testable abstraction** over HTTP / API interactions so UI components remain declarative and side‑effect free.
Each subdirectory under `apis/` owns a _bounded domain_ (first‑party or third‑party) and exposes:

1. **Domain functions** (pure async functions performing network calls & shaping data)
2. **React Query hooks** (caching, status lifecycle, retries)
3. **(Optional) Mutations** for create/update/delete operations

> [!NOTE]
> Resource‑ or vendor‑specific deep dives live **inside that domain's folder** (`README.md` local to the domain).
> This file stays intentionally high‑level.

---

## Principles

- **Single Responsibility**: Domain function does _one_ network call (or a clearly related sequence) and returns shaped data.
- **Local Knowledge, Global Reuse**: Shared helpers (URL building, token acquisition, query param assembly) live close to where they are used but remain generic.
- **Predictable Caching**: Structured query keys; avoid ad‑hoc strings.
- **Least Surface**: Export only what downstream code truly needs; keep helpers internal unless reuse is proven.
- **Deterministic Tests**: All external IO mocked; tests assert _interaction contracts_ (arguments, headers, key structure) and returned shapes.
- **Easily Extensible**: Adding a new resource should be copy‑paste predictable.

---

## Layering Model

| Layer                           | Responsibility                                          | Examples                           |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| Config (`configs/apiConfig.js`) | Base URLs, scopes, per‑API constants                    | `apiConfig.myService.scopes`       |
| Low‑Level Helpers               | Token acquisition, URL + query param composition        | `buildUrl()`, `buildQueryParams()` |
| Domain Functions                | Shape inputs -> call helpers -> shape outputs           | `getCurrentUserProfile()`          |
| Query Hooks                     | Cache keys, stale times, enabled flags, error surfacing | `useCurrentUserProfileQuery()`     |
| UI Components                   | Render data / states (no axios, no tokens)              | `ProfileHeader.jsx`                |

---

## Typical Anatomy

```plaintext
apis/
  <domain-name>/
    README.md              # Domain specific notes (omitted here)
    common.js              # (Optional) shared helpers / generic CRUD wrappers
    <resource>/
      <resource>.js        # Domain function(s)
      queries.js           # React Query hooks + keys
      mutations.js         # (Optional) React Query mutations
      __mocks__/           # Test doubles (Vitest)
      *.test.js            # Unit tests
```

> [!TIP]
> Prefer _flat, descriptive_ resource paths (`users/`, `invoices/`, `catalog/items/`).
> Avoid deep nesting unless it reflects a real API hierarchy.

---

## Cross-Cutting Concerns

### Authentication / Tokens

Tokens are silently acquired (e.g., MSAL silent flow) using scope arrays defined in configuration.
Token retrieval must be _centralized_ so tests can mock it in one place.

### Base URLs & Configuration

The root config (`apiConfig`) exposes per‑API objects containing, for example (a pm-api‑style service):

```js
apiConfig = {
  myService: {
    apimPath: '/my-service--api',
    scopes: ['<guid>/access_as_user'],
  },
  // ...
};
```

Domain code receives the relevant config object rather than hard‑coding strings (improves portability and testability).

### Query Parameter Construction

Use a dedicated helper to build & URL‑encode optional params (only include keys with non‑undefined values).
This prevents ad‑hoc string concatenation and simplifies regression testing.

```js
const query = buildQueryParams({ apiVersion: 1, pageSize: 25, filter: 'isActive eq true' });
// => 'apiVersion=1&pageSize=25&filter=isActive%20eq%20true'
```

### Optimistic Concurrency (ETags)

When the service returns an `ETag` header for single‑resource reads, propagate it (e.g., append `etag` to the returned object) so update/delete helpers can send `If-Match`.
Handle `412 Precondition Failed` by refetching and prompting user to retry.

### Error Handling

Keep low‑level helpers “dumb”: let errors bubble.
React Query hooks surface `error` and `isError`; components decide presentation.
For _expected_ edge cases (e.g., 404 for optional lookup) domain functions can translate to `null` to simplify UI logic—document such transformations.

### Caching & React Query

Structured key pattern (example):

```js
export const widgetKeys = {
  all: ['widgets'],
  lists: () => [...widgetKeys.all, 'list'],
  list: (params = {}) => [...widgetKeys.lists(), params],
  details: () => [...widgetKeys.all, 'detail'],
  byId: (id) => [...widgetKeys.details(), id],
};
```

Benefits: deterministic invalidation and collision avoidance. Only add variants you use.

---

## Naming Conventions

- **Files**: `queries.js`, `mutations.js`, `<resource>.js` (resource plural or semantic, e.g., `staff.js`, `widgets.js`).
- **Domain Functions**: Verb + Noun (`getWidget`, `getWidgets`, `postWidget`, `patchWidget`).
- **Hooks**: `use` + Semantic + `Query` / `Mutation` (`useWidgetQuery`, `useWidgetsQuery`).
- **Query Keys**: Plural base noun at index 0 (`['widgets', ...]`).
- **Mocks**: Mirror file name under `__mocks__/` (auto‑picked by Vitest + ES module mocks).

---

## Adding a New API Domain

1. **Configuration**: Add a config entry (e.g. `apimPath`, `scopes`, optional feature flags) in `configs/apiConfig.js`.
2. **Directory**: Create `apis/<domain-name>/`.
3. **Helpers (optional)**: If multiple resources share headers / URL logic, add a `common.js` there.
4. **Resource Module(s)**: Implement domain functions (pure, parameterized, minimal internal branching).
5. **Query Hooks**: Add `queries.js` with structured key builder + hooks wrapping domain functions.
6. **Mutations**: Add `mutations.js` if create/update/delete operations exist; handle cache invalidation.
7. **README.md (domain)**: Document domain‑specific endpoints and nuances (leave this high‑level file unchanged).
8. **Tests**: Add unit tests for helpers, domain functions, and hook configuration.
9. **Exports**: Re‑export only the hooks/functions needed by consumers (avoid leaking implementation helpers).

---

## Designing Domain Functions

Keep them small:

```js
export async function getWidget(id) {
  const params = { apiVersion: 1, fields: 'id,name,status' };
  const path = `widgets/${id}`;
  return await getResource(apiConfig.myService, path, params); // returns shaped object (+etag if present)
}
```

Guidelines:

- Accept **explicit arguments** (avoid closing over global state unless unavoidable, e.g., current user id).
- Construct `searchParams` locally and pass them to helper.
- Shape return value minimally—avoid premature mapping unless it simplifies _all_ consumers.
- Never swallow non‑expected errors silently.

---

## Designing Query Hooks

```js
export const useWidgetQuery = (id, options = {}) =>
  useQuery({
    queryKey: widgetKeys.byId(id),
    queryFn: () => getWidget(id),
    staleTime: 5 * 60 * 1000, // 5m (adjust to volatility)
    ...options,
  });
```

Recommendations:

- Provide sane `staleTime` aligned with data volatility.
- Accept optional `enabled` prop for dependent queries.
- Forward React Query's `throwOnError` only when caller intentionally uses error boundaries.
- Avoid embedding component concerns (formatting, derived labels) inside hooks—leave that to selectors or components.

---

## Mutation Guidelines

Pattern:

```js
export const useCreateWidgetMutation = () =>
  useMutation({
    mutationFn: (payload) => postResource(apiConfig.myService, 'widgets', { apiVersion: 1 }, payload),
    onSuccess: (_data, _vars, ctx) => {
      queryClient.invalidateQueries(widgetKeys.lists());
    },
  });
```

Consider:

- **Optimistic Updates** only when rollback logic is trivial and user benefit is clear.
- Cache invalidation should target the narrowest necessary key scope (`details()` vs entire `all`).
- Surface concurrency conflicts (412) with a distinct message (“This record was updated elsewhere”).

---

## Testing Patterns

| Concern                | Strategy                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Helpers (URL / params) | Table‑driven tests asserting inclusion/exclusion rules                                       |
| Domain functions       | Mock axios + config + token helper; assert constructed URL/headers & shaped return           |
| Query hooks            | Mock `useQuery` / `useMutation`; assert key + options; ensure passthrough of returned object |
| Mocks                  | Provide `__resetMock*` methods to restore default deterministic state between tests          |

Additional notes:

- Keep fixture generators (faker) close to tests for readability.
- Use explicit `expect.objectContaining` for partial shape assertions to stay resilient to additive fields.

---

## Security & Hardening Notes

- Never log raw access tokens or authorization headers.
- Guard against accidental double‑encoding of query params (encode individual values only once).
- Treat ETag values as opaque; do not parse weak vs strong client‑side.
- Validate user‑controlled inputs before building filter expressions (avoid injection into OData‑like query syntaxes if applicable).

---

## FAQ / Decision Log

**Why not generate a full OpenAPI client?**  
Spec stability + incremental adoption. Helpers give agility while specs mature. Generation can be layered in later without rewriting hooks.

**Why pass config object each call instead of importing globally?**  
Improves testability (can inject alt endpoints/scopes) and supports multi‑tenant / multi‑API scenarios.

**Why structured query keys?**  
Deterministic cache invalidation and avoidance of subtle collisions across unrelated features.

---

## Future Enhancements

- Shared retry / backoff policy abstraction.
- Automatic pagination helpers (`useInfiniteQuery` wrappers).
- OpenAPI / JSON Schema generated types & clients when specs are stable.
- Central error taxonomy (mapping HTTP status → domain error objects).
- Observability hooks (duration, success/failure counters) integrated with telemetry layer.

---

Made with care for maintainable, predictable API integration.
