import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/*
  =================================================================================================
  PAGINATION ITEM EXAMPLES
  =================================================================================================
  * label only:                                   [12]
  * icon only:                                    [>>]
  * label and icon, swap label position = false:  [next page >]
  * label and icon, swap label position = true:   [< prev page]
*/

const PaginationItem = ({ className, label, icon, swapLabelPosition, title, isActivePage, disabled, onClick }) => {
  // **********************************************************************
  // * constants / component vars

  const disabledClassName = disabled ? 'disabled' : '';
  const isActivePageClassName = isActivePage ? 'active' : '';
  const pageItemClassName = `page-item ${disabledClassName} ${isActivePageClassName}`;
  const buttonClassName = `page-link ${className ?? ''}`;

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <li className={pageItemClassName}>
      <button className={buttonClassName} onClick={onClick} title={title}>
        {/*
          if label has a value AND swapLabelPosition is false
            - render the label
            - add a space after the label if icon has a value
        */}
        {!!label && !swapLabelPosition && label}
        {!!label && !swapLabelPosition && !!icon && ' '}

        {/* if icon has a value, render the icon */}
        {!!icon && <FontAwesomeIcon icon={icon} />}

        {/*
          if label has a value AND swapLabelPosition is true
            - add a space before the label if icon has a value
            - render the label
        */}
        {!!label && swapLabelPosition && !!icon && ' '}
        {!!label && swapLabelPosition && label}
      </button>
    </li>
  );
};

export { PaginationItem };
