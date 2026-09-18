import { forwardRef } from 'react';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { INPUT_GROUP_ADD_ON_TYPE } from 'features/ui/form-controls/input-group/add-ons/enums/inputGroupAddOnType';

import { InputGroup } from 'features/ui/form-controls/input-group/InputGroup';

/**
 * Custom input component for the date picker that includes a calendar icon add-on.
 *
 * @note we're using the whole props object here instead of destructuring into separate vars
 * - these props are passed from the react-datepicker
 * - we want to ensure we have all the props and thus, shouldn't destructure
 */
const CustomInput = forwardRef(function CustomInput(props, ref) {
  // **********************************************************************
  // * constants / component vars

  const { classicSolidIcons } = fontAwesomeConfig;

  const appendAddOns = [
    // add-on for the calendar icon
    {
      addOnType: INPUT_GROUP_ADD_ON_TYPE.icon,
      icon: classicSolidIcons.faCalendarDays,
      disabled: props.disabled,
      extendedContainerClass: 'visible-disabled',
      onClick: props.onClick,
    },
  ];

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <InputGroup {...{ appendAddOns }}>
      <input {...props} ref={ref} />
    </InputGroup>
  );
});

export { CustomInput };
