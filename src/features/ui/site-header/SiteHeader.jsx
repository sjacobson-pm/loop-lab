import { Link } from 'react-router';
import { useShallow } from 'zustand/react/shallow';

import styles from './SiteHeader.module.css';
import { useSiteHeaderStore } from './store/siteHeaderStore';

import { ThemeToggleNav } from './navs/ThemeToggleNav';

const SiteHeader = () => {
  // **********************************************************************
  // * constants / component vars

  const { pageTitle, pageSubtitle } = useSiteHeaderStore(
    useShallow((state) => ({ pageTitle: state.pageTitle, pageSubtitle: state.pageSubtitle }))
  );

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <header className={styles.siteHeader}>
      {/* pm logo */}
      <Link to="/">
        <img src="/pm-logo-mark--reverse--small.png" alt="plante moran logo" className={styles.pmLogo} />
      </Link>

      {/* page title and subtitle */}
      <span className={styles.titlesContainer}>
        {pageTitle ? (
          <span className={styles.pageTitle} role="title">
            {pageTitle}
          </span>
        ) : null}
        {pageSubtitle ? (
          <span className={styles.pageSubtitle} role="subtitle">
            {pageSubtitle}
          </span>
        ) : null}
      </span>

      <nav className={`nav justify-content-end ${styles.nav}`}>
        <ThemeToggleNav />
      </nav>
    </header>
  );
};

export { SiteHeader };
