import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { AlertBase } from './AlertBase';

const LoadingAlert = ({ displayText }) => {
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

  return <AlertBase variant="info" icon={classicSolidIcons.faSpinner} iconSpinPulse displayText={displayText} />;
};

export { LoadingAlert };
