import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import styles from '../CollapsibleFormSection.module.css';

const SectionHeader = ({ title, onClick, isCollapsed }) => {
  // **********************************************************************
  // * constants / component vars

  const { classicSolidIcons } = fontAwesomeConfig;

  // collapsed icon type is determined by the collapsed state
  const collapseIconType = isCollapsed ? classicSolidIcons.faCaretUp : classicSolidIcons.faCaretDown;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div className={styles.sectionHeader} onClick={onClick}>
      <div className={styles.title}>{title}</div>
      <FontAwesomeIcon icon={collapseIconType} />
    </div>
  );
};

export { SectionHeader };
