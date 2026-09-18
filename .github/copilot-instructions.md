# Copilot Instructions for React Web App

## Repository Overview

This is a **React 19 web front-end** built with Vite 7 and a modern tech stack. The application includes enterprise-grade features: authentication, telemetry, comprehensive testing with enforced 100% coverage, deterministic builds, and multi-environment deployment pipelines.

### High-Level Repository Information

- **Size**: >100 source files (may grow; agents should not hard‑code counts), >700 npm packages
- **Type**: React web application
- **Languages**: JavaScript (JSX), SCSS, HTML, Markdown
- **Frameworks**: React 19, Vite 7, React Router 7
- **Target Runtime**: Node.js >= 22.15, npm >= 10.9
- **UI**: Tailwind CSS 4 (prefix `tw:`), Bootstrap 5.3, React Bootstrap, SCSS theming
- **State/Data**: Zustand, TanStack Query v5, Axios
- **Auth**: MSAL (Microsoft Azure)
- **Testing**: Vitest, React Testing Library, Jest-DOM (>400 tests; 100% statement coverage required)

## Build and Validation Instructions

### Prerequisites Setup

**CRITICAL**: Always setup Font Awesome registry (Pro kit) before installing dependencies:

> [!NOTE]
> This is automatically handled in CI/CD pipelines within the copilot setup steps workflow.

```bash
npm config set "@awesome.me:registry" https://npm.fontawesome.com/
npm config set "@fortawesome:registry" https://npm.fontawesome.com/
npm config set "//npm.fontawesome.com/:_authToken" <FONT_AWESOME_TOKEN>
```

**CRITICAL**: NEVER commit the .npmrc file to source control; delete it once you are finished with it.

### Required Development Environment

- Node.js >= 22.15 (LTS recommended)
- npm >= 10.9
- Git with commit signing enabled

### Bootstrap / Install Dependencies

**Always use `npm ci`** (not `npm install`) for reproducible, lockfile-resolved installs:

```bash
npm ci
```

- **Indicative Time**: ~11 seconds
- **Packages**: 746 (will change as dependencies evolve)
- **Precondition**: Font Awesome registry configured
- **Postcondition**: `node_modules` populated

### Build Commands

All builds automatically run linting via prebuild scripts:

```bash
# Development build (most common)
npm run build:dev

# Environment-specific builds
npm run build:qa
npm run build:stage
npm run build:prod
```

- **Indicative Time**: ~7–8 seconds per build
- **Output**: `./dist` directory
- **Precondition**: Dependencies installed, linting passes
- **Warning**: Large chunks (>500kB) are expected and acceptable

### Development Server

```bash
npm run dev
```

- **Purpose**: Local development with HTTPS enabled
- **Mode**: `local-dev`
- **Hot reload**: Enabled via Vite

### Testing

```bash
# Run all tests
npm run test

# Run with coverage (required for CI)
npm run test:coverage

# Interactive test UI
npm run test:watch
```

- **Indicative Time**: ~43 seconds for full test suite
- **Coverage Requirement**: 100% statement coverage (enforced in CI)
- **Branch Coverage**: Should remain 100%
- **Test Count**: ~174 tests across ~40 files (do not assume static)
- **Framework**: Vitest + React Testing Library + Jest-DOM
- **Note**: Some pure config / sample files excluded from coverage

#### Writing New Tests

- Place new tests alongside source files with `.test.jsx` or `.test.js` suffix
- Use `vitest-setup.js` for global setup (auto-included)
- Follow existing patterns in `src/__testing__/` for helpers/mocks
- Achieve 100% coverage for any new or modified code
- Use aliased imports (e.g., `import { useAuth } from 'features/auth/hooks/useAuth';`)
- Validate via `npm run test:coverage` before committing
- Use descriptive test names; group with `describe`
- Keep tests isolated and deterministic (no external side effects)
- Sections inside tests: `// * ARRANGE`, `// * ACT`, `// * ASSERT`

### Linting and Formatting

```bash
# Run all linters (ESLint, Stylelint, Markdownlint)
npm run lint

# Individual linters
npm run lint:js      # ESLint
npm run lint:styles  # Stylelint (SCSS/CSS)
npm run lint:md      # Markdownlint

# Formatting (Windows CRLF)
npm run format:win
npm run format:win:check-only

# Formatting (Linux LF)
npm run format:linux
npm run format:linux:check-only
```

- **ESLint**: React 19 rules, strict (semicolons required)
- **Stylelint**: SCSS-focused (Bootstrap + Tailwind compatible)
- **Prettier**: 120 char width, single quotes, trailing commas

