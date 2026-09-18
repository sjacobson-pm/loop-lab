# Authentication Feature

This directory implements the application’s client‑side authentication integration (currently Microsoft Entra ID via MSAL) plus related UX and telemetry wiring.
It supplies:

- High‑level `<Authentication>` wrapper used near the app root
- A Microsoft specific login provider (`<MicrosoftLogin>`) that hosts MSAL context & templates
- Loading / progress experiences while auth flows execute
- Error UI with automatic Azure Application Insights exception tracking
- Helper utilities (`msalHelpers.js`) to obtain the signed‑in account, roles (extensible), and acquire tokens silently
- Helper utilities (`msalHelpers.js`) to obtain the signed‑in account, roles (extensible), and acquire tokens silently or via popup
- MSAL <-> App Insights bridge (`<MsalAppInsights>`) that stamps user identity into telemetry when authentication succeeds

> Scope: This README only documents the contents of `features/auth/` and intentionally omits project‑wide setup, environment variables, or deployment instructions. Those live in the project root documentation.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Summary](#summary)
- [Component / Utility Overview](#component--utility-overview)
- [Architecture \& Flow](#architecture--flow)
- [Components](#components)
  - [Authentication](#authentication)
  - [MicrosoftLogin](#microsoftlogin)
  - [MsalAppInsights](#msalappinsights)
  - [AuthInProgress](#authinprogress)
  - [MicrosoftAuthInProgress](#microsoftauthinprogress)
  - [Error](#error)
- [Utilities](#utilities)
  - [msalHelpers.js](#msalhelpersjs)
  - [msalInstance.js](#msalinstancejs)
- [Typical Usage Patterns](#typical-usage-patterns)
  - [1. Protect the Entire App](#1-protect-the-entire-app)
  - [2. Acquire an API Token in a Data Layer](#2-acquire-an-api-token-in-a-data-layer)
  - [3. Attach User Identity to Custom Telemetry](#3-attach-user-identity-to-custom-telemetry)
- [Extending (Roles, Other Identity Providers)](#extending-roles-other-identity-providers)
  - [Roles](#roles)
  - [Adding Another Provider](#adding-another-provider)
- [Testing Notes](#testing-notes)

## Summary

The authentication feature encapsulates Microsoft identity integration, progress & error UX, telemetry identity stamping, and token helper utilities behind a minimal `<Authentication>` abstraction.
Extend through new provider folders or by enriching `msalHelpers.js` (e.g., roles) without touching most consumers.

## Component / Utility Overview

| Item                                    | Type            | Responsibility                                                             | Key Exports                                                          |
| --------------------------------------- | --------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Authentication.jsx`                    | React component | Public wrapper for app auth; currently delegates to Microsoft provider     | `Authentication`                                                     |
| `microsoft/MicrosoftLogin.jsx`          | React component | Wires MSAL provider + auth template + telemetry + loading/error surfaces   | `MicrosoftLogin`                                                     |
| `microsoft/MsalAppInsights.jsx`         | React component | Subscribes to MSAL events; sets authenticated user context in App Insights | `MsalAppInsights`                                                    |
| `AuthInProgress.jsx`                    | React component | Generic “auth in progress” visual (icon + animated indicator)              | `AuthInProgress`                                                     |
| `microsoft/MicrosoftAuthInProgress.jsx` | React component | Microsoft‑flavored wrapper injecting MS icon into `AuthInProgress`         | `MicrosoftAuthInProgress`                                            |
| `microsoft/Error.jsx`                   | React component | Friendly error page + telemetry exception tracking                         | `Error`                                                              |
| `microsoft/msalHelpers.js`              | Utility module  | Convenience helpers (token acquisition, user & roles lookup)               | `acquireTokenSilent`, `acquireTokenPopup`, `getUser`, `getUserRoles` |
| `microsoft/msalInstance.js`             | MSAL config     | Configured `PublicClientApplication` instance                              | `msalInstance`                                                       |

---

## Architecture & Flow

High‑level render chain:

```plaintext
<Authentication>
  └─<MicrosoftLogin>
       └─<MsalProvider instance={msalInstance}>
            └─<MsalAppInsights>  // subscribes to LOGIN_SUCCESS & HANDLE_REDIRECT_END
                 └─<MsalAuthenticationTemplate>
                      • Renders children (your app) when authenticated
                      • Shows <MicrosoftAuthInProgress> while acquiring tokens / redirecting
                      • Shows <Error> if authentication fails
```

Telemetry considerations:

- `MsalAppInsights` sets the authenticated user context so subsequent traces & exceptions are user‑scoped.
- `Error` reports auth exceptions automatically via `trackException`.

---

## Components

### Authentication

Lightweight façade.
Intentionally thin so alternate identity providers (e.g., Okta, Auth0, Custom) can be slotted in later without refactoring call sites.

```jsx
// Example: wrap near the root (e.g., in App.jsx)
import { Authentication } from 'features/auth/Authentication';

export const AppShell = () => <Authentication>{/* Your existing routed application */}</Authentication>;
```

### MicrosoftLogin

Implements the Microsoft (MSAL) authentication surface using `MsalAuthenticationTemplate` with redirect interaction.

Key props wired internally:

- `interactionType: Redirect` – ensures full redirect login flow.
- `loadingComponent: <MicrosoftAuthInProgress />` – user feedback during redirects / token fetch.
- `errorComponent: <Error />` – consistent error UX + telemetry.

You normally never render this directly—use `<Authentication>` instead for abstraction.

### MsalAppInsights

Bridges MSAL events to Azure Application Insights user context.

Behavior:

- On `LOGIN_SUCCESS`: reads the returned account, lowercases `username`, and calls `appInsights.setAuthenticatedUserContext`.
- On `HANDLE_REDIRECT_END`: if accounts exist (i.e., page reload after redirect), again sets the context.
- Safely no‑ops if telemetry service returns `null`.

Example (standalone use):

```jsx
import { MsalAppInsights } from 'features/auth/microsoft/MsalAppInsights';

const WrapTelemetry = ({ children }) => <MsalAppInsights>{children}</MsalAppInsights>;
```

### AuthInProgress

Generic progress UI (centered layout, icon, animated arrow) used for any auth provider.

Props:

- `authTypeName: string` – Human friendly provider label (displayed in message).
- `authTypeIcon: IconDefinition` – FontAwesome icon to present.

```jsx
import { AuthInProgress } from 'features/auth/AuthInProgress';
import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

const { brandIcons } = fontAwesomeConfig;

<AuthInProgress authTypeName="Contoso" authTypeIcon={brandIcons.faMicrosoft} />;
```

### MicrosoftAuthInProgress

Specialization of `AuthInProgress` that hard‑codes provider specifics (label + icon). No props.

```jsx
import { MicrosoftAuthInProgress } from 'features/auth/microsoft/MicrosoftAuthInProgress';

<MicrosoftAuthInProgress />;
```

### Error

Renders an alert describing a Microsoft authentication failure and logs the underlying error exception to telemetry on mount.

Props (as provided by MSAL template):

- `error: AuthError` – error object passed by MSAL.

```jsx
import { Error as AuthErrorComponent } from 'features/auth/microsoft/Error';

// Normally consumed indirectly via MsalAuthenticationTemplate.
<AuthErrorComponent error={someMsalError} />;
```

Notes:

- Automatically calls `appInsights.trackException({ exception: error })`.
- Keeps messaging intentionally generic—customize only if you own consistent copy elsewhere.

---

## Utilities

### msalHelpers.js

Helper abstractions around the raw `msalInstance`.

Exports:

- `acquireTokenSilent(request)` – `async` wrapper returning MSAL’s `acquireTokenSilent` result.
- `acquireTokenPopup(request)` – `async` wrapper returning MSAL’s `acquireTokenPopup` result for interactive token acquisition via a browser popup.
- `getUser()` – Returns the first account from `msalInstance.getAllAccounts()` or `undefined` if none (caller should null‑check).
- `getUserRoles()` – Returns an (currently empty) object intended to expose boolean flags for role membership. Scaffolded for future expansion.
- `HelperMethods` class – Internal indirection enabling easier mocking of intra‑module calls (used in tests). Typically not imported directly by consumers.

Example: acquiring an access token for Microsoft Graph

```javascript
import { acquireTokenSilent, getUser } from 'features/auth/microsoft/msalHelpers';

async function fetchProfile() {
  const account = getUser();
  if (!account) throw new Error('User is not authenticated');

  const request = {
    account,
    scopes: ['User.Read'], // adjust to your resource scopes
  };

  const result = await acquireTokenSilent(request);
  return result.accessToken; // use with fetch/axios Authorization: Bearer <token>
}
```

If silent acquisition requires interaction (e.g., InteractionRequiredAuthError), fallback to popup:

```javascript
import { acquireTokenSilent, acquireTokenPopup, getUser } from 'features/auth/microsoft/msalHelpers';

async function fetchProfileWithFallback() {
  const account = getUser();
  if (!account) throw new Error('User is not authenticated');

  const request = { account, scopes: ['User.Read'] };

  try {
    const { accessToken } = await acquireTokenSilent(request);
    return accessToken;
  } catch (err) {
    // Some errors (e.g., interaction required) demand user interaction.
    const { accessToken } = await acquireTokenPopup(request);
    return accessToken;
  }
}
```

Role expansion (future):

```javascript
// msalHelpers.js (illustrative only)
// const roles = account.idTokenClaims?.roles ?? [];
// return { isAppAdmin: roles.includes(msalConfig.webApp.userRoles.applicationAdministrator) };
```

Edge Cases:

- `getUser()` may return `undefined` immediately after logout or prior to redirect completion.
- `acquireTokenSilent` will reject if no valid cached token: caller should catch and decide whether to trigger an interactive flow (handled automatically by upstream auth boundaries for basic page rendering).
- `acquireTokenPopup` opens a browser popup and often requires being triggered by a user gesture (click) to avoid popup blockers. Prefer calling it in direct response to user actions or rely on higher‑level flows that manage interaction for you.

### msalInstance.js

Holds a configured `PublicClientApplication` instance:

- Uses `localStorage` (`BrowserCacheLocation.LocalStorage`) for token/account cache.
- Reads `clientId` / `authority` from the central `msalConfig` (outside this folder) to keep environment-driven configuration centralized.

Direct usage is uncommon; rely on helpers unless low‑level control is required.

```javascript
import { msalInstance } from 'features/auth/microsoft/msalInstance';

const accounts = msalInstance.getAllAccounts();
```

---

## Typical Usage Patterns

### 1. Protect the Entire App

```jsx
// App.jsx
import { Authentication } from 'features/auth/Authentication';

export const App = () => (
  <Authentication>
    <AppRoutes />
  </Authentication>
);
```

### 2. Acquire an API Token in a Data Layer

```javascript
import { acquireTokenSilent, getUser } from 'features/auth/microsoft/msalHelpers';

export async function getAuthorizedClient() {
  const account = getUser();
  if (!account) throw new Error('No authenticated user');

  const { accessToken } = await acquireTokenSilent({
    scopes: ['api://YOUR_API_CLIENT_ID/.default'],
    account,
  });

  return (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });
}
```

### 3. Attach User Identity to Custom Telemetry

`MsalAppInsights` already sets user context. After auth completes you can log events and they will include `ai.user.id` / `ai.user.authUserId`.

```javascript
import { getAppInsights } from 'features/logging/appInsights/telemetryService';

const appInsights = getAppInsights();
appInsights?.trackEvent({ name: 'UserOpenedDashboard' });
```

---

## Extending (Roles, Other Identity Providers)

### Roles

1. Add role constants to `msalConfig.webApp.userRoles` (external config).
2. Uncomment & implement role extraction in `getUserRoles()`.
3. Export booleans for ergonomic conditional rendering (e.g., `userRoles.isAppAdmin`).
4. Add tests asserting correct mapping.

### Adding Another Provider

- Create `features/auth/<provider>/` parallel to `microsoft/`.
- Implement `<ProviderLogin>` component returning a similar provider+template structure.
- Update `Authentication.jsx` to conditionally select the provider based on configuration (feature flag / env).
- Provide a `<ProviderAuthInProgress>` variant if branding differs.

---

## Testing Notes

The folder includes purpose‑built mocks under `__mocks__/` simplifying unit tests:

- `microsoft/__mocks__/msalHelpers.js` – deterministic fake user / token data with reset helpers (`__resetMockUser`, etc.).
- `microsoft/__mocks__/msalInstance.js` – spies for `acquireTokenSilent` & `getAllAccounts`.
- `__mocks__/AuthInProgress.jsx` – lightweight stand‑in to avoid FontAwesome rendering overhead.

Patterns in test files demonstrate:

- Mocking MSAL & telemetry layers to isolate logic (`vi.mock('@azure/msal-react')`, etc.)
- Event callback simulation (see `MsalAppInsights.test.jsx` using a captured callback list)
- Error telemetry verification (see `Error.test.jsx`)

When writing new auth‑related tests:

- Keep Arrange / Act / Assert comment blocks for consistency.
- Favor resetting mock state via the provided `__reset*` helper methods.
