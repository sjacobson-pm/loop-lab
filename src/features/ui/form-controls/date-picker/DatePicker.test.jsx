import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import ReactDatePicker from 'react-datepicker';
import { describe, expect, it, vi } from 'vitest';

import { mockEventValues } from 'testing/fakes/_external/react-datepicker';

import userEvent from '@testing-library/user-event';
import { DatePicker } from './DatePicker';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  name: faker.string.alpha(10),
  selected: faker.date.soon(),
  placeholder: faker.string.alpha(10),
  minDate: faker.date.past(),
  disabled: false,
  onChange: vi.fn(),
};

const eventValues = mockEventValues();

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <DatePicker {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('react-datepicker');
vi.mock('features/ui/form-controls/date-picker/components/CustomInput', () => ({
  CustomInput: () => <div>CustomInput</div>,
}));

// **********************************************************************
// * unit tests

describe('DatePicker', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBeTrue();
  });

  it('has correct id prop', () => {
    const expectedId = defaultProps.name;
    render(getComponentToRender(defaultProps));
    const datePicker = screen.getByText('ReactDatePicker');
    expect(datePicker).toHaveAttribute('id', expectedId);
  });

  it('has correct name prop', () => {
    const expectedName = defaultProps.name;
    render(getComponentToRender(defaultProps));
    const datePicker = screen.getByText('ReactDatePicker');
    expect(datePicker).toHaveAttribute('name', expectedName);
  });

  it('has correct selected prop', () => {
    const expectedSelected = defaultProps.selected;
    render(getComponentToRender(defaultProps));
    const datePicker = screen.getByText('ReactDatePicker');
    expect(datePicker).toHaveAttribute('selected', expectedSelected.toString());
  });

  it('has correct placeholderText prop', () => {
    const expectedPlaceholderText = defaultProps.placeholder;
    render(getComponentToRender(defaultProps));
    const datePicker = screen.getByText('ReactDatePicker');
    expect(datePicker).toHaveAttribute('placeholdertext', expectedPlaceholderText);
  });

  it('has correct minDate prop', () => {
    const expectedMinDate = defaultProps.minDate;
    render(getComponentToRender(defaultProps));
    const datePicker = screen.getByText('ReactDatePicker');
    expect(datePicker).toHaveAttribute('mindate', expectedMinDate.toString());
  });

  it('is disabled when disabled prop is true', () => {
    const expectedDisabled = true;
    render(getComponentToRender({ ...defaultProps, disabled: expectedDisabled }));
    const datePicker = screen.getByText('ReactDatePicker');
    expect(datePicker).toBeDisabled();
  });

  it('is enabled when disabled prop is false', () => {
    const expectedDisabled = false;
    render(getComponentToRender({ ...defaultProps, disabled: expectedDisabled }));
    const datePicker = screen.getByText('ReactDatePicker');
    expect(datePicker).toBeEnabled();
  });

  it('invokes onChange when a date is selected', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const MockReactDatePicker = ({ onChange }) => (
      <button type="button" onClick={() => onChange(eventValues.onChange)}>
        event-trigger--on-change
      </button>
    );
    ReactDatePicker.mockImplementation(MockReactDatePicker);
    const expectedEventArgs = { target: { name: defaultProps.name, value: eventValues.onChange } };

    // * ACT
    render(getComponentToRender(defaultProps));
    const onChangeTrigger = screen.getByText('event-trigger--on-change');
    await user.click(onChangeTrigger);

    // * ASSERT
    expect(defaultProps.onChange).toHaveBeenCalledOnce();
    expect(defaultProps.onChange).toHaveBeenCalledWith(expectedEventArgs);
  });
});
