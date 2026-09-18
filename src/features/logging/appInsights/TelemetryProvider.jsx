import { useState } from 'react';

import { appInsightsConfig } from 'configs/appInsightsConfig';
import { telemetryService } from './telemetryService';

const TelemetryProvider = ({ children }) => {
  // **********************************************************************
  // * constants / component vars

  const [isInitialized, setIsInitialized] = useState(false);

  const appInsightsConnectionString = appInsightsConfig.connectionString;

  if (!isInitialized && Boolean(appInsightsConnectionString)) {
    telemetryService.initialize(appInsightsConnectionString);
    setIsInitialized(true);
  }

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  // only render children if the telemetry service has been initialized
  if (isInitialized) {
    return <>{children}</>;
  }

  return null;
};

export { TelemetryProvider };
