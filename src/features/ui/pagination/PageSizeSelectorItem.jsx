const PageSizeSelectorItem = ({ label, isActive, isDisabled, onClick }) => {
  // **********************************************************************
  // * constants / component vars

  const activeClass = isActive ? ' active' : '';
  const disabledClass = isDisabled ? ' disabled' : '';
  const buttonClass = `list-group-item list-group-item-action${activeClass}${disabledClass}`;

  const onButtonClick = isDisabled
    ? undefined
    : onClick && typeof label === 'number'
      ? () => onClick(label)
      : undefined;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <button type="button" className={buttonClass} onClick={onButtonClick}>
      {label}
    </button>
  );
};

export { PageSizeSelectorItem };
