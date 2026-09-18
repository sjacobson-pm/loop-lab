/* v8 ignore start -- justification: this is simply a configuration file; no testing needed */

/**
 * Configuration settings for MSAL (Microsoft Authentication Library), including client ID, authority, and user roles.
 * @type {Object}
 *
 * Properties:
 * - `webApp` (Object): Configuration specific to the web application.
 *  - `clientId` (string): The client ID of the Azure AD application, sourced from environment variables.
 *  - `authority` (string): The authority URL for Azure AD, constructed using the tenant ID from environment variables.
 *  - `userRoles` (Object): An object defining user roles and their corresponding values.
 */
export const msalConfig = {
  webApp: {
    clientId: import.meta.env.VITE__AZURE__APP_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE__AZURE__TENANT_ID}`,
    userRoles: {
      // * example specifying a user role
      // * format: <roleName>: <roleValue>
      // applicationAdministrator: 'app-admins',
    },
  },
};
