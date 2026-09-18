import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { constants } from 'configs/constants';
import { useSideBarStore } from 'features/ui/side-bar/store/sideBarStore';
import { useSiteHeaderStore } from 'features/ui/site-header/store/siteHeaderStore';

const usePageSetup = ({ title = constants.APP_NAME, subtitle = '', showSideBar = false }) => {
  // **********************************************************************
  // * constants / component vars

  const { setPageTitle, setPageSubtitle } = useSiteHeaderStore(
    useShallow((state) => ({ setPageTitle: state.setPageTitle, setPageSubtitle: state.setPageSubtitle }))
  );

  const sideBar = useSideBarStore(useShallow((state) => ({ hide: state.hide, show: state.show })));

  // **********************************************************************
  // * side effects

  useEffect(
    function setupPage() {
      setPageTitle(title);
      setPageSubtitle(subtitle);

      if (showSideBar) {
        sideBar.show();
      } else {
        sideBar.hide();
      }
    },
    [setPageSubtitle, setPageTitle, showSideBar, sideBar, subtitle, title]
  );
};

export { usePageSetup };
