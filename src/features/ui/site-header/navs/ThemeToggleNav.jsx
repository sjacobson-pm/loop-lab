import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { useAppInsights } from 'features/logging/appInsights/useAppInsights';
import { useTheme } from 'features/ui/theme/useTheme';
import styles from '../SiteHeader.module.css';

const ThemeToggleNav = () => {
  // **********************************************************************
  // * constants / component vars

  const appInsights = useAppInsights();
  const { isDarkTheme, toggleTheme } = useTheme();

  const themeIcon = isDarkTheme
    ? fontAwesomeConfig.classicSolidIcons.faMoonStars
    : fontAwesomeConfig.classicSolidIcons.faSunBright;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  const handleThemeToggle = () => {
    appInsights.trackThemeToggleClicked(isDarkTheme);
    toggleTheme();
  };

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <button className={`btn btn-link ${styles.navLink}`} onClick={handleThemeToggle}>
      <FontAwesomeIcon icon={themeIcon} size="xl" />
    </button>
  );
};

export { ThemeToggleNav };
