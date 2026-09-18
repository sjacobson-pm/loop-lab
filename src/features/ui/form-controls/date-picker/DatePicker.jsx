import ReactDatePicker from 'react-datepicker';

import { FormattingStrings } from 'utils/dates';

import { CustomInput } from 'features/ui/form-controls/date-picker/components/CustomInput';

let DatePicker = ({ name, value, placeholder, minDate, disabled, onChange, ...rest }) => {
  // **********************************************************************
  // * constants / component vars

  const datePickerProps = { id: name, name, selected: value, placeholderText: placeholder, minDate, disabled };

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  /**
   * Handler for when the date changes.
   *  - invoke onChange with the following args
   *    - the new date
   *    - the control name
   */
  const handleDateChange = (date) => onChange({ target: { name, value: date } });

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <ReactDatePicker
      {...datePickerProps}
      className="form-control"
      dateFormat={FormattingStrings.date}
      isClearable={false}
      showPopperArrow={false}
      onChange={handleDateChange}
      customInput={<CustomInput />}
      {...rest}
    />
  );
};

export { DatePicker };
