import { faker } from '@faker-js/faker';
import { describe, expect, it, vi } from 'vitest';
import { when } from 'vitest-when';

import * as themes from './themes';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('themes', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('applyBootstrapTheme', () => {
    it('should set the theme attribute on the document element', () => {
      // * ARRANGE
      const theme = themes.THEMES.dark;
      const setAttributeSpy = vi.spyOn(document.documentElement, 'setAttribute');

      // * ACT
      themes.applyBootstrapTheme(theme);

      // * ASSERT
      expect(setAttributeSpy).toHaveBeenCalledExactlyOnceWith('data-bs-theme', theme.name);
    });
  });

  describe('getPreferredTheme', () => {
    it('should return the stored theme if it is valid', () => {
      // * ARRANGE
      const theme = faker.helpers.arrayElement(Object.values(themes.THEMES));
      const getStoredThemeNameSpy = vi.spyOn(themes.HelperMethods, 'getStoredThemeName');

      when(getStoredThemeNameSpy).calledWith().thenReturn(theme.name);

      // * ACT
      const actual = themes.getPreferredTheme();

      // * ASSERT
      expect(actual).toBe(theme);
    });

    it('should return the light theme name if the stored theme name is null', () => {
      // * ARRANGE
      const getStoredThemeNameSpy = vi.spyOn(themes.HelperMethods, 'getStoredThemeName');
      when(getStoredThemeNameSpy).calledWith().thenReturn(null);

      // * ACT
      const actual = themes.getPreferredTheme();

      // * ASSERT
      expect(actual).toBe(themes.THEMES.light);
    });

    it('should return the light theme name if the stored theme name is invalid', () => {
      // * ARRANGE
      const storedThemeName = faker.string.alphanumeric(10);
      const getStoredThemeNameSpy = vi.spyOn(themes.HelperMethods, 'getStoredThemeName');
      when(getStoredThemeNameSpy).calledWith().thenReturn(storedThemeName);

      // * ACT
      const actual = themes.getPreferredTheme();

      // * ASSERT
      expect(actual).toBe(themes.THEMES.light);
    });
  });

  describe('setStoredThemeName', () => {
    it('should store the theme name in local storage', () => {
      // * ARRANGE
      const theme = faker.helpers.arrayElement(Object.values(themes.THEMES));
      const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem');

      // * ACT
      themes.setStoredThemeName(theme);

      // * ASSERT
      expect(setItemSpy).toHaveBeenCalledExactlyOnceWith('selected-theme-name', theme.name);
    });
  });

  describe('helper methods', () => {
    describe('getStoredTheme', () => {
      it('should return the stored theme name from local storage', () => {
        // * ARRANGE
        const theme = faker.string.alphanumeric(10);
        const getItemSpy = vi.spyOn(window.localStorage.__proto__, 'getItem');

        when(getItemSpy).calledWith('selected-theme-name').thenReturn(theme);

        // * ACT
        const actual = themes.HelperMethods.getStoredThemeName();

        // * ASSERT
        expect(actual).toBe(theme);
      });

      it('should return null if there is no stored theme name in local storage', () => {
        // * ARRANGE
        const getItemSpy = vi.spyOn(window.localStorage.__proto__, 'getItem');

        when(getItemSpy).calledWith('selected-theme-name').thenReturn(null);

        // * ACT
        const actual = themes.HelperMethods.getStoredThemeName();

        // * ASSERT
        expect(actual).toBeNull();
      });
    });
  });
});
