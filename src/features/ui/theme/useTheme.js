import { useThemeStore } from './store/themeStore';
import { applyBootstrapTheme, setStoredThemeName, THEMES } from './themes';

function useTheme() {
  // **********************************************************************
  // * constants / variables

  const { theme, setTheme, isDarkTheme } = useThemeStore();

  // **********************************************************************
  // * functions

  const toggleTheme = () => {
    const newTheme = theme === THEMES.dark ? THEMES.light : THEMES.dark;
    setTheme(newTheme);
    applyBootstrapTheme(newTheme);
    setStoredThemeName(newTheme);
  };

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * return value

  return { isDarkTheme, toggleTheme };
}

export { useTheme };
