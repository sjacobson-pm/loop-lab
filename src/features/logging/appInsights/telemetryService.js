/* v8 ignore start -- justification: this file is for configuring application insights */

import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { AxiosError } from 'axios';
import { createBrowserHistory } from 'history';

// ` https://github.com/microsoft/ApplicationInsights-JS
// ` https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript-framework-extensions?tabs=react

const reactPlugin = new ReactPlugin();
let appInsights;

const createTelemetryService = () => {
  const initialize = (connectionString) => {
    const errorPrefix = 'Could not initialize app insights telemetry service:';

    if (!connectionString) {
      throw new Error(`${errorPrefix} connection string not provided`);
    }

    const browserHistory = createBrowserHistory();

    // if the connection string is 'LOCAL', we will want to log all telemetry locally
    const logLocallyOnly = connectionString === 'LOCAL';
    const dummyConnectionString = 'InstrumentationKey=00000000-0000-0000-0000-000000000000';

    appInsights = new ApplicationInsights({
      config: {
        connectionString: logLocallyOnly ? dummyConnectionString : connectionString,
        disableTelemetry: logLocallyOnly,
        maxBatchInterval: 500,
        disableFetchTracking: false,
        autoTrackPageVisitTime: true,
        extensions: [reactPlugin],
        extensionConfig: {
          [reactPlugin.identifier]: { history: browserHistory },
        },
        enableAutoRouteTracking: true,
      },
    });

    appInsights.loadAppInsights();

    // if running locally, log telemetry to console
    if (logLocallyOnly) {
      const telemetryInitializer = (envelope) => {
        // eslint-disable-next-line no-console -- justification: we want to log telemetry to console when running locally
        console.log('[App Insights Telemetry]', envelope);

        // prevent sending to Azure
        return false;
      };

      appInsights.addTelemetryInitializer(telemetryInitializer);
    }
  };

  return { reactPlugin, appInsights, initialize };
};

/**
 * Tracks an error using Application Insights.
 *
 * This function handles different types of errors and sends them to Application Insights
 * for tracking. If the error is an instance of AxiosError, it includes the response in the
 * properties. If the error is a general Error, it tracks it directly. For other types of errors,
 * it converts them to a string and tracks them as a new Error.
 *
 * @param error - The error to be tracked. It can be of any type.
 */
const trackErrorWithAppInsights = (error, customProperties) => {
  const properties = customProperties ? { ...customProperties } : {};

  if (error instanceof AxiosError) {
    appInsights.trackException({ exception: error, properties: { ...properties, response: error.response } });
  } else if (error instanceof Error) {
    appInsights.trackException({ exception: error, properties });
  } else {
    const message = String(error);
    appInsights.trackException({ exception: new Error(message), properties });
  }
};

export const telemetryService = createTelemetryService();
export const getAppInsights = () => appInsights;
export { trackErrorWithAppInsights };
