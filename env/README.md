# Environment Configuration (`env/`)

This directory houses the **mode-specific environment variable files** used by Vite + React at build time.
Each file maps to a runtime "mode" (development, QA, staging, production, or local developer overrides).
Variables defined here are statically injected into the client bundle through `import.meta.env` and MUST be prefixed with `VITE_` (per Vite requirements) to be exposed to the browser.

> These files are not loaded dynamically at runtime; changing a value requires a rebuild (`npm run dev` restart or fresh build command).

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Files](#files)
- [Variable Reference](#variable-reference)
  - [`VITE__APIM__BASE_URL`](#vite__apim__base_url)
  - [`VITE__AZURE__APP_CLIENT_ID`](#vite__azure__app_client_id)
  - [`VITE__AZURE__APP_INSIGHTS_CONNECTION_STRING`](#vite__azure__app_insights_connection_string)
  - [`VITE__AZURE__TENANT_ID`](#vite__azure__tenant_id)
  - [`VITE__CDS__API_APP_ID_URI`](#vite__cds__api_app_id_uri)
  - [`VITE__CDS__APIM_PATH`](#vite__cds__apim_path)
- [Usage Patterns](#usage-patterns)
  - [Accessing Variables via Config Objects](#accessing-variables-via-config-objects)
  - [Direct Access (HIGHLY Discouraged)](#direct-access-highly-discouraged)
  - [Type Hinting (Optional)](#type-hinting-optional)
- [Conventions \& Guidance](#conventions--guidance)
- [Adding a New Variable](#adding-a-new-variable)
- [Troubleshooting](#troubleshooting)

## Files

| File               | Purpose                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `.env.local`       | Developer machine overrides (highest local precedence, NOT committed across teams ideally). Used for day‑to‑day local work. |
| `.env.development` | Shared defaults for the development environment. Fill placeholders before deploying shared dev services.                    |
| `.env.qa`          | Values for the QA environment.                                                                                              |
| `.env.staging`     | Values for staging/pre‑production.                                                                                          |
| `.env.production`  | Values for production.                                                                                                      |

All non-local files currently contain placeholder values (`"[fill-me-in]"`).
Replace them during environment provisioning.

## Variable Reference

Below are the environment variables defined across all modes.

### `VITE__APIM__BASE_URL`

Base URL of the Azure API Management (APIM) gateway (no trailing slash).
Used as the root when constructing REST calls.

Example values:

```plaintext
https://apim.dev.az.plantemoran.com
https://apim.qa.az.plantemoran.com
```

Referenced in: `src/configs/apiConfig.js` as `apiConfig.apimBaseUrl`.

Example usage:

```javascript
import { apiConfig } from 'configs/apiConfig';

const url = `${apiConfig.apimBaseUrl}${apiConfig.centralDataStore.apimPath}/staff`;
```

Notes:

- Avoid a trailing `/`; consumer code concatenates paths.
- Changing this requires a rebuild.

### `VITE__AZURE__APP_CLIENT_ID`

The Azure AD Application (client) ID for this front-end SPA.

Example:

```plaintext
00000000-0000-0000-0000-000000000001
```

Referenced in: `msalConfig.webApp.clientId`.

Example usage:

```javascript
import { msalConfig } from 'configs/msalConfig';
// msalConfig.webApp.clientId used when creating PublicClientApplication
```

Notes:

- Must match the registered SPA redirect URIs configured in Azure AD.

### `VITE__AZURE__APP_INSIGHTS_CONNECTION_STRING`

Azure Application Insights connection string for telemetry ingestion.

Example placeholder values:

```plaintext
InstrumentationKey=...;IngestionEndpoint=https://...;
```

Referenced in: `appInsightsConfig.connectionString`.

Example usage:

```javascript
import { appInsightsConfig } from 'configs/appInsightsConfig';
// Pass appInsightsConfig.connectionString into your App Insights setup module
```

Notes:

- Use a distinct resource per environment to keep telemetry isolated.
  Local development placeholder in repo: `LOCAL` ().
- Setting as `LOCAL` (in .env.local) will write the telemetry to the browser console.

### `VITE__AZURE__TENANT_ID`

Azure AD tenant GUID used to build the authority URL.

Referenced in: `msalConfig.webApp.authority` → `https://login.microsoftonline.com/${VITE__AZURE__TENANT_ID}`.

Example usage:

```javascript
import { msalConfig } from 'configs/msalConfig';
const authority = msalConfig.webApp.authority; // full HTTPS authority URL
```

Notes:

- Tenant changes invalidate existing cached tokens.

### `VITE__CDS__API_APP_ID_URI`

The Azure AD Application ID URI for the CDS API resource.
Used to construct OAuth2 scope strings.

Example (`.env.local`):

```plaintext
api://ea681abf-5f7c-4a16-b7c0-444c36c233dc
```

Referenced in: `apiConfig.centralDataStore.scopes` → `[` + `VITE__CDS__API_APP_ID_URI` + `/Staff_Read`]`.

Example usage (MSAL token acquisition):

```javascript
import { apiConfig } from 'configs/apiConfig';
import { msalInstance } from './wherever/msalInstance'; // illustrative

const request = { scopes: apiConfig.centralDataStore.scopes };
const token = await msalInstance.acquireTokenSilent(request);
```

Notes:

- Do not include a trailing `/`.
- Changing resource name changes all derived scopes; coordinate with API team.

### `VITE__CDS__APIM_PATH`

Relative APIM path segment for the Central Data Store (CDS) API.
Combined with `VITE__APIM__BASE_URL` to form full request URLs.

Example (`.env.local`):

```plaintext
/cds--api
```

Example usage:

```javascript
import { apiConfig } from 'configs/apiConfig';

const staffEndpoint = `${apiConfig.apimBaseUrl}${apiConfig.centralDataStore.apimPath}/staff`;
```

Notes:

- Should begin with `/`.
- No trailing slash unless intentionally creating a directory-style base.

## Usage Patterns

### Accessing Variables via Config Objects

Preferred: consume through the exported config modules to centralize logic.

```javascript
import { apiConfig } from 'configs/apiConfig';
import { msalConfig } from 'configs/msalConfig';
import { appInsightsConfig } from 'configs/appInsightsConfig';

console.log(apiConfig.apimBaseUrl);
console.log(msalConfig.webApp.clientId);
console.log(appInsightsConfig.connectionString);
```

### Direct Access (HIGHLY Discouraged)

You can access raw values when necessary:

```javascript
const baseUrl = import.meta.env.VITE__APIM__BASE_URL;
```

Prefer config wrappers to reduce scattered env lookups and ease future refactors (e.g., renaming or derived values).

### Type Hinting (Optional)

You may optionally define a `env.d.ts` (if using TypeScript later) to add typing:

```ts
interface ImportMetaEnv {
  readonly VITE__APIM__BASE_URL: string;
  readonly VITE__AZURE__APP_CLIENT_ID: string;
  readonly VITE__AZURE__APP_INSIGHTS_CONNECTION_STRING: string;
  readonly VITE__AZURE__TENANT_ID: string;
  readonly VITE__CDS__API_APP_ID_URI: string;
  readonly VITE__CDS__APIM_PATH: string;
}
```

## Conventions & Guidance

- Prefix segments separated by double underscores (`__`) group domain → sub-domain → detail (e.g., `VITE__AZURE__APP_CLIENT_ID`).
- All values are string-injected at build time; no runtime mutation.
- Never commit secrets you wouldn't ship to the browser—these variables are PUBLIC.
- If a value is missing at build time, the app may compile but fail at runtime; consider adding defensive checks in bootstrap code.
- Use consistent casing and don't rename without updating all consumer files.

## Adding a New Variable

1. Add it (with `VITE__` prefix) to each relevant `.env.*` file.
2. Reference it through a config module (preferred) instead of sprinkling `import.meta.env` usages.
3. Re-run the dev server or rebuild.
4. (Optional) Add validation in an initialization module to `throw` if required variables are unset.

Example validation pattern:

```javascript
const required = ['VITE__APIM__BASE_URL', 'VITE__AZURE__APP_CLIENT_ID'];

for (const key of required) {
  if (!import.meta.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`Missing required env var: ${key}`);
  }
}
```

## Troubleshooting

| Symptom                           | Likely Cause                                  | Fix                                                       |
| --------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| `undefined` env values in browser | Missing `VITE__` prefix                       | Rename var with prefix + rebuild                          |
| Stale values after edit           | Dev server caching                            | Stop and restart `npm run dev`                            |
| Wrong environment config          | Wrong build script / branch                   | Use environment-specific build (`npm run build:qa`, etc.) |
| 401 calling API                   | Incorrect scope (`VITE__CDS__API_APP_ID_URI`) | Verify App ID URI & exposed scopes in Azure AD            |
| No telemetry                      | `LOCAL` or empty connection string            | Supply correct connection string                          |

---

Maintainers: update this file when adding, renaming, or deprecating environment variables to keep configuration discoverable.
