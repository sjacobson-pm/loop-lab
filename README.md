# FakeAPI Web Front-End (Vite + React 19)

<div align="center">

React web front-end for FakeAPI.

[![Linting][img--gh-action-badge--linting]][gh-action--linting]
[![Dependency Review][img--gh-action-badge--dependency-review]][gh-action--dependency-review]
[![CodeQL][img--gh-action-badge--codeql]][gh-action--codeql]

[![Build/Deploy - DEV][img--gh-action-badge--build-deploy--dev]][gh-action--build-deploy]
[![Build/Deploy - QA][img--gh-action-badge--build-deploy--qa]][gh-action--build-deploy]
[![Build/Deploy - STAGE][img--gh-action-badge--build-deploy--stage]][gh-action--build-deploy]
[![Build/Deploy - PROD][img--gh-action-badge--build-deploy--prod]][gh-action--build-deploy]
[![Unit Tests][img--gh-action-badge--unit-tests]][gh-action--unit-tests]
[![Code Coverage][img--badge--codecov]][codecov-details]

</div>

---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Project Overview 🧭](#project-overview-)
- [Features ✨](#features-)
- [Tech Stack 🧱](#tech-stack-)
- [Libraries \& Runtime Packages 📦](#libraries--runtime-packages-)
- [FontAwesome 🖼️](#fontawesome-️)
  - [PM Common Icons Font Awesome Pro Kit](#pm-common-icons-font-awesome-pro-kit)
  - [Application-Specific Icons](#application-specific-icons)
  - [Usage Example](#usage-example)
- [React Compiler 🧠](#react-compiler-)
- [Installation 🛠️](#installation-️)
- [Usage 🚀](#usage-)
- [Project Structure 🗂️](#project-structure-️)
- [Testing ✅](#testing-)
- [Deployment 🌐](#deployment-)
- [Contributing 🤝](#contributing-)

## Project Overview 🧭

FakeAPI is a modern React application.
It includes opinionated setup for UI, state, data fetching, authentication, telemetry, testing, and code quality — so teams can focus on features rather than wiring.

Key capabilities:

- Secure sign-in with Microsoft Entra ID (Azure AD) via MSAL
- Client-side routing with nested layouts
- Observability via Azure Application Insights (with local-only logging mode)
- Strong DX: fast Vite dev server (HTTPS), module aliases, and hot reloading

## Features ✨

- React 19 with React Compiler plugin and Vite 7
- Styling: Tailwind CSS v4 (utility prefix `tw:`, preflight disabled) + Bootstrap 5 + React Bootstrap + SCSS theming
- Routing: React Router v7 with nested routes and a not-found page
- Data: TanStack Query v5 with DevTools
- State: Zustand for lightweight state management
- Auth: MSAL (browser + react) using env-driven config
- Telemetry: Azure Application Insights with React plugin and local console logging when connection string is `LOCAL`
- Testing: Vitest + React Testing Library + Jest-DOM; coverage via V8
- Code quality: ESLint, Stylelint, Markdownlint, Prettier (with Tailwind plugin)
- Aliased imports: `configs`, `features`, `pages`, `hooks`, `utils`, `store`, `testing`

## Tech Stack 🧱

- Build/Tooling: Vite 7, @vitejs/plugin-react, @tailwindcss/vite
- Framework: React 19, React Router 7
- UI: Tailwind CSS 4, Bootstrap 5.3, React Bootstrap, React Autosuggest
- Data/State: @tanstack/react-query 5, Zustand
- Network: Axios
- Utilities: date-fns
- Auth: @azure/msal-browser, @azure/msal-react
- Telemetry: @microsoft/applicationinsights-web, @microsoft/applicationinsights-react-js
- Testing: Vitest, @testing-library/react, @testing-library/jest-dom, jsdom
- Lint/Format: ESLint 9, Stylelint 16, Markdownlint, Prettier 3

## Libraries & Runtime Packages 📦

This is a list of runtime libraries and packages used in the project.
Sourced from package.json "dependencies" (update this list when adding/removing runtime libs).

Core:

- React: <https://react.dev/reference>
- React DOM: <https://react.dev/reference/react-dom>

Routing:

- React Router DOM: <https://reactrouter.com/home>

State & Data:

- TanStack Query (@tanstack/react-query): <https://tanstack.com/query/latest/docs>
- Zustand: <https://zustand.docs.pmnd.rs>

HTTP:

- Axios: <https://axios-http.com/docs/intro>

Authentication:

- MSAL Browser (@azure/msal-browser): <https://github.com/AzureAD/microsoft-authentication-library-for-js>
- MSAL React (@azure/msal-react): <https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react>

Telemetry / Observability:

- Application Insights Core (@microsoft/applicationinsights-web): <https://github.com/microsoft/ApplicationInsights-JS>
- Application Insights React Plugin (@microsoft/applicationinsights-react-js): <https://github.com/microsoft/applicationinsights-react-js>

UI / Styling:

- Tailwind CSS: <https://tailwindcss.com/docs>
- Bootstrap: <https://getbootstrap.com/docs>
- React Bootstrap: <https://react-bootstrap.github.io/docs/getting-started/introduction>

UI / Components:

- React Autosuggest: <https://github.com/moroshko/react-autosuggest>
- React Datepicker: <https://github.com/Hacker0x01/react-datepicker>

Utilities:

- date-fns: <https://date-fns.org/docs/Getting-Started>
- url-join: <https://github.com/jfromaniello/url-join>
- useHooks (@uidotdev/usehooks): <https://usehooks.com>

Icons:

- Font Awesome (Pro kit via private registry): <https://docs.fontawesome.com/web/use-with/react/add-icons> (configured in fontAwesomeConfig.js)

> [!NOTE]
> Dev-only tooling (Vite, ESLint, Vitest, etc.) excluded.\
> Tailwind CSS listed above intentionally although primarily a build-time utility framework.

## FontAwesome 🖼️

Icons are centrally registered in: `src/configs/fontAwesomeConfig.js`.

### PM Common Icons Font Awesome Pro Kit

This project uses the _**PM Common Icons**_ Font Awesome Pro kit (curated subset) to minimize bundle size while keeping a consistent icon vocabulary across apps.
The _**PM Common Icons**_ Font Awesome Pro kit is available for use in all PM applications and includes the following icons from the Font Awesome Pro library, organized by style and category.

Style prefixes:

- Solid: fas
- Regular: far
- Brands: fab

Icons in the kit:

Brands (fab):

- [microsoft](https://fontawesome.com/icons/microsoft?f=brands&s=brands)

Classic Regular (far):

- [compass](https://fontawesome.com/icons/compass?f=classic&s=regular)
- [face-frown](https://fontawesome.com/icons/face-frown?f=classic&s=regular)

Classic Solid (fas):

- [angle-left](https://fontawesome.com/icons/angle-left?f=classic&s=solid)
- [angle-right](https://fontawesome.com/icons/angle-right?f=classic&s=solid)
- [angles-left](https://fontawesome.com/icons/angles-left?f=classic&s=solid)
- [angles-right](https://fontawesome.com/icons/angles-right?f=classic&s=solid)
- [bars](https://fontawesome.com/icons/bars?f=classic&s=solid)
- [calendar-days](https://fontawesome.com/icons/calendar-days?f=classic&s=solid)
- [caret-down](https://fontawesome.com/icons/caret-down?f=classic&s=solid)
- [caret-up](https://fontawesome.com/icons/caret-up?f=classic&s=solid)
- [circle-info](https://fontawesome.com/icons/circle-info?f=classic&s=solid)
- [circle-plus](https://fontawesome.com/icons/circle-plus?f=classic&s=solid)
- [circle-question](https://fontawesome.com/icons/circle-question?f=classic&s=solid)
- [circle-xmark](https://fontawesome.com/icons/circle-xmark?f=classic&s=solid)
- [download](https://fontawesome.com/icons/download?f=classic&s=solid)
- [ellipsis](https://fontawesome.com/icons/ellipsis?f=classic&s=solid)
- [gear](https://fontawesome.com/icons/gear?f=classic&s=solid)
- [message-lines](https://fontawesome.com/icons/message-lines?f=classic&s=solid)
- [moon-stars](https://fontawesome.com/icons/moon-stars?f=classic&s=solid)
- [pen-to-square](https://fontawesome.com/icons/pen-to-square?f=classic&s=solid)
- [right-to-bracket](https://fontawesome.com/icons/right-to-bracket?f=classic&s=solid)
- [rotate-right](https://fontawesome.com/icons/rotate-right?f=classic&s=solid)
- [sliders](https://fontawesome.com/icons/sliders?f=classic&s=solid)
- [spinner](https://fontawesome.com/icons/spinner?f=classic&s=solid)
- [square-check](https://fontawesome.com/icons/square-check?f=classic&s=solid)
- [sun-bright](https://fontawesome.com/icons/sun-bright?f=classic&s=solid)
- [timeline-arrow](https://fontawesome.com/icons/timeline-arrow?f=classic&s=solid)
- [triangle-exclamation](https://fontawesome.com/icons/triangle-exclamation?f=classic&s=solid)

### Application-Specific Icons

This project may require additional icons specific to its functionality.
In these cases, you can request an application-specific kit to be created (via the AppDev Admins).
The application-specific kit can then be added to the `fontAwesomeConfig.js` file along with the PM Common Icons kit.

If an application-specific kit is added to this project, update this section and document the icons included in the kit just as the PM Common Icons kit is documented above.

### Usage Example

Usage example (solid download icon):

```jsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

...

// destructure only what you need
const { classicSolidIcons } = fontAwesomeConfig;

...

<FontAwesomeIcon icon={classicSolidIcons.faDownload} />;
```

## React Compiler 🧠

This project enables the React Compiler (aka “React Forget”) via the Vite React plugin’s Babel option.
See `vite.config.js` where `@vitejs/plugin-react` is configured with `babel-plugin-react-compiler`.

What you get:

- Automatic memoization of pure components and values derived from props/state, reducing unnecessary re-renders.
- Stable function/object identities across renders in common cases without hand-written wrappers.
- Simpler components: focus on correctness and purity; the compiler handles many perf details.

What you usually no longer need to do by hand:

- Wrap components with `React.memo` just to avoid re-renders.
- Sprinkle `useMemo` or `useCallback` to stabilize values/handlers that are purely derived from props/state.

Learn more:

- React Compiler overview: <https://react.dev/learn/react-compiler>

## Installation 🛠️

Prerequisites:

> [!NOTE]
> Always be sure to use **_only_** approved versions from the [Developer Workstation Configuration][developer-workstation-config-docs] guide.

- Git
- NVM
- Node.js >= 22.15 (LTS recommended)
- npm >= 10.9
- Chocolatey CLI >= 2.5
- VS Code
  - This includes all recommended VS Code extensions (included in /.vscode/extensions.json)

1. Install dependencies

   ```powershell
   npm ci  # or: npm install
   ```

1. Environment variables (Vite loads from ./env)

   The env files live in the `env/` directory (configured via `vite.config.js > envDir`).
   - `env/.env.development` (for the dev build)
   - `env/.env.qa` (for the qa build)
   - `env/.env.staging` (for the staging build)
   - `env/.env.production` (for the production build)

   Create your personal `env/.env.local` file (used by `npm run dev` when running locally).

   See [env/README.md](env/README.md) for details on the env files and variables.

1. HTTPS dev server certificates

   The dev server is configured for HTTPS and expects files at `.cert/localhost-key.pem` and `.cert/localhost-cert.pem`.
   - Install `mkcert` from an elevated/admin shell
     - `choco install mkcert`
   - Setup mkcert from an elevated/admin shell (creates a CA)
     - `mkcert -install`
   - Navigate to the root of this repo and execute the following commands
     - `mkdir .cert`
     - `mkcert -key-file ./.cert/localhost-key.pem -cert-file ./.cert/localhost-cert.pem "localhost"`
     - **NOTE**: The `.cert` folder is excluded from source control.
     - **NOTE**: These files should be treated just like passwords.
     - **NEVER COMMIT THESE FILES TO SOURCE CONTROL**

1. Font Awesome Pro Configuration
   - If you have not already setup your workstation's npm configuration for font awesome pro, follow these steps
     - Get your font awesome token from your personal key vault.
       - If you don't have a token in your key vault, you can request one be added by the AppDev admins.
     - Open PowerShell
     - Navigate to your user profile folder
       - `cd $env:USERPROFILE`
     - Execute the following commands
       - `npm config set "@awesome.me:registry" https://npm.fontawesome.com/`
       - `npm config set "@fortawesome:registry" https://npm.fontawesome.com/`
       - `npm config set "//npm.fontawesome.com/:_authToken" <your-font-awesome-token>`

## Usage 🚀

Local development:

```powershell
npm run dev  # starts Vite with mode "local-dev" and HTTPS
```

Builds (env-specific):

```powershell
# Lint runs automatically via prebuild scripts
npm run build:dev
npm run build:qa
npm run build:stage
npm run build:prod  # production build to ./dist
```

Preview a production build locally:

```powershell
npm run preview  # serves ./dist
```

Formatting and linting:

```powershell
# Formatting (Windows)
npm run format:win
npm run format:win:check-only

# Formatting (Linux)
npm run format:linux
npm run format:linux:check-only

# Lint JS (ESLint)
npm run lint:js

# Lint Markdown (Markdownlint)
npm run lint:md

# Lint Styles (Stylelint)
npm run lint:styles

# Lint all (ESLint, Stylelint, Markdownlint)
npm run lint
```

## Project Structure 🗂️

> [!NOTE]
> This is a high-level overview of the project structure.\
> It is not all-inclusive and may not cover every file and folder in detail.\
> Review the file structure and comments in the code for more information.

```text
.
├── src/
│   ├── App.jsx                 # Routes and layout shell
│   ├── main.jsx                # App entry: providers (Auth, Query, Theme, Telemetry)
│   ├── configs/                # env-driven configs (MSAL, App Insights, constants)
│   │   ├── constants.js
│   │   ├── msalConfig.js
│   │   ├── fontAwesomeConfig.js
│   │   └── ...
│   ├── features/               # feature modules (auth, logging, ui, etc.)
│   │   ├── auth/
│   │   ├── logging/
│   │   └── ui/
│   │       ├── alerts/
│   │       ├── app-layout/
│   │       ├── collapsible-form-section/
│   │       ├── side-bar/
│   │       ├── site-header/
│   │       ├── theme/
│   │       └── ...
│   ├── pages/                  # route-level pages (SampleHome, PageNotFound)
│   │   ├── hooks/              # hooks specific to pages only
│   │   │   ├── usePageSetup.js
│   │   │   └── ...
│   │   ├── page-not-found/
│   │   └── sample-home/
│   ├── hooks/                  # shared hooks
│   │   ├── useAuthenticatedUser.js
│   │   └── ...
│   ├── styles/                 # SCSS + Bootstrap + Tailwind (preflight disabled, prefix tw:)
│   │   ├── index.scss
│   │   ├── tailwind.css
│   │   ├── _variables.scss
│   │   └── ...
│   └── utils/                  # shared utilities
│       ├── regex.js
│       └── ...
├── __testing__/                # test helpers
├── env/                        # .env files loaded by Vite (envDir)
├── public/                     # static assets
│   ├── app-icon.png
│   ├── pm-logo--wide--color.png
│   ├── pm-logo--wide--reverse.png
│   └── ...
├── index.html
├── vite.config.js
├── vitest-setup.js
├── package.json
├── eslint.config.mjs
├── stylelint.config.mjs
├── prettier.config.mjs
└── ...
```

Key files:

- `vite.config.js` — aliases, Tailwind plugin, HTTPS dev server, and Vitest config
- `src/configs/msalConfig.js` — uses VITE**AZURE**APP_CLIENT_ID and VITE**AZURE**TENANT_ID
- `src/configs/appInsightsConfig.js` — uses VITE**AZURE**APP_INSIGHTS_CONNECTION_STRING
- `src/features/logging/appInsights/telemetryService.js` — supports `LOCAL` mode

## Testing ✅

Run tests once:

```powershell
npm test
```

Watch mode with UI:

```powershell
npm run test:watch
```

Coverage report (text, JSON, lcov, clover to `./coverage`):

```powershell
npm run test:coverage
```

Testing stack: Vitest (jsdom env), React Testing Library, jest-dom.
Configuration is in `vite.config.js` (in the `test` node).
Setup is in `vitest-setup.js`.

## Deployment 🌐

This is a static SPA build (output in `dist/`).
Deployment is automatically handled via GitHub Actions workflows.

Ensure environment-specific configuration is handled at build time via the `env/.env.*` files.

## Contributing 🤝

To contribute to this repository, please see the [contribution guidelines](CONTRIBUTING.md).

—

Made with ❤️ using React, Vite, Tailwind CSS, Bootstrap, and the excellent open-source ecosystem.

<!-- reference urls -->

[codecov-details]: https://codecov.io/gh/sjacobson-pm/loop-lab
[developer-workstation-config-docs]: https://plantemoran-appdev.github.io/github-process-docs/workstation-setup/workstation-config/
[gh-action--build-deploy]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/build-deploy.yml
[gh-action--codeql]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/codeql.yml
[gh-action--dependency-review]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/required/plantemoran-appdev/shared-github-workflows/.github/workflows/shared--dependency-review.yml
[gh-action--linting]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/linting.yml
[gh-action--unit-tests]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/unit-tests.yml

[img--badge--codecov]: https://codecov.io/gh/sjacobson-pm/loop-lab/branch/develop/graph/badge.svg?token=[fill-me-in]
[img--gh-action-badge--build-deploy--dev]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/build-deploy.yml/badge.svg
[img--gh-action-badge--build-deploy--qa]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/build-deploy.yml/badge.svg?branch=env%2Fqa
[img--gh-action-badge--build-deploy--stage]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/build-deploy.yml/badge.svg?branch=env%2Fstage
[img--gh-action-badge--build-deploy--prod]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/build-deploy.yml/badge.svg?branch=env%2Fprod
[img--gh-action-badge--codeql]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/codeql.yml/badge.svg
[img--gh-action-badge--dependency-review]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/required/plantemoran-appdev/shared-github-workflows/.github/workflows/shared--dependency-review.yml/badge.svg
[img--gh-action-badge--linting]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/linting.yml/badge.svg
[img--gh-action-badge--unit-tests]: https://github.com/sjacobson-pm/loop-lab/actions/workflows/unit-tests.yml/badge.svg
