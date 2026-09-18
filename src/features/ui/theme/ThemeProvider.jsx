import { useEffect } from 'react';

import { useThemeStore } from './store/themeStore';
import { applyBootstrapTheme, getPreferredTheme } from './themes';

const ThemeProvider = ({ children }) => {
  // **********************************************************************
  // * constants / component vars

  const { setTheme } = useThemeStore();

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  useEffect(
    function initializeTheme() {
      const preferredTheme = getPreferredTheme();
      applyBootstrapTheme(preferredTheme);
      setTheme(preferredTheme);
    },
    [setTheme]
  );

  // **********************************************************************
  // * render

  return <>{children}</>;
};

export { ThemeProvider };
