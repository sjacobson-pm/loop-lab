/* v8 ignore start -- justification: this is simply a configuration file; no testing needed */

/**
 * Configuration settings for API interactions, including base URLs and authentication scopes.
 * @type {Object}
 *
 * Properties:
 * - `apimBaseUrl` (string): The base URL for the API Management (APIM) service, sourced from environment variables.
 * - `centralDataStore` (Object): Configuration for the Central Data Store API.
 *  - `apimPath` (string): The specific path for the Central Data Store API within APIM, sourced from environment variables.
 *  - `scopes` (Array<string>): An array of authentication scopes required for accessing the Central Data Store API, constructed using environment variables.
 */
export const apiConfig = {
  apimBaseUrl: import.meta.env.VITE__APIM__BASE_URL,

  centralDataStore: {
    apimPath: import.meta.env.VITE__CDS__APIM_PATH,
    scopes: [`${import.meta.env.VITE__CDS__API_APP_ID_URI}/Staff_Read`],
  },
};
