import { useSideBarStore } from '../store/sideBarStore';

import { MenuItemIcon } from './MenuItemIcon';
import { MenuItemLabel } from './MenuItemLabel';

const MenuItemContents = ({ label, icon, counter }) => {
  // **********************************************************************
  // * constants / component vars

  const isExpanded = useSideBarStore((state) => state.isExpanded);

  // show the icon only when we have an icon value
  const showIcon = !!icon;

  // show the label only when isExpanded is true and label has a value
  const showLabel = isExpanded && !!label;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <>
      {showIcon && <MenuItemIcon icon={icon} counter={counter} />}
      {showLabel && <MenuItemLabel label={label} />}
    </>
  );
};

export { MenuItemContents };
