export const FontAwesomeIcon = ({ icon, size, className, spinPulse, role, onClick }) => (
  <div
    data-icon={JSON.stringify(icon)}
    data-size={JSON.stringify(size)}
    data-spin-pulse={JSON.stringify(spinPulse)}
    role={role}
    className={className}
    onClick={onClick}>
    FontAwesomeIcon
  </div>
);
