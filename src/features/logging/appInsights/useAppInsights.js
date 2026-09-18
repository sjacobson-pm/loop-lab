import { useAuthenticatedUser } from 'hooks/useAuthenticatedUser';
import { getAppInsights } from './telemetryService';

const useAppInsights = () => {
  // **********************************************************************
  // * constants / component vars

  const appInsights = getAppInsights();

  const authenticatedUser = useAuthenticatedUser();
  const currentUser = authenticatedUser.currentUser || {};

  const actor = {
    tenantId: currentUser.tenantId,
    accountId: currentUser.localAccountId,
    username: currentUser.username,
    name: currentUser.name,
  };

  // **********************************************************************
  // * functions

  /**
   * Tracks the sidebar expander button click event.
   * @param {boolean} prevIsExpanded - The previous state of the sidebar expansion.
   */
  const trackSideBarExpanderClicked = (prevIsExpanded) => {
    appInsights.trackEvent({
      name: 'site--side-bar-expander-clicked',
      properties: {
        actor,
        originalState: { isExpanded: prevIsExpanded },
        newState: { isExpanded: !prevIsExpanded },
      },
    });
  };

  /**
   * Tracks the theme toggle button click event.
   * @param {boolean} prevIsDarkTheme - The previous state of the dark theme.
   */
  const trackThemeToggleClicked = (prevIsDarkTheme) => {
    appInsights.trackEvent({
      name: 'site--theme-toggle-clicked',
      properties: {
        actor,
        originalState: { isDarkTheme: prevIsDarkTheme },
        newState: { isDarkTheme: !prevIsDarkTheme },
      },
    });
  };

  // **********************************************************************
  // * return value

  return {
    trackSideBarExpanderClicked,
    trackThemeToggleClicked,
  };
};

export { useAppInsights };
