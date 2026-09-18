import { Outlet } from 'react-router';

import { SideBar } from '../side-bar/SideBar';
import { SiteHeader } from '../site-header/SiteHeader';

const AppLayout = () => {
  // **********************************************************************
  // * constants / component vars

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div className="tw:flex tw:h-full tw:flex-col tw:font-sans">
      {/* header */}
      <div className="tw:flex-shrink-0 tw:flex-grow-0">
        <SiteHeader />
      </div>

      {/* body */}
      <div className="tw:flex tw:flex-grow tw:flex-nowrap tw:items-stretch tw:justify-start tw:overflow-hidden">
        {/* side bar */}
        <div className="tw:flex-grow-0">
          <SideBar />
        </div>

        {/* main content */}
        <div className="tw:flex tw:flex-grow tw:flex-col tw:overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export { AppLayout };
