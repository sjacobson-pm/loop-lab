import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { THEMES } from '../themes';

import { initialState, useThemeStore } from './themeStore';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('themeStore', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    // reset the store state before each test
    useThemeStore.setState({ ...initialState });
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('returns the correct initial state', () => {
    // * ARRANGE
    const expectedState = { ...initialState };

    // * ACT
    const { result } = renderHook(() => useThemeStore());

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });

  it('returns the correct state after invoking the setTheme action with the dark theme', () => {
    // * ARRANGE
    const expectedState = { ...initialState, theme: THEMES.dark, isDarkTheme: true };

    // * ACT
    const { result } = renderHook(() => useThemeStore());
    expect(result.current.theme).toEqual(THEMES.light);
    expect(result.current.isDarkTheme).toBeFalsy();
    act(() => result.current.setTheme(THEMES.dark));

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });

  it('returns the correct state after invoking the setTheme action with the light theme', () => {
    // * ARRANGE
    const expectedState = { ...initialState, theme: THEMES.light, isDarkTheme: false };

    // * ACT
    const { result } = renderHook(() => useThemeStore());
    act(() => result.current.setTheme(THEMES.dark));
    expect(result.current.theme).toEqual(THEMES.dark);
    expect(result.current.isDarkTheme).toBeTruthy();
    act(() => result.current.setTheme(THEMES.light));

    // * ASSERT
    expect(result.current).toEqual(expect.objectContaining(expectedState));
  });
});
