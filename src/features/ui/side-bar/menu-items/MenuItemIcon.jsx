import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import styles from '../SideBar.module.css';

const MenuItemIcon = ({ icon, counter }) => {
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
    <div className={styles.sideBarMenuItemIcon}>
      <span className="fa-layers fa-fw">
        <FontAwesomeIcon icon={icon} />
        {!!counter && (
          <span className="fa-layers-counter" role="counter">
            {counter}
          </span>
        )}
      </span>
    </div>
  );
};

export { MenuItemIcon };
