import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Alert from 'react-bootstrap/Alert';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { useTheme } from '../theme/useTheme';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  // **********************************************************************
  // * constants / component vars

  const { classicRegularIcons } = fontAwesomeConfig;
  const { isDarkTheme } = useTheme();
  const pmLogoImgSrc = isDarkTheme ? '/pm-logo--wide--reverse.png' : '/pm-logo--wide--color.png';
  const showErrorMessage = error instanceof Error;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div className="tw:flex tw:flex-col tw:items-center tw:justify-center tw:px-4 tw:py-16 tw:text-center">
      <img src={pmLogoImgSrc} alt="plante moran logo" className="tw:mb-8 tw:h-16 tw:md:h-20 tw:lg:h-24" />

      <h1 className="display-1 tw:mb-8">
        <FontAwesomeIcon icon={classicRegularIcons.faFaceFrown} />
      </h1>

      <Alert variant="danger" className="tw:text-sm tw:md:text-base tw:lg:text-lg">
        <Alert.Heading>Oops! Something went wrong!</Alert.Heading>
        <p>
          An unexpected error has occurred. You may attempt to retry the action again, using the button below.
          <br />
          If the problem persists, please contact the help desk.
        </p>
        {showErrorMessage ? <p className="tw:mb-0 tw:font-mono">Error: {error.message}</p> : null}
      </Alert>

      <button type="button" className="btn btn-danger tw:mt-8" onClick={resetErrorBoundary}>
        Retry
      </button>
    </div>
  );
};

export { ErrorFallback };
