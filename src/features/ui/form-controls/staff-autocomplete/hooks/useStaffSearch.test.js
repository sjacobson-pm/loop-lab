import { faker } from '@faker-js/faker';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStaffCollectionQuery } from 'apis/pm-apis/central-data-store/root/staff/queries';

import { useStaffSearch } from './useStaffSearch';

// **********************************************************************
// * constants

let staffCollectionQuery;

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

vi.mock('apis/pm-apis/central-data-store/root/staff/queries');

// **********************************************************************
// * unit tests

describe('useStaffSearch', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    staffCollectionQuery = useStaffCollectionQuery.__resetMockStaffCollectionQuery();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('returns default state on initial render', () => {
    const { result } = renderHook(() => useStaffSearch());
    expect(result.current.staffSearchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.staffSearchResults).toEqual(staffCollectionQuery.data.data);
    expect(typeof result.current.setStaffSearchTerm).toBe('function');
    expect(typeof result.current.clearStaffSearchResults).toBe('function');
  });

  it('disables the query when there is no search term', () => {
    // * ARRANGE
    const expectedParams = {
      pageSize: 15,
      pageNumber: 1,
      searchQuery: '',
      orderBy: 'preferredFullName',
      fields: 'id,preferredFullName',
    };
    const expectedEnabledParam = false;

    // * ACT
    renderHook(() => useStaffSearch());

    // * ASSERT
    expect(useStaffCollectionQuery).toHaveBeenCalledWith(expectedParams, expectedEnabledParam);
  });

  it('enables the query and updates search term when there is a search term', async () => {
    // * ARRANGE
    const searchTerm = faker.string.alpha(10);

    const expectedParams = {
      pageSize: 15,
      pageNumber: 1,
      searchQuery: searchTerm,
      orderBy: 'preferredFullName',
      fields: 'id,preferredFullName',
    };
    const expectedEnabledParam = true;

    // * ACT
    const { result, rerender } = renderHook(() => useStaffSearch());
    result.current.setStaffSearchTerm(searchTerm);
    rerender();

    // * ASSERT
    expect(useStaffCollectionQuery).toHaveBeenLastCalledWith(expectedParams, expectedEnabledParam);
    expect(result.current.staffSearchTerm).toBe(searchTerm);
  });

  it('sets isSearching to true when there is a search term and query is pending', async () => {
    // * ARRANGE
    staffCollectionQuery.isPending = true;
    const searchTerm = faker.person.lastName();

    // * ACT
    const { result, rerender } = renderHook(() => useStaffSearch());
    result.current.setStaffSearchTerm(searchTerm);
    rerender();

    // * ASSERT
    expect(result.current.isSearching).toBe(true);
  });

  it('sets isSearching to false when there is a search term and query is not pending', async () => {
    // * ARRANGE
    staffCollectionQuery.isPending = false;
    const searchTerm = faker.person.lastName();

    // * ACT
    const { result, rerender } = renderHook(() => useStaffSearch());
    result.current.setStaffSearchTerm(searchTerm);
    rerender();

    // * ASSERT
    expect(result.current.isSearching).toBe(false);
  });

  it('sets isSearching to false when there is no search term', async () => {
    // * ARRANGE
    const searchTerm = '';

    // * ACT
    const { result, rerender } = renderHook(() => useStaffSearch());
    result.current.setStaffSearchTerm(searchTerm);
    rerender();

    // * ASSERT
    expect(result.current.isSearching).toBe(false);
  });

  it('sets staffSearchResults to correct value when there is data in the query data object', () => {
    // * ARRANGE
    const data = faker.string.alpha(10);
    staffCollectionQuery.data = { data };

    // * ACT
    const { result } = renderHook(() => useStaffSearch());

    // * ASSERT
    expect(result.current.staffSearchResults).toEqual(data);
  });

  it('sets staffSearchResults to [] when there is no data in the query data object', () => {
    // * ARRANGE
    staffCollectionQuery.data = { data: [] };

    // * ACT
    const { result } = renderHook(() => useStaffSearch());

    // * ASSERT
    expect(result.current.staffSearchResults).toEqual([]);
  });

  it('sets staffSearchResults to [] when there is no query data', () => {
    // * ARRANGE
    staffCollectionQuery.data = null;

    // * ACT
    const { result } = renderHook(() => useStaffSearch());

    // * ASSERT
    expect(result.current.staffSearchResults).toEqual([]);
  });

  it('clears search results when clearStaffSearchResults is called', async () => {
    // * ACT
    const { result, rerender } = renderHook(() => useStaffSearch());
    expect(result.current.staffSearchResults).toEqual(staffCollectionQuery.data.data);
    result.current.clearStaffSearchResults();
    rerender();

    // * ASSERT
    expect(result.current.staffSearchResults).toBeEmpty();
  });
});
