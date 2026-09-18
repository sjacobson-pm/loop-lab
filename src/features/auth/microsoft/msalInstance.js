/* v8 ignore start -- justification: there is nothing to test in this module */

import { BrowserCacheLocation, PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from 'configs/msalConfig';

const config = {
  auth: {
    clientId: msalConfig.webApp.clientId,
    authority: msalConfig.webApp.authority,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
  },
};

export const msalInstance = new PublicClientApplication(config);
