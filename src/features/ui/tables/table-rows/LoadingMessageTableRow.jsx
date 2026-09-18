import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

import { MessageTableRow } from './MessageTableRow';

const LoadingMessageTableRow = ({ loadingMessage, colSpan, className }) => {
  // **********************************************************************
  // * constants / component vars

  const { classicSolidIcons } = fontAwesomeConfig;
  const rowClassName = `loading-message-table-row ${className}`.trim();

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <MessageTableRow colSpan={colSpan} className={rowClassName}>
      <FontAwesomeIcon icon={classicSolidIcons.faSpinner} spinPulse size="xl" />
      &ensp;{loadingMessage}
    </MessageTableRow>
  );
};

export { LoadingMessageTableRow };
