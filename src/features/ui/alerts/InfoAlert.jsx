import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { AlertBase } from './AlertBase';

const InfoAlert = ({ displayText }) => {
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

  return <AlertBase variant="info" icon={classicSolidIcons.faCircleInfo} displayText={displayText} />;
};

export { InfoAlert };
