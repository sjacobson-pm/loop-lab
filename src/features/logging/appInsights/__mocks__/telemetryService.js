import { vi } from 'vitest';

// **********************************************************************
// getAppInsights
// **********************************************************************

const defaultAppInsights = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  setAuthenticatedUserContext: vi.fn(),
};

let appInsights = { ...defaultAppInsights };

const getAppInsights = vi.fn(() => appInsights);

getAppInsights.__getMockAppInsights = () => appInsights;

getAppInsights.__resetMockAppInsights = () => {
  appInsights = { ...defaultAppInsights };
  return appInsights;
};

// **********************************************************************
// telemetryService
// **********************************************************************

const telemetryService = { initialize: vi.fn() };

// **********************************************************************
// trackErrorWithAppInsights
// **********************************************************************

const trackErrorWithAppInsights = vi.fn();

// **********************************************************************
// exports
// **********************************************************************

export { getAppInsights, telemetryService, trackErrorWithAppInsights };
