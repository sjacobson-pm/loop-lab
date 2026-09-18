import { NavLink } from 'react-router';

import styles from '../SideBar.module.css';

import { MenuItemContents } from './MenuItemContents';

const LinkMenuItem = ({ to, label, title: titleProp, useLabelAsTitle, icon }) => {
  // **********************************************************************
  // * constants / component vars

  // if useLabelAsTitle is true, use the label as the title, else use the title
  const title = useLabelAsTitle ? label : titleProp;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  const handleNavLinkClick = (event) => {
    const classList = event.currentTarget.className.split(' ');

    // if the menu item is active, prevent the default behavior
    // there is no need to navigate to the same page
    if (classList.includes('active')) {
      event.preventDefault();
    }
  };

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <NavLink end to={to} title={title} className={styles.sideBarMenuItem} onClick={handleNavLinkClick}>
      <MenuItemContents label={label} icon={icon} />
    </NavLink>
  );
};

export { LinkMenuItem };
