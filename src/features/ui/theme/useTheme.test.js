import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeStore } from './store/themeStore';
import * as themes from './themes';

import { useTheme } from './useTheme';

// **********************************************************************
// * constants

let themeStore;

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

vi.mock('./themes');
vi.mock('./store/themeStore');

// **********************************************************************
// * unit tests

describe('useTheme', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    themeStore = useThemeStore.__resetMockThemeStore();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('isDarkTheme', () => {
    it('has the correct value', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDarkTheme).toBe(themeStore.isDarkTheme);
    });
  });

  describe('toggleTheme', () => {
    it('toggles the theme from light to dark when toggleTheme is called', () => {
      // * ARRANGE
      themeStore.theme = themes.THEMES.light;
      const expectedTheme = themes.THEMES.dark;

      // * ACT
      const { result } = renderHook(() => useTheme());

      const { toggleTheme } = result.current;
      act(() => toggleTheme());

      // * ASSERT
      expect(themeStore.setTheme).toHaveBeenCalledExactlyOnceWith(expectedTheme);
      expect(themes.applyBootstrapTheme).toHaveBeenCalledExactlyOnceWith(expectedTheme);
      expect(themes.setStoredThemeName).toHaveBeenCalledExactlyOnceWith(expectedTheme);
    });

    it('toggles the theme from dark to light when toggleTheme is called', () => {
      // * ARRANGE
      themeStore.theme = themes.THEMES.dark;
      const expectedTheme = themes.THEMES.light;

      // * ACT
      const { result } = renderHook(() => useTheme());

      const { toggleTheme } = result.current;
      act(() => toggleTheme());

      // * ASSERT
      expect(themeStore.setTheme).toHaveBeenCalledExactlyOnceWith(expectedTheme);
      expect(themes.applyBootstrapTheme).toHaveBeenCalledExactlyOnceWith(expectedTheme);
      expect(themes.setStoredThemeName).toHaveBeenCalledExactlyOnceWith(expectedTheme);
    });
  });
});
