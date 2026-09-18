import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

const TableRowOverlay = ({ message, details, reloadMessage, overlayType, onReload }) => {
  // **********************************************************************
  // * constants / component vars

  const typeClasses = (() => {
    switch (overlayType) {
      case 'error':
        return 'tw:bg-red-600/90 tw:text-white';
      case 'info':
        return 'tw:bg-pm-slate-600/90 tw:text-white';
    }
  })();

  const overlayClassName = `table-row-overlay ${typeClasses}`;

  const { classicSolidIcons } = fontAwesomeConfig;
  const showMessageDetails = !!details || !!reloadMessage;
  const showReloadButton = !!onReload;
  const showReloadMessage = !!reloadMessage;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div className={overlayClassName} data-testid="table-row-overlay">
      <div>
        <div className="overlay-message">{message}</div>
        {showMessageDetails ? (
          <div className="overlay-message-details" data-testid="overlay-message-details">
            {details ? <div>{details}</div> : null}
            {showReloadMessage ? <div>{reloadMessage}</div> : null}
          </div>
        ) : null}
      </div>
      {showReloadButton ? (
        <FontAwesomeIcon
          icon={classicSolidIcons.faRotateRight}
          size="xl"
          className="icon clickable"
          title="Reload"
          onClick={onReload}
          role="button"
        />
      ) : null}
    </div>
  );
};

export { TableRowOverlay };
