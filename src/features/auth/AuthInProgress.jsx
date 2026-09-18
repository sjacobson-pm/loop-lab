import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Alert from 'react-bootstrap/Alert';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

const AuthInProgress = ({ authTypeName, authTypeIcon }) => {
  // **********************************************************************
  // * constants / component vars

  const { classicSolidIcons } = fontAwesomeConfig;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div className="tw:flex tw:h-full tw:items-center tw:justify-center">
      <div className="border-secondary bg-secondary-subtle border tw:flex tw:flex-col tw:items-center tw:gap-4 tw:rounded-2xl tw:p-4">
        <div className="tw:text-5xl tw:md:text-7xl tw:lg:text-9xl">
          <FontAwesomeIcon icon={authTypeIcon} />
        </div>

        <Alert variant="info">
          <div className="tw:md:text-2xl tw:lg:text-3xl">
            {authTypeName} authentication in progress...&ensp;
            <FontAwesomeIcon icon={classicSolidIcons.faRightToBracket} beatFade />
          </div>
        </Alert>
      </div>
    </div>
  );
};

export { AuthInProgress };
