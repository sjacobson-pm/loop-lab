import { faker } from '@faker-js/faker';
import { describe, expect, it, vi } from 'vitest';

import { msalInstance } from './msalInstance';

import { acquireTokenPopup, acquireTokenSilent, getUser, getUserRoles } from './msalHelpers';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

vi.mock('./msalInstance');

// **********************************************************************
// * unit tests

describe('msalHelpers', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('acquireTokenPopup', () => {
    it('returns the result of msalInstance.acquireTokenPopup', async () => {
      // * ARRANGE
      const request = faker.string.alphanumeric(10);
      const authResult = faker.string.alphanumeric(10);
      msalInstance.acquireTokenPopup.mockResolvedValue(authResult);

      // * ACT
      const actual = await acquireTokenPopup(request);

      // * ASSERT
      expect(actual).toBe(authResult);
    });
  });

  describe('acquireTokenSilent', () => {
    it('returns the result of msalInstance.acquireTokenSilent', async () => {
      // * ARRANGE
      const request = faker.string.alphanumeric(10);
      const authResult = faker.string.alphanumeric(10);
      msalInstance.acquireTokenSilent.mockResolvedValue(authResult);

      // * ACT
      const actual = await acquireTokenSilent(request);

      // * ASSERT
      expect(actual).toBe(authResult);
    });
  });

  describe('getUser', () => {
    it('returns the first account from msalInstance.getAllAccounts', () => {
      // * ARRANGE
      const account0 = faker.string.alphanumeric(10);
      const account1 = faker.string.alphanumeric(10);
      const account2 = faker.string.alphanumeric(10);
      const accounts = [account0, account1, account2];
      msalInstance.getAllAccounts.mockReturnValue(accounts);

      // * ACT
      const actual = getUser();

      // * ASSERT
      expect(actual).toBe(account0);
    });
  });

  describe('getUserRoles', () => {
    it('returns an empty object', () => {
      const userRoles = getUserRoles();

      // * ASSERT
      expect(userRoles).toEqual({});
    });
  });
});
