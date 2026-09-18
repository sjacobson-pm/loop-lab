const PageOverlay = ({ isTranslucent, children }) => {
  // **********************************************************************
  // * constants / component vars

  const bgColor = isTranslucent
    ? 'tw:bg-white/80 tw:dark:bg-pm-granite-950/80'
    : 'tw:bg-white tw:dark:bg-pm-granite-950';

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div role="page-overlay" className={`tw:fixed tw:inset-0 tw:z-[9999] ${bgColor}`}>
      {children}
    </div>
  );
};

export { PageOverlay };
