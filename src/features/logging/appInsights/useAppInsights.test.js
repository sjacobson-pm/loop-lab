import { faker } from '@faker-js/faker';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthenticatedUser } from 'hooks/useAuthenticatedUser';
import { getAppInsights } from './telemetryService';

import { useAppInsights } from './useAppInsights';

// **********************************************************************
// * constants

let appInsights;
let authenticatedUser;

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

vi.mock('./telemetryService');
vi.mock('hooks/useAuthenticatedUser');

// **********************************************************************
// * unit tests

describe('useAppInsights', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    appInsights = getAppInsights.__resetMockAppInsights();
    authenticatedUser = useAuthenticatedUser.__resetMockAuthenticatedUser(authenticatedUser);
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('trackSideBarExpanderClicked', () => {
    it('tracks the event with the correct data when there is an authenticated user', () => {
      // * ARRANGE
      const prevIsExpanded = faker.datatype.boolean();
      const expectedActor = {
        tenantId: authenticatedUser.currentUser.tenantId,
        accountId: authenticatedUser.currentUser.localAccountId,
        username: authenticatedUser.currentUser.username,
        name: authenticatedUser.currentUser.name,
      };

      // * ACT
      const { result } = renderHook(() => useAppInsights());
      result.current.trackSideBarExpanderClicked(prevIsExpanded);

      // * ASSERT
      expect(appInsights.trackEvent).toHaveBeenCalledWith({
        name: 'site--side-bar-expander-clicked',
        properties: {
          actor: expectedActor,
          originalState: { isExpanded: prevIsExpanded },
          newState: { isExpanded: !prevIsExpanded },
        },
      });
    });

    it('tracks the event with undefined actor when there is no authenticated user', () => {
      // * ARRANGE
      useAuthenticatedUser.mockReturnValue({});
      const prevIsExpanded = faker.datatype.boolean();
      const expectedActor = {
        tenantId: undefined,
        accountId: undefined,
        username: undefined,
        name: undefined,
      };

      // * ACT
      const { result } = renderHook(() => useAppInsights());
      result.current.trackSideBarExpanderClicked(prevIsExpanded);

      // * ASSERT
      expect(appInsights.trackEvent).toHaveBeenCalledWith({
        name: 'site--side-bar-expander-clicked',
        properties: {
          actor: expectedActor,
          originalState: { isExpanded: prevIsExpanded },
          newState: { isExpanded: !prevIsExpanded },
        },
      });
    });
  });

  describe('trackThemeToggleClicked', () => {
    it('tracks the event with the correct data when there is an authenticated user', () => {
      // * ARRANGE
      const prevIsDarkTheme = faker.datatype.boolean();
      const expectedActor = {
        tenantId: authenticatedUser.currentUser.tenantId,
        accountId: authenticatedUser.currentUser.localAccountId,
        username: authenticatedUser.currentUser.username,
        name: authenticatedUser.currentUser.name,
      };

      // * ACT
      const { result } = renderHook(() => useAppInsights());
      result.current.trackThemeToggleClicked(prevIsDarkTheme);

      // * ASSERT
      expect(appInsights.trackEvent).toHaveBeenCalledWith({
        name: 'site--theme-toggle-clicked',
        properties: {
          actor: expectedActor,
          originalState: { isDarkTheme: prevIsDarkTheme },
          newState: { isDarkTheme: !prevIsDarkTheme },
        },
      });
    });

    it('tracks the event with undefined actor when there is no authenticated user', () => {
      // * ARRANGE
      useAuthenticatedUser.mockReturnValue({});
      const prevIsDarkTheme = faker.datatype.boolean();
      const expectedActor = {
        tenantId: undefined,
        accountId: undefined,
        username: undefined,
        name: undefined,
      };

      // * ACT
      const { result } = renderHook(() => useAppInsights());
      result.current.trackThemeToggleClicked(prevIsDarkTheme);

      // * ASSERT
      expect(appInsights.trackEvent).toHaveBeenCalledWith({
        name: 'site--theme-toggle-clicked',
        properties: {
          actor: expectedActor,
          originalState: { isDarkTheme: prevIsDarkTheme },
          newState: { isDarkTheme: !prevIsDarkTheme },
        },
      });
    });
  });
});
