import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { getAppInsights } from 'features/logging/appInsights/telemetryService';

const Error = ({ error }) => {
  // **********************************************************************
  // * constants / component vars

  const { brandIcons } = fontAwesomeConfig;
  const appInsights = getAppInsights();

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  useEffect(() => {
    appInsights.trackException({ exception: error });
  }, [appInsights, error]);

  // **********************************************************************
  // * render

  return (
    <div className="container tw:mt-12 tw:p-4 tw:text-center">
      <div className="tw:mb-8 tw:text-7xl tw:lg:text-9xl">
        <FontAwesomeIcon icon={brandIcons.faMicrosoft} />
      </div>

      <Alert variant="danger">
        <Alert.Heading>A microsoft authentication error occurred!</Alert.Heading>
        <p>
          An unexpected error has occurred during authentication. You may attempt to retry the action by refreshing the
          page.
        </p>
        <p>If the problem persists, please contact the help desk.</p>
      </Alert>
    </div>
  );
};

export { Error };
