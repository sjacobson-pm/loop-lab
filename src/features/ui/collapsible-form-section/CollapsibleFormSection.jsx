import { useState } from 'react';

import styles from './CollapsibleFormSection.module.css';

import { SectionBody } from './components/SectionBody';
import { SectionHeader } from './components/SectionHeader';

const CollapsibleFormSection = ({ id, title, children }) => {
  // **********************************************************************
  // * constants / component vars

  const [isCollapsed, setIsCollapsed] = useState(false);

  // **********************************************************************
  // * functions

  const toggleCollapsedState = () => {
    setIsCollapsed(!isCollapsed);
  };

  // **********************************************************************
  // * handlers

  const handleHeaderClick = () => {
    toggleCollapsedState();
  };

  const handleCollapsedContentClick = () => {
    toggleCollapsedState();
  };

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div id={id} className={styles.collapsibleFormSection}>
      <SectionHeader title={title} isCollapsed={isCollapsed} onClick={handleHeaderClick} />
      <SectionBody isCollapsed={isCollapsed} onCollapsedContentClick={handleCollapsedContentClick}>
        {children}
      </SectionBody>
    </div>
  );
};

export { CollapsibleFormSection };
