import { useTheme } from 'features/ui/theme/useTheme';
import { usePageSetup } from 'pages/hooks/usePageSetup';

import { Link } from 'react-router';

const PageNotFound = () => {
  // **********************************************************************
  // * constants / component vars

  const PAGE_TITLE = 'Page Not Found';
  const PAGE_SUBTITLE = '';
  const SHOW_SIDE_BAR = false;

  const { isDarkTheme } = useTheme();
  const pmLogoSrc = isDarkTheme ? '/pm-logo--wide--reverse.png' : '/pm-logo--wide--color.png';

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  usePageSetup({ title: PAGE_TITLE, subtitle: PAGE_SUBTITLE, showSideBar: SHOW_SIDE_BAR });

  // **********************************************************************
  // * render

  return (
    <div className="tw:mx-12 tw:flex tw:h-full tw:flex-col tw:items-center tw:justify-center tw:gap-1">
      {/* pm logo */}
      <div className="tw:max-w-3xl">
        <img src={pmLogoSrc} alt="Plante Moran logo" className="img-fluid" />
      </div>

      {/* messages */}
      <h1 className="display-1">404</h1>
      <h2>Oops! You can&rsquo;t make your mark here.</h2>
      <p>We cannot find the page that you&rsquo;re looking for.</p>

      {/* link to home */}
      <p>
        Try the <Link to="/">home page</Link> instead. That is a good place to start.
      </p>
    </div>
  );
};

export { PageNotFound };
