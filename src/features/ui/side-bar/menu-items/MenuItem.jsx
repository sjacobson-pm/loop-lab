import styles from '../SideBar.module.css';

import { MenuItemContents } from './MenuItemContents';

const MenuItem = ({
  label,
  icon,
  title: titleProp,
  useLabelAsTitle,
  isActive,
  isInvalid,
  counter,
  menuItemClass,
  onClick,
}) => {
  // **********************************************************************
  // * constants / component vars

  const MENU_ITEM_ACTIVE_CLASS = 'active';
  const MENU_ITEM_INVALID_CLASS = styles.invalid;

  // if useLabelAsTitle is true, use the label as the title, else use the title
  const title = useLabelAsTitle ? label : titleProp;

  // **********************************************************************
  // * functions

  const buildMenuItemClassName = () => {
    let className = styles.sideBarMenuItem;

    if (isActive) {
      className += ` ${MENU_ITEM_ACTIVE_CLASS}`;
    }

    if (isInvalid) {
      className += ` ${MENU_ITEM_INVALID_CLASS}`;
    }

    if (menuItemClass) {
      className += ` ${menuItemClass}`;
    }

    return className;
  };

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div className={buildMenuItemClassName()} title={title} onClick={onClick} role="button">
      <MenuItemContents label={label} icon={icon} counter={counter} />
    </div>
  );
};

export { MenuItem };
