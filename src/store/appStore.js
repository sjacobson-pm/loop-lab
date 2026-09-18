import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { constants } from 'configs/constants';

/*
 * This store is for global state management.
 * Only use this store for application-wide global state management.
 * For feature-specific state management, use a local store in the feature folder.
 */

// **********************************************************************
// * variables

// todo: uncomment and use actionPrefix if you decide to add actions to this store in the future
// const actionPrefix = 'app/';
const devToolsStoreName = `${constants.APP_ABBR} | AppStore`;

const initialState = {
  // example of a global state variable that can be used across the entire application
  // someAppWideStateVar: null,
};

// **********************************************************************
// * store

const useAppStore = create()(
  devtools(
    () => ({
      ...initialState,

      // example action to set a global state variable
      // setSomeAppWideStateVar: (value) => set({ someAppWideStateVar: value }, undefined, `${actionPrefix}setSomeAppWideStateVar`),
    }),
    { name: devToolsStoreName }
  )
);

// **********************************************************************
// * exports

export { initialState, useAppStore };
