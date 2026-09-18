import { useShallow } from 'zustand/react/shallow';

import styles from './SideBar.module.css';
import { useSideBarStore } from './store/sideBarStore';

import { ExpanderMenuItem } from './menu-items/ExpanderMenuItem';
import { MenuItem } from './menu-items/MenuItem';

const SideBar = () => {
  // **********************************************************************
  // * constants / component vars

  const NAV_CLASS__EXPANDED = styles.expanded;
  const NAV_CLASS__COLLAPSED = styles.collapsed;

  const sideBar = useSideBarStore(
    useShallow((state) => ({ isVisible: state.isVisible, isExpanded: state.isExpanded }))
  );

  const sideBarExpandedClass = sideBar.isExpanded ? NAV_CLASS__EXPANDED : NAV_CLASS__COLLAPSED;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  if (!sideBar.isVisible) {
    return null;
  }

  return (
    <nav className={`${styles.sideBar} ${sideBarExpandedClass}`}>
      {/* add menu items here; they will appear at the top of the side bar, working downwards */}
      {/* EXAMPLE: <LinkMenuItem to="/page-route" label="Item Label" useLabelAsTitle icon={classicSolidIcons.someIcon} /> */}

      {/* separator / filler */}
      <MenuItem menuItemClass={styles.filler} />

      {/* you can add more links here (at the bottom of the side bar as needed)... e.g. for a user settings item */}
      {/* EXAMPLE: <LinkMenuItem to="/user-settings" label="User Settings" useLabelAsTitle icon={classicSolidIcons.faSliders} /> */}

      {/* side bar expander */}
      <ExpanderMenuItem />
    </nav>
  );
};

export { SideBar };
