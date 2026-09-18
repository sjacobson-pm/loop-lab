import { useShallow } from 'zustand/react/shallow';

import styles from '../SideBar.module.css';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { useAppInsights } from 'features/logging/appInsights/useAppInsights';
import { useSideBarStore } from '../store/sideBarStore';

import { MenuItem } from './MenuItem';

const ExpanderMenuItem = () => {
  // **********************************************************************
  // * constants / component vars

  const TITLE__EXPANDED = 'click to minimize the side bar';
  const TITLE_COLLAPSED = 'click to keep the side bar open';

  const appInsights = useAppInsights();
  const { classicSolidIcons } = fontAwesomeConfig;

  const sideBar = useSideBarStore(useShallow((state) => ({ isExpanded: state.isExpanded, toggle: state.toggle })));
  const title = sideBar.isExpanded ? TITLE__EXPANDED : TITLE_COLLAPSED;
  const icon = sideBar.isExpanded ? classicSolidIcons.faAngleDoubleLeft : classicSolidIcons.faAngleDoubleRight;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  const handleExpanderClicked = () => {
    appInsights.trackSideBarExpanderClicked(sideBar.isExpanded);
    sideBar.toggle();
  };

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return <MenuItem icon={icon} title={title} onClick={handleExpanderClicked} menuItemClass={styles.expander} />;
};

export { ExpanderMenuItem };
