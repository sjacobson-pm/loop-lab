import { InteractionType } from '@azure/msal-browser';
import { MsalAuthenticationTemplate, MsalProvider } from '@azure/msal-react';

import { msalInstance } from './msalInstance';

import { Error } from './Error';
import { MicrosoftAuthInProgress } from './MicrosoftAuthInProgress';
import { MsalAppInsights } from './MsalAppInsights';

const MicrosoftLogin = ({ children }) => {
  // **********************************************************************
  // * constants / component vars

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <MsalProvider instance={msalInstance}>
      <MsalAppInsights>
        <MsalAuthenticationTemplate
          interactionType={InteractionType.Redirect}
          errorComponent={Error}
          loadingComponent={MicrosoftAuthInProgress}>
          {children}
        </MsalAuthenticationTemplate>
      </MsalAppInsights>
    </MsalProvider>
  );
};

export { MicrosoftLogin };
