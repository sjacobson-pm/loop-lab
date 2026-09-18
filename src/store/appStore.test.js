import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { initialState, useAppStore } from './appStore';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('appStore', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    // reset the store state before each test
    useAppStore.setState({ ...initialState });
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('returns the correct initial state', () => {
    const expectedState = { ...initialState };
    const { result } = renderHook(() => useAppStore());
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });
});
