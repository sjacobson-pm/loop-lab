import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getResource, getResourceCollection } from 'apis/pm-apis/common';
import { getUser as getMsalUser } from 'features/auth/microsoft/msalHelpers';
import { getStaffById, getStaffCollection, getStaffForAuthenticatedUser } from './staff';

// **********************************************************************
// * constants

let user;
let apiCollectionResponse;
let apiSingleResponse;

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

vi.mock('apis/pm-apis/common');
vi.mock('configs/apiConfig');
vi.mock('features/auth/microsoft/msalHelpers');

// **********************************************************************
// * unit tests

describe('staff', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    user = getMsalUser.__resetMockUser();
    apiCollectionResponse = getResourceCollection.__resetMockResponse();
    apiSingleResponse = getResource.__resetMockResponse();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('getStaffForAuthenticatedUser', () => {
    it('returns the first staff member from the API response for the authenticated user', async () => {
      const result = await getStaffForAuthenticatedUser();
      expect(result).toEqual(apiCollectionResponse.data[0]);
    });

    it('calls getResourceCollection with the correct filter search param', async () => {
      const expectedFilter = `azureAdObjectId eq "${user.localAccountId}"`;
      await getStaffForAuthenticatedUser();
      expect(getResourceCollection).toHaveBeenCalledWith(
        expect.any(Object),
        'staff',
        expect.objectContaining({ filter: expectedFilter })
      );
    });
  });

  describe('getStaffById', () => {
    it('returns the resource from the API response', async () => {
      // * ARRANGE
      const id = faker.number.int();
      const queryKey = [faker.string.alpha(10), faker.string.alpha(10), id];

      // * ACT
      const result = await getStaffById({ queryKey });

      // * ASSERT
      expect(result).toEqual(apiSingleResponse);
    });

    it('calls getResource with the correct path and default search params', async () => {
      // * ARRANGE
      const id = faker.number.int();
      const queryKey = [faker.string.alpha(10), faker.string.alpha(10), id];

      // * ACT
      await getStaffById({ queryKey });

      // * ASSERT
      expect(getResource).toHaveBeenCalledWith(expect.any(Object), `staff/${id}`, { apiVersion: 1 });
    });
  });

  describe('getStaffCollection', () => {
    it('returns the collection from the API response', async () => {
      // * ARRANGE
      const params = {};
      const queryKey = ['staff', 'list', params];

      // * ACT
      const result = await getStaffCollection({ queryKey });

      // * ASSERT
      expect(result).toEqual(apiCollectionResponse);
    });

    it('calls getResourceCollection with the correct path and search params when params are provided', async () => {
      // * ARRANGE
      const params = {
        pageSize: 25,
        pageNumber: 2,
        filter: 'isActive eq true',
        searchQuery: 'smith',
        orderBy: 'displayName asc',
        fields: 'id,displayName',
      };
      const expectedSearchParams = { apiVersion: 1, ...params };
      const queryKey = ['staff', 'list', params];

      // * ACT
      await getStaffCollection({ queryKey });

      // * ASSERT
      expect(getResourceCollection).toHaveBeenCalledWith(expect.any(Object), 'staff', expectedSearchParams);
    });

    it('calls getResourceCollection with the correct path and default search params when no params are provided', async () => {
      // * ARRANGE
      const params = {};
      const expectedSearchParams = {
        apiVersion: 1,
      };
      const queryKey = ['staff', 'list', params];

      // * ACT
      await getStaffCollection({ queryKey });

      // * ASSERT
      expect(getResourceCollection).toHaveBeenCalledWith(expect.any(Object), 'staff', expectedSearchParams);
    });
  });
});