### Preview Production Build

```bash
npm run preview
```

- **Purpose**: Serve production build locally from `./dist`
- **Precondition**: Build must have been run
- **SSL**: Requires `.cert/localhost-key.pem` & `.cert/localhost-cert.pem`

## Project Layout and Architecture

### Directory Structure (High-Level)

```text
├── .github/workflows/          # CI/CD pipelines
├── env/                        # Environment-specific .env files (never root .env)
│   ├── .env.development
│   ├── .env.qa
│   ├── .env.staging
│   └── .env.production
├── public/                     # Static assets
├── src/
│   ├── __testing__/            # Test utilities/helpers
│   ├── apis/                   # API layer modules
│   ├── configs/                # App configuration (MSAL, App Insights, constants)
│   ├── features/               # Feature-based modules (auth, logging, ui, ...)
│   ├── hooks/                  # Reusable shared hooks
│   ├── pages/                  # Route-level components/pages
│   ├── styles/                 # SCSS, Tailwind, Bootstrap overrides
│   ├── utils/                  # Shared utilities (dates, regex, api wrappers)
│   ├── App.jsx                 # App shell + routing
│   └── main.jsx                # App entry point
├── vite.config.js              # Vite config, aliases, Tailwind plugin, HTTPS, Vitest
├── eslint.config.mjs           # ESLint config
├── stylelint.config.mjs        # Stylelint config
├── prettier.config.mjs         # Prettier config
└── package.json                # Scripts + dependencies
```

### Aliased Imports (Configured in `vite.config.js`)

- `apis` → `/src/apis`
- `configs` → `/src/configs`
- `features` → `/src/features`
- `pages` → `/src/pages`
- `hooks` → `/src/hooks`
- `utils` → `/src/utils`
- `store` → `/src/store`
- `testing` → `/src/__testing__`

### Key Configuration Files

- **`vite.config.js`**: Build config, aliases, Tailwind plugin, HTTPS dev server, Vitest setup
- **`src/configs/msalConfig.js`**: Uses `VITE__AZURE__APP_CLIENT_ID`, `VITE__AZURE__TENANT_ID`
- **`src/configs/appInsightsConfig.js`**: Uses `VITE__AZURE__APP_INSIGHTS_CONNECTION_STRING` (set `LOCAL` for console-only telemetry)
- **Environment files**: Located only in `env/` directory (never project root)

### CI/CD Pipeline Overview

1. **Linting** (`.github/workflows/linting.yml`) – `npm run lint` (must pass)
2. **Prettier Formatting** (`.github/workflows/prettier.yml`) – `npm run format:linux:check-only` (must pass)
3. **Unit Tests** (`.github/workflows/unit-tests.yml`) – `npm run test:coverage` (100% statement coverage enforced)
4. **CodeQL Security Scan** (`.github/workflows/codeql.yml`) – static analysis (PR + scheduled)
5. **Build & Deploy** (`.github/workflows/build-deploy.yml`) – environment builds + Azure deployment
   - `develop` → development
   - `env/qa` → quality-assurance
   - `env/stage` → staging
   - `env/prod` → production

### Branch and Commit Requirements

- Branch naming: `feature/<initials>-issue-<number>` or `fix/<initials>-issue-<number>`
- All commits MUST be GPG/SSH signed (enforced in CI)

#### Commit Message Requirements

- Subject ≤ 70 chars, imperative, capitalized, no trailing period
- Blank line before body (if body present)
- Body wrapped at 70 chars
- Bullet lists: each bullet ≤ 65 chars

### Testing Architecture

- **Framework**: Vitest (jsdom)
- **Location**: Tests colocated (`*.test.js|jsx`)
- **Coverage**: V8 provider; excludes `__mocks__` & `__testing__`
- **Setup**: `vitest-setup.js`

### Known Build Considerations

- **Font Awesome Authentication**: Required for private kit packages
- **Large Bundle Warning**: Expected; do not treat as regression alone
- **SCSS Deprecation Warnings**: Bootstrap-related; silenced via config
- **React Compiler**: Enabled for non-test builds; disabled under `mode === 'test'`
- **SSL Certificates**: `.cert/localhost-key.pem` and `.cert/localhost-cert.pem` required for HTTPS dev & preview
- **Coverage Exclusions**: Some config/service and sample files intentionally excluded (pure configuration like `msalConfig.js`, `appInsightsConfig.js`, service wrappers, sample pages). Do not force coverage for pure constants/metadata.

### Environment Variables

