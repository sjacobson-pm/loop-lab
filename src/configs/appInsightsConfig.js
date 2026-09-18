/* v8 ignore start -- justification: this is simply a configuration file; no testing needed */

/**
 * Configuration settings for Application Insights, including connection strings.
 * @type {Object}
 *
 * Properties:
 * - `connectionString` (string): The connection string for the Application Insights resource, sourced from environment variables.
 */
export const appInsightsConfig = {
  connectionString: import.meta.env.VITE__AZURE__APP_INSIGHTS_CONNECTION_STRING,
};
