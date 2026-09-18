import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { constants } from 'configs/constants';
import { THEMES } from '../themes';

// **********************************************************************
// * variables

const actionPrefix = 'theme/';
const devToolsStoreName = `${constants.APP_ABBR} | ThemeStore`;

const initialState = {
  theme: THEMES.light,
  isDarkTheme: false,
};

// **********************************************************************
// * store

const useThemeStore = create()(
  devtools(
    (set) => ({
      ...initialState,
      setTheme: (theme) => {
        set({ theme, isDarkTheme: theme.name === 'dark' }, undefined, `${actionPrefix}setTheme`);
      },
    }),
    { name: devToolsStoreName }
  )
);

// **********************************************************************
// * exports

export { initialState, useThemeStore };
