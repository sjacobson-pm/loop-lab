import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

import { MessageTableRow } from './MessageTableRow';

const ErrorMessageTableRow = ({ errorMessage, colSpan, className }) => {
  // **********************************************************************
  // * constants / component vars

  const { classicSolidIcons } = fontAwesomeConfig;
  const rowClassName = `error-message-table-row ${className}`.trim();

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
      <FontAwesomeIcon icon={classicSolidIcons.faTriangleExclamation} size="xl" />
      &ensp;{errorMessage}
    </MessageTableRow>
  );
};

export { ErrorMessageTableRow };
