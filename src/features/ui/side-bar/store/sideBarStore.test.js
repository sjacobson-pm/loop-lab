import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { initialState, useSideBarStore } from './sideBarStore';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('sideBarStore', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    // reset the store state before each test
    useSideBarStore.setState({ ...initialState });
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('returns the correct initial state', () => {
    // * ARRANGE
    const expectedState = { ...initialState };

    // * ACT
    const { result } = renderHook(() => useSideBarStore());

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });

  it('returns the correct state after invoking the hide action', () => {
    // * ARRANGE
    const expectedState = { ...initialState, isVisible: false };

    // * ACT
    const { result } = renderHook(() => useSideBarStore());
    expect(result.current.isVisible).toBe(true);
    act(() => result.current.hide());

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });

  it('returns the correct state after invoking the show action', () => {
    // * ARRANGE
    const expectedState = { ...initialState, isVisible: true };

    // * ACT
    const { result } = renderHook(() => useSideBarStore());
    act(() => result.current.hide());
    expect(result.current.isVisible).toBe(false);
    act(() => result.current.show());

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });

  it('returns the correct state after invoking the toggle action', () => {
    // * ARRANGE
    const expectedState = { ...initialState, isExpanded: false };

    // * ACT
    const { result } = renderHook(() => useSideBarStore());
    expect(result.current.isExpanded).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.isExpanded).toBe(true);
    act(() => result.current.toggle());

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });
});
