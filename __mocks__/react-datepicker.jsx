import { vi } from 'vitest';

const ReactDatePicker = ({
  id,
  name,
  selected,
  minDate,
  placeholderText,
  disabled,
  className,
  dateFormat,
  isClearable,
  showPopperArrow,
  customInput,
}) => {
  const props = {
    id,
    name,
    selected,
    minDate,
    placeholderText,
    disabled,
    className,
    dateFormat,
    isClearable,
    showPopperArrow,
  };
  return (
    <fake-react-datepicker {...props}>
      ReactDatePicker
      {customInput}
    </fake-react-datepicker>
  );
};

const ReactDatePickerMock = vi.fn(ReactDatePicker);

export default ReactDatePickerMock;
