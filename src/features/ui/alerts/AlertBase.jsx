import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Alert from 'react-bootstrap/Alert';

const AlertBase = ({ variant, icon, iconSpinPulse, displayText, children }) => {
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
    <Alert variant={variant} className="tw:text-xl">
      <FontAwesomeIcon icon={icon} size="xl" spinPulse={iconSpinPulse} />
      &ensp;{displayText}
      {children}
    </Alert>
  );
};

export { AlertBase };
