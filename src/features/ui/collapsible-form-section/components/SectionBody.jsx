import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import styles from '../CollapsibleFormSection.module.css';

const SectionBody = ({ isCollapsed, onCollapsedContentClick, children }) => {
  // **********************************************************************
  // * constants / component vars

  const { classicSolidIcons } = fontAwesomeConfig;

  const bodyClass = styles.sectionBody + (isCollapsed ? ' ' + styles.collapsed : '');

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div className={bodyClass} role="section-body">
      <div className={styles.expandedContent}>{children}</div>

      <div className={styles.collapsedContent} role="collapsed-content" onClick={onCollapsedContentClick}>
        <FontAwesomeIcon icon={classicSolidIcons.faEllipsis} />
      </div>
    </div>
  );
};

export { SectionBody };
