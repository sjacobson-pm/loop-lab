export const AlertBase = ({ variant, icon, iconSpinPulse, displayText, children }) => (
  <div>
    <div
      data-variant={JSON.stringify(variant)}
      data-icon={JSON.stringify(icon)}
      data-icon-spin-pulse={JSON.stringify(iconSpinPulse)}
      data-display-text={JSON.stringify(displayText)}>
      AlertBase
    </div>
    {children}
  </div>
);
