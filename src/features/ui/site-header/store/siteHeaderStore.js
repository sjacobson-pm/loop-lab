import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { constants } from 'configs/constants';

// **********************************************************************
// * variables

const actionPrefix = 'siteHeader/';
const devToolsStoreName = `${constants.APP_ABBR} | SiteHeaderStore`;

const initialState = {
  pageTitle: constants.APP_NAME,
  pageSubtitle: '',
};

// **********************************************************************
// * store

const useSiteHeaderStore = create()(
  devtools(
    (set) => ({
      ...initialState,
      setPageTitle: (pageTitle) => set({ pageTitle }, undefined, `${actionPrefix}setPageTitle`),
      setPageSubtitle: (pageSubtitle) => set({ pageSubtitle }, undefined, `${actionPrefix}setPageSubtitle`),
    }),
    { name: devToolsStoreName }
  )
);

// **********************************************************************
// * exports

export { initialState, useSiteHeaderStore };
