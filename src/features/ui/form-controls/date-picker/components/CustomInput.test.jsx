import { faker } from '@faker-js/faker';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { INPUT_GROUP_ADD_ON_TYPE } from 'features/ui/form-controls/input-group/add-ons/enums/inputGroupAddOnType';

import { CustomInput } from './CustomInput';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  placeholder: faker.lorem.words(2),
  disabled: faker.datatype.boolean(),
  onClick: vi.fn(),
  type: 'text',
  'aria-label': faker.lorem.word(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <CustomInput {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('configs/fontAwesomeConfig');
vi.mock('features/ui/form-controls/input-group/InputGroup');

// **********************************************************************
// * unit tests

describe('CustomInput', () => {
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

  describe('InputGroup appendAddOns', () => {
    it('adds exactly one append add-on for the calendar', () => {
      // * ARRANGE
      const expectedAddOn = {
        addOnType: INPUT_GROUP_ADD_ON_TYPE.icon,
        icon: fontAwesomeConfig.classicSolidIcons.faCalendarDays,
        disabled: defaultProps.disabled,
        extendedContainerClass: 'visible-disabled',
      };

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      const inputGroup = screen.getByText('InputGroup');
      const appendAddOns = within(inputGroup).getAllByText('AppendAddOns');
      expect(appendAddOns).toHaveLength(1);
      expect(appendAddOns[0]).toHaveTextContent(JSON.stringify(expectedAddOn));
    });

    it('invokes onClick when the add-on is clicked', async () => {
      // * ARRANGE
      const user = userEvent.setup();

      // * ACT
      render(getComponentToRender(defaultProps));
      const onClickTrigger = screen.getByText('append-add-on--on-click-trigger-0');
      await user.click(onClickTrigger);

      // * ASSERT
      expect(defaultProps.onClick).toHaveBeenCalledOnce();
    });
  });

  describe('input element', () => {
    it('forwards standard props to the input element', () => {
      // * ARRANGE
      const placeholder = faker.lorem.words(3);
      const ariaLabel = faker.lorem.word();
      const props = { ...defaultProps, placeholder, 'aria-label': ariaLabel };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const input = screen.getByPlaceholderText(placeholder);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-label', ariaLabel);
      expect(input).toHaveAttribute('type', 'text');
    });

    it('forwards the ref to the underlying input element', () => {
      // * ARRANGE
      const ref = createRef();
      const props = { ...defaultProps, placeholder: 'ref-test' };

      // * ACT
      render(<CustomInput ref={ref} {...props} />);

      // * ASSERT
      expect(ref.current).not.toBeNull();
      expect(ref.current.tagName).toBe('INPUT');
      expect(ref.current.placeholder).toBe('ref-test');
    });
  });
});
