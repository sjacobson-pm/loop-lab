# Configs Directory

Centralized, environment-driven configuration objects used across the application (auth, telemetry, APIs, icons, shared constants).
These modules are intentionally:

- Pure (no React imports, minimal logic)
- Flat named exports (each file exports a single object)
- Safe to import anywhere (client-only)
- Backed by Vite `import.meta.env` variables resolved at build time

Each file focuses on shaping raw environment values into a cohesive object the rest of the codebase can consume.
All files include a `/* v8 ignore start */` directive because they are trivial value maps (covered indirectly by higher-level tests).

> [!Tip]
> If you alter or add environment variables, update the appropriate `env/.env.*` files.\
> Missing variables resolve to `undefined` at runtime – guard accordingly.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Files Overview](#files-overview)
- [`apiConfig.js`](#apiconfigjs)
  - [Usage](#usage)
  - [Notes](#notes)
- [`appInsightsConfig.js`](#appinsightsconfigjs)
  - [Usage](#usage-1)
  - [Notes](#notes-1)
- [`constants.js`](#constantsjs)
  - [Usage](#usage-2)
  - [Notes](#notes-2)
- [`fontAwesomeConfig.js`](#fontawesomeconfigjs)
  - [Usage](#usage-3)
  - [Notes](#notes-3)
- [`msalConfig.js`](#msalconfigjs)
  - [Usage](#usage-4)
  - [Notes](#notes-4)
- [`__mocks__/` Directory](#__mocks__-directory)
- [Import Patterns](#import-patterns)
- [Adding a New Config](#adding-a-new-config)
- [Validation \& Guarding](#validation--guarding)
- [Quick Reference](#quick-reference)

## Files Overview

| File                   | Purpose                                                                         | Primary Env Vars                                                            |
| ---------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `apiConfig.js`         | API base URL + service-specific paths & OAuth scopes                            | `VITE__APIM__BASE_URL`, `VITE__CDS__APIM_PATH`, `VITE__CDS__API_APP_ID_URI` |
| `appInsightsConfig.js` | Azure Application Insights connection settings                                  | `VITE__AZURE__APP_INSIGHTS_CONNECTION_STRING`                               |
| `constants.js`         | App name / abbreviation and future global constants                             | (none – manual values)                                                      |
| `fontAwesomeConfig.js` | Registers curated Font Awesome Pro kit & exports icon groups                    | (npm auth required for private kit)                                         |
| `msalConfig.js`        | Microsoft Entra ID (Azure AD) / MSAL client + authority + optional role mapping | `VITE__AZURE__APP_CLIENT_ID`, `VITE__AZURE__TENANT_ID`                      |
| `__mocks__/`           | Lightweight mocks of selected configs for isolated unit tests                   | N/A                                                                         |

---

## `apiConfig.js`

Shapes API platform metadata and service-specific values.
Keeps API path & scope formation consistent.

```js
export const apiConfig = {
  apimBaseUrl: import.meta.env.VITE__APIM__BASE_URL,
  centralDataStore: {
    apimPath: import.meta.env.VITE__CDS__APIM_PATH,
    scopes: [`${import.meta.env.VITE__CDS__API_APP_ID_URI}/Staff_Read`],
  },
};
```

### Usage

```js
import { apiConfig } from 'configs/apiConfig';
// or relative (from another file under src):
// import { apiConfig } from '../configs/apiConfig';

const base = apiConfig.apimBaseUrl; // e.g. https://apim.contoso.com
const cdsUrl = `${base}${apiConfig.centralDataStore.apimPath}`;
```

### Notes

- Scopes array values must match those configured on the protected resource (App Registration).
- If any env var is missing, derived URLs or scopes can become invalid. Validate early (e.g. during app bootstrap) if required.
- Keep this file declarative—avoid runtime branching beyond string shaping.

---

## `appInsightsConfig.js`

Minimal mapping of the Application Insights connection string.

```js
export const appInsightsConfig = {
  connectionString: import.meta.env.VITE__AZURE__APP_INSIGHTS_CONNECTION_STRING,
};
```

### Usage

```js
import { appInsightsConfig } from 'configs/appInsightsConfig';
import { telemetryService } from 'features/logging/appInsights/telemetryService';

telemetryService.initialize(appInsightsConfig.connectionString);
```

### Notes

- Special value `LOCAL` (convention) triggers console-only logging in the telemetry service (no network calls).
- If absent or empty, you may choose to skip telemetry initialization silently.

---

## `constants.js`

Source of project-wide _static_ identifiers.
Intent is to keep ad‑hoc string literals out of feature code.

```js
export const constants = {
  APP_NAME: 'My Product Name',
  APP_ABBR: 'MPN',
};
```

### Usage

```js
import { constants } from 'configs/constants';

document.title = `${constants.APP_NAME} – Dashboard`;
```

### Notes

- Replace placeholder values early in project bootstrap.
- Add new keys sparingly—prefer colocated constants when scope is narrow.
- Keep values serializable (no functions) for potential reuse in logging or telemetry contexts.

---

## `fontAwesomeConfig.js`

Centralizes Font Awesome Pro kit registration.
Importing this file _once_ is enough to register icons with the Font Awesome library (side-effect: `library.add(...all)`).

```js
import { library } from '@fortawesome/fontawesome-svg-core';
import { all } from '@awesome.me/kit-<kit-id>/icons';
// group re-exports
export const fontAwesomeConfig = { brandIcons, classicSolidIcons, classicRegularIcons };
```

### Usage

```jsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

const { classicSolidIcons } = fontAwesomeConfig;

export function DownloadButton() {
  return (
    <button type="button" className="btn btn-primary">
      <FontAwesomeIcon icon={classicSolidIcons.faDownload} /> Download
    </button>
  );
}
```

### Notes

- Private kit requires authenticated npm access (configured in workstation setup).
- Only import specific icon groups you actually render to aid tree‑shaking.
- For app‑specific icons, extend the object or create a sibling config (`fontAwesomeAppIconsConfig.js`) and document it here.

---

## `msalConfig.js`

Defines client application identity and authority for Microsoft Entra ID (Azure AD) sign‑in.
Contains an optional `userRoles` mapping for semantic role names used by the UI.

```js
export const msalConfig = {
  webApp: {
    clientId: import.meta.env.VITE__AZURE__APP_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE__AZURE__TENANT_ID}`,
    userRoles: {
      // example
      // applicationAdministrator: 'app-admins',
    },
  },
};
```

### Usage

```js
import { msalConfig } from 'configs/msalConfig';
import { PublicClientApplication } from '@azure/msal-browser';

const pca = new PublicClientApplication({
  auth: {
    clientId: msalConfig.webApp.clientId,
    authority: msalConfig.webApp.authority,
  },
});
```

Role helper example:

```js
const { userRoles } = msalConfig.webApp;
// if you've defined: applicationAdministrator: 'app-admins'
function isAppAdmin(account) {
  return account?.idTokenClaims?.roles?.includes(userRoles.applicationAdministrator);
}
```

### Notes

- `authority` is tenant-specific; multi-tenant patterns would differ (not covered here).
- Undefined env vars cause MSAL initialization errors—validate before constructing `PublicClientApplication`.
- Keep role keys semantic (consumer-friendly) and values aligned with App Registration role names.

---

## `__mocks__/` Directory

Contains simplified stand‑ins for selected configs used during unit testing to:

- Avoid invoking side-effectful code (e.g., icon library registration)
- Supply deterministic values without relying on real environment variables

Vitest will automatically use these when tests explicitly mock modules (`vi.mock('configs/fontAwesomeConfig')`, etc.).
Extend as new config files are added.

---

## Import Patterns

Preferred (via Vite alias defined in `vite.config.js`):

```js
import { msalConfig } from 'configs/msalConfig';
import { apiConfig } from 'configs/apiConfig';
```

Relative (fallback if alias path changes or in tooling scripts):

```js
import { msalConfig } from '../configs/msalConfig';
```

Tree‑shaking tip (ES modules): destructure only what you need:

```js
const { centralDataStore } = apiConfig;
```

---

## Adding a New Config

1. Create `someFeatureConfig.js` exporting a plain object: `export const someFeatureConfig = { ... }`.
2. Use only `import.meta.env.*` reads + static transforms (avoid async).
3. Document env vars inline with comments if not obvious.
4. If side effects are needed (e.g., library registration), keep them idempotent & tiny.
5. Add a brief section to this README (keep table sorted alphabetically).
6. (Optional) Add a mock in `__mocks__/` if tests need isolation.

---

## Validation & Guarding

Because Vite injects env variables at build time, _typoed names silently become `undefined`_. Consider:

```js
function assertConfigDefined(name, value) {
  if (!value) console.warn(`[config] Missing env var: ${name}`);
  return value;
}
const clientId = assertConfigDefined('VITE__AZURE__APP_CLIENT_ID', msalConfig.webApp.clientId);
```

For production hard failures, you can throw instead of warning.

---

## Quick Reference

- Keep objects flat & serializable.
- Avoid importing React, hooks, or browser APIs in config files.
- Document non-obvious environment variables.
- Prefer alias imports (`configs/...`).
- Extend with mocks for test determinism.

---

Maintained by the development team.
Update alongside any environment, authentication, or telemetry changes.
