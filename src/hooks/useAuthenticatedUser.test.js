import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthenticatedStaffQuery } from 'apis/pm-apis/central-data-store/root/staff/queries';
import { getUser } from 'features/auth/microsoft/msalHelpers';

import { useAuthenticatedUser } from './useAuthenticatedUser';

// **********************************************************************
// * constants / test vars

let user;
let authenticatedStaffQuery;

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

vi.mock('apis/pm-apis/central-data-store/root/staff/queries');
vi.mock('features/auth/microsoft/msalHelpers');

// **********************************************************************
// * unit tests

describe('useAuthenticatedUser', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    user = getUser.__resetMockUser();
    authenticatedStaffQuery = useAuthenticatedStaffQuery.__resetMockAuthenticatedStaffQuery();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('returns the correct data', () => {
    // * ARRANGE
    const expectedData = { currentUser: user, currentStaff: authenticatedStaffQuery };

    // * ACT
    const { result } = renderHook(() => useAuthenticatedUser());

    // * ASSERT
    expect(result.current).toEqual(expectedData);
  });
});
