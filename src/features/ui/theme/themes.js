import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

// import modules that are used as internal methods; this allows mocking the internal modules during testing
// * NOTE: ES6 modules support cyclic dependencies automatically, so it is perfectly valid to import a module
// *       into itself so that functions within the module can call the module export for other functions in the module
import { HelperMethods as InternalMethods } from './themes';

// **********************************************************************
// * constants

const { classicSolidIcons } = fontAwesomeConfig;

const dark = Object.freeze({ name: 'dark', label: 'Dark Mode', icon: classicSolidIcons.faMoonStars });
const light = Object.freeze({ name: 'light', label: 'Light Mode', icon: classicSolidIcons.faSunBright });

const THEMES = Object.freeze({ dark, light });

// **********************************************************************
// * functions

/**
 * Apply the bootstrap theme to the HTML document.
 * @param theme The theme to set.
 */
const applyBootstrapTheme = (theme) => document.documentElement.setAttribute('data-bs-theme', theme.name);

/**
 * Get the user's preferred theme.
 * @returns The preferred theme.
 */
const getPreferredTheme = () => {
  // get the stored theme name from local storage
  const storedThemeName = InternalMethods.getStoredThemeName();

  // ensure the stored theme name is valid
  // if it is, return it
  if (storedThemeName && THEMES[storedThemeName]) {
    return THEMES[storedThemeName];
  }

  // otherwise, return the light theme as the default
  // * note: in the future, we will default to the users "preferred" / system theme
  return THEMES.light;

  // otherwise, return the preferred theme based on the user's system preferences
  // return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.dark : THEMES.light;
};

/**
 * Sets the stored theme name in local storage.
 * @param theme The theme containing the name to store.
 */
const setStoredThemeName = (theme) => localStorage.setItem('selected-theme-name', theme.name);

export class HelperMethods {
  /**
   * Get the stored theme name from local storage.
   * @returns The stored theme name, or null if there is no stored theme name.
   */
  static getStoredThemeName = () => localStorage.getItem('selected-theme-name');
}

export { applyBootstrapTheme, getPreferredTheme, setStoredThemeName, THEMES };
