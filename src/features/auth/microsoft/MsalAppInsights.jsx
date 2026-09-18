import { EventType } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { useEffect } from 'react';

import { getAppInsights } from 'features/logging/appInsights/telemetryService';

const MsalAppInsights = ({ children }) => {
  // **********************************************************************
  // * constants / component vars

  const { instance } = useMsal();

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  useEffect(() => {
    // set the authenticated user in app insights
    const setAuthenticatedUser = (userName, accountId) => {
      const appInsights = getAppInsights();

      if (appInsights) {
        appInsights.setAuthenticatedUserContext(userName, accountId, true);
      }
    };

    // add event callbacks to set the authenticated user in app insights
    const callbackId = instance.addEventCallback((message) => {
      // only process specific event types
      switch (message.eventType) {
        case EventType.LOGIN_SUCCESS: {
          const result = message.payload;
          const userName = result.account.username.toLowerCase();
          const accountId = result.account.localAccountId;
          setAuthenticatedUser(userName, accountId);

          break;
        }

        case EventType.HANDLE_REDIRECT_END: {
          const accounts = instance.getAllAccounts();

          if (accounts.length > 0) {
            const userName = accounts[0].username.toLowerCase();
            const accountId = accounts[0].localAccountId;
            setAuthenticatedUser(userName, accountId);
          }

          break;
        }

        default:
          break;
      }
    });

    return () => {
      if (callbackId) {
        instance.removeEventCallback(callbackId);
      }
    };
  }, [instance]);

  // **********************************************************************
  // * render

  return <>{children}</>;
};

export { MsalAppInsights };
