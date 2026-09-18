import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { AlertBase } from './AlertBase';

const SuccessAlert = ({ displayText }) => {
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

  return <AlertBase variant="success" icon={classicSolidIcons.faSquareCheck} displayText={displayText} />;
};

export { SuccessAlert };
