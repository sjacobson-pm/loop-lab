import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { AlertBase } from './AlertBase';

const ErrorAlert = ({ displayText, error }) => {
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
    <AlertBase variant="danger" icon={classicSolidIcons.faTriangleExclamation} displayText={displayText}>
      <hr />
      <div className="tw:text-base">
        <div>error: {error.message}</div>
        {error.traceId ? <div>trace-id: {error.traceId}</div> : null}
      </div>
    </AlertBase>
  );
};

export { ErrorAlert };
