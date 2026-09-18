import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { AuthInProgress } from '../AuthInProgress';

const MicrosoftAuthInProgress = () => {
  // **********************************************************************
  // * constants / component vars

  const { brandIcons } = fontAwesomeConfig;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return <AuthInProgress authTypeName="Microsoft" authTypeIcon={brandIcons.faMicrosoft} />;
};

export { MicrosoftAuthInProgress };