All runtime build-time variables load from `env/` (set via `vite.config.js > envDir`).
Naming uses double underscores for logical grouping (`VITE__<DOMAIN>__<NAME>`):

Minimum required:

```dotenv
VITE__AZURE__APP_CLIENT_ID=
VITE__AZURE__TENANT_ID=
VITE__AZURE__APP_INSIGHTS_CONNECTION_STRING=LOCAL
```

Mode mapping:

```text
development  -> env/.env.development
qa           -> env/.env.qa
staging      -> env/.env.staging
production   -> env/.env.production
local dev    -> optional env/.env.local (used by `npm run dev` if present)
```

Never create a root `.env`.
Avoid committing secrets.
For new variables follow the naming convention and document usage inline where consumed.

### React Compiler Behavior

The React Compiler (`babel-plugin-react-compiler`) auto-optimizes pure components.
Do **not** add `React.memo`, `useCallback`, or `useMemo` purely for micro-optimizations unless profiling shows a measurable issue the compiler cannot resolve.
Document any manual optimization rationale inline.

### Tailwind & Styling Nuances

- Tailwind v4 via `@tailwindcss/vite`, prefix `tw:`; preflight disabled
- SCSS modules: `camelCaseOnly`
- Bootstrap override layering in `src/styles/` (`_bs-*`, `_variables.scss`)
- Prefer local component-level styling with utilities; escalate to SCSS variables only when broadly reused

### API Layer

`apis` alias targets `/src/apis`.
Central HTTP logic (axios base instance, interceptors) belongs in shared util(s) (e.g., `utils/api.js`).
Avoid duplicating axios configuration.
Group domain-specific endpoints logically.

## Agent Guidelines

**Trust these instructions**: Only explore code further if something seems inconsistent or missing.ile reflects latest `develop` branch state.

### For New Features

- Add tests achieving 100% statement coverage (and maintain branch coverage)
- Colocate new feature code within `src/features/<domain>`
- Use aliased imports (no deep relative paths)
- Run: `npm run lint`, `npm run test:coverage`, `npm run build:dev` before concluding

### For Debugging Build Issues

1. Confirm Font Awesome registry config
2. Re-run `npm ci` (check for peer dependency warnings)
3. Verify `env/` files contain required variables
4. Run individual linters to isolate issues
5. If unexpected performance or coverage differences: ensure test mode vs non-test mode behavior (React Compiler disabled under `mode === 'test'`)

### Agent (Copilot Chat / Cloud Coding Agent) Quick Task Recipes

1. Small Feature Implementation
   - Add under `src/features/<domain>/`
   - Provide tests per file; avoid barrel cycles
2. Adding a Hook
   - Shared: `src/hooks/`; feature/page-specific: colocate
   - Name `use<Thing>.js` + test `use<Thing>.test.js`
3. API Client Addition
   - Place under `src/apis/<domain>/`
   - Reuse existing axios abstraction; supply mocks if complex
4. Telemetry Enhancements
   - Centralize in telemetry service; preserve `LOCAL` connection string behavior
5. Styling / Theme Work
   - Use `tw:` utilities for one-off layout/spacing; SCSS partials for reusable theme constructs
6. Performance Tuning
   - Measure first; rely on compiler; justify manual memoization
7. Test Authoring
   - Use semantic queries (`getByRole`, `getByText`); avoid implementation details
8. Dependency Changes
   - Minimize; update docs & instructions for runtime additions
9. Lint & Format
   - Ensure all linters pass; no rule suppression without rationale
10. Coverage Validation
    - Maintain global 100%; exclude only pure config (document with `/* v8 ignore start */` justification)

### Agent Safety / Do Not Do List

- Do NOT commit secrets (.cert, tokens, .npmrc, env values)
- Do NOT create root `.env`
- Do NOT remove intentional coverage exclusions without strategy
- Do NOT add circular barrel exports
- Do NOT bypass lint failures—fix them
- Do NOT downgrade packages unless reverting a regression (document)

### Minimal Success Criteria for Automated Changes

A change is acceptable when:

- `npm run build:dev` succeeds
- `npm run lint` passes (all linters)
- `npm run test:coverage` passes with 100% coverage
- No new build warnings beyond known bundle size or silenced SCSS deprecations
- Documentation remains consistent (script names, variables, aliases)

### Quick Command Reference (PowerShell)

```powershell
# Install
npm ci

# Local dev (HTTPS)
npm run dev

# Quality gate
npm run lint; npm run test:coverage; npm run build:dev

# Format (Windows EOL)
npm run format:win

# Production build
npm run build:prod

# Preview dist
npm run preview
```

---
