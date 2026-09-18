import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { constants } from 'configs/constants';

// **********************************************************************
// * variables

const actionPrefix = 'sideBar/';
const devToolsStoreName = `${constants.APP_ABBR} | SideBarStore`;

const initialState = {
  isVisible: true,
  isExpanded: false,
};

// **********************************************************************
// * store

const useSideBarStore = create()(
  devtools(
    (set) => ({
      ...initialState,
      show: () => set({ isVisible: true }, undefined, `${actionPrefix}show`),
      hide: () => set({ isVisible: false }, undefined, `${actionPrefix}hide`),
      toggle: () => set((state) => ({ isExpanded: !state.isExpanded }), undefined, `${actionPrefix}toggle`),
    }),
    { name: devToolsStoreName }
  )
);

// **********************************************************************
// * exports

export { initialState, useSideBarStore };
