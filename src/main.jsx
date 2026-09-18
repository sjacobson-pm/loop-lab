/* v8 ignore start -- justification: this is the main entry point to the app and should have no testable logic */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter } from 'react-router';

// css imports
// index first
import './styles/index.scss';
// then tailwind
import './styles/tailwind.css';
// then 3rd party libs
// [if needed, add here]

import { trackErrorWithAppInsights } from 'features/logging/appInsights/telemetryService';

import { Authentication } from 'features/auth/Authentication';
import { TelemetryProvider as AppInsightsTelemetryProvider } from 'features/logging/appInsights/TelemetryProvider';
import { ErrorFallback } from 'features/ui/error-fallback/ErrorFallback';
import { ThemeProvider } from 'features/ui/theme/ThemeProvider';
import { App } from './App.jsx';

// **********************************************************************
// * constants / component vars

// `https://tanstack.com/query/latest/docs/
// `https://tkdodo.eu/blog/practical-react-query/
const queryClientOptions = {
  defaultOptions: {
    queries: {},
    mutations: {},
  },
};

const queryClient = new QueryClient(queryClientOptions);

// **********************************************************************
// * functions

// **********************************************************************
// * handlers

document.addEventListener('DOMContentLoaded', function () {
  // Prevent focus from sticking to modals when they close
  // `https://stackoverflow.com/a/79246888/1876254
  document.addEventListener('hide.bs.modal', function () {
    if (document.activeElement) {
      document.activeElement.blur();
    }
  });
});

const handleError = (error, info) => {
  trackErrorWithAppInsights(error, { info });
};

// **********************************************************************
// * render

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      <AppInsightsTelemetryProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Authentication>
              <QueryClientProvider client={queryClient}>
                <App />
                <ReactQueryDevtools initialIsOpen={false} />
              </QueryClientProvider>
            </Authentication>
          </BrowserRouter>
        </ThemeProvider>
      </AppInsightsTelemetryProvider>
    </ErrorBoundary>
  </StrictMode>
);
