import { faker } from '@faker-js/faker';
import { act, renderHook } from '@testing-library/react';

import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSiteHeaderStore } from './siteHeaderStore';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('siteHeaderStore', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    // reset the store state before each test
    useSiteHeaderStore.setState({ ...initialState });
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('returns the correct initial state', () => {
    // * ARRANGE
    const expectedState = { ...initialState };

    // * ACT
    const { result } = renderHook(() => useSiteHeaderStore());

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });

  it('returns the correct state after invoking the setPageTitle action', () => {
    // * ARRANGE
    const newPageTitle = faker.string.alphanumeric(10);
    const expectedState = { ...initialState, pageTitle: newPageTitle };

    // * ACT
    const { result } = renderHook(() => useSiteHeaderStore());
    act(() => result.current.setPageTitle(newPageTitle));

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });

  it('returns the correct state after invoking the setPageSubtitle action', () => {
    // * ARRANGE
    const newPageSubtitle = faker.string.alphanumeric(10);
    const expectedState = { ...initialState, pageSubtitle: newPageSubtitle };

    // * ACT
    const { result } = renderHook(() => useSiteHeaderStore());
    act(() => result.current.setPageSubtitle(newPageSubtitle));

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });
});
