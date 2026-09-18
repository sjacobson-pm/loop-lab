import { faker } from '@faker-js/faker';
import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { staffKeys, useAuthenticatedStaffQuery, useStaffByIdQuery, useStaffCollectionQuery } from './queries';
import { getStaffById, getStaffCollection, getStaffForAuthenticatedUser } from './staff';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

vi.mock('@tanstack/react-query');
vi.mock('./staff');

// **********************************************************************
// * unit tests

describe('queries', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('staffKeys', () => {
    it('returns the correct value for the "all" key', () => {
      const expected = ['staff'];
      const actual = staffKeys.all;
      expect(actual).toEqual(expected);
    });

    it('returns the correct value for the "lists" key', () => {
      const expected = ['staff', 'list'];
      const actual = staffKeys.lists();
      expect(actual).toEqual(expected);
    });

    it('returns the correct value for the "list" key with default params', () => {
      const expected = ['staff', 'list', {}];
      const actual = staffKeys.list();
      expect(actual).toEqual(expected);
    });

    it('returns the correct value for the "list" key with custom params', () => {
      const params = {
        [faker.string.alpha(10)]: faker.string.alpha(10),
        [faker.string.alpha(10)]: faker.string.alpha(10),
      };
      const expected = ['staff', 'list', params];
      const actual = staffKeys.list(params);
      expect(actual).toEqual(expected);
    });

    it('returns the correct value for the "details" key', () => {
      const expected = ['staff', 'detail'];
      const actual = staffKeys.details();
      expect(actual).toEqual(expected);
    });

    it('returns the correct value for the "byId" key', () => {
      const id = faker.string.alphanumeric(10);
      const expected = ['staff', 'detail', id];
      const actual = staffKeys.byId(id);
      expect(actual).toEqual(expected);
    });

    it('returns the correct value for the "current" key', () => {
      const expected = ['staff', 'detail', 'current'];
      const actual = staffKeys.current();
      expect(actual).toEqual(expected);
    });
  });

  describe('useAuthenticatedStaffQuery', () => {
    it('invokes useQuery with the correct parameters when no args are provided', () => {
      // * ARRANGE
      const expectedParams = {
        queryKey: staffKeys.current(),
        queryFn: getStaffForAuthenticatedUser,
        enabled: true,
        throwOnError: false,
        staleTime: 1000 * 60 * 5,
      };

      // * ACT
      renderHook(() => useAuthenticatedStaffQuery());

      // * ASSERT
      expect(useQuery).toHaveBeenCalledWith(expectedParams);
    });

    it('invokes useQuery with the correct parameters when custom args are provided', () => {
      // * ARRANGE
      const enabled = faker.datatype.boolean();
      const throwOnError = faker.datatype.boolean();
      const staleTime = faker.number.int();

      const expectedParams = {
        queryKey: staffKeys.current(),
        queryFn: getStaffForAuthenticatedUser,
        enabled,
        throwOnError,
        staleTime,
      };

      // * ACT
      renderHook(() => useAuthenticatedStaffQuery(enabled, throwOnError, staleTime));

      // * ASSERT
      expect(useQuery).toHaveBeenCalledWith(expectedParams);
    });

    it('returns the results from useQuery', () => {
      // * ARRANGE
      const results = faker.string.alphanumeric(10);
      useQuery.mockReturnValue(results);

      // * ACT
      const { result } = renderHook(() => useAuthenticatedStaffQuery());

      // * ASSERT
      expect(result.current).toEqual(results);
    });
  });

  describe('useStaffByIdQuery', () => {
    it('invokes useQuery with the correct parameters when no args are provided', () => {
      // * ARRANGE
      const id = faker.string.alphanumeric(10);
      const expectedParams = {
        queryKey: staffKeys.byId(id),
        queryFn: getStaffById,
        enabled: true,
        throwOnError: false,
        staleTime: 1000 * 60 * 5,
      };

      // * ACT
      renderHook(() => useStaffByIdQuery(id));

      // * ASSERT
      expect(useQuery).toHaveBeenCalledWith(expectedParams);
    });

    it('invokes useQuery with the correct parameters when custom args are provided', () => {
      // * ARRANGE
      const id = faker.string.alphanumeric(10);
      const enabled = faker.datatype.boolean();
      const throwOnError = faker.datatype.boolean();
      const staleTime = faker.number.int();

      const expectedParams = {
        queryKey: staffKeys.byId(id),
        queryFn: getStaffById,
        enabled,
        throwOnError,
        staleTime,
      };

      // * ACT
      renderHook(() => useStaffByIdQuery(id, enabled, throwOnError, staleTime));

      // * ASSERT
      expect(useQuery).toHaveBeenCalledWith(expectedParams);
    });

    it('returns the results from useQuery', () => {
      // * ARRANGE
      const id = faker.string.alphanumeric(10);
      const results = faker.string.alphanumeric(10);
      useQuery.mockReturnValue(results);

      // * ACT
      const { result } = renderHook(() => useStaffByIdQuery(id));

      // * ASSERT
      expect(result.current).toEqual(results);
    });
  });

  describe('useStaffCollectionQuery', () => {
    it('invokes useQuery with the correct parameters when no args are provided', () => {
      // * ARRANGE
      const params = {};
      const expectedParams = {
        queryKey: staffKeys.list(params),
        queryFn: getStaffCollection,
        enabled: true,
        throwOnError: false,
        staleTime: 1000 * 60 * 5,
      };

      // * ACT
      renderHook(() => useStaffCollectionQuery(params));

      // * ASSERT
      expect(useQuery).toHaveBeenCalledWith(expectedParams);
    });

    it('invokes useQuery with the correct parameters when custom args are provided', () => {
      // * ARRANGE
      const params = {
        [faker.string.alpha(10)]: faker.string.alpha(10),
      };
      const enabled = faker.datatype.boolean();
      const throwOnError = faker.datatype.boolean();
      const staleTime = faker.number.int();

      const expectedParams = {
        queryKey: staffKeys.list(params),
        queryFn: getStaffCollection,
        enabled,
        throwOnError,
        staleTime,
      };

      // * ACT
      renderHook(() => useStaffCollectionQuery(params, enabled, throwOnError, staleTime));

      // * ASSERT
      expect(useQuery).toHaveBeenCalledWith(expectedParams);
    });

    it('returns the results from useQuery', () => {
      // * ARRANGE
      const params = {};
      const results = faker.string.alphanumeric(10);
      useQuery.mockReturnValue(results);

      // * ACT
      const { result } = renderHook(() => useStaffCollectionQuery(params));

      // * ASSERT
      expect(result.current).toEqual(results);
    });
  });
});
