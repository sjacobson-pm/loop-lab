import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PageSizeSelectorItem } from './PageSizeSelectorItem';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  label: faker.string.alphanumeric(10),
  isActive: faker.datatype.boolean(),
  isDisabled: faker.datatype.boolean(),
  onClick: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <PageSizeSelectorItem {...props} />;
};

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('PageSizeSelectorItem', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBe(true);
  });

  it('has the active class when isActive is true', () => {
    // * ARRANGE
    const props = { ...defaultProps, isActive: true };
    const expectedClass = 'active';

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    const button = screen.getByRole('button');
    expect(button).toHaveClass(expectedClass);
  });

  it('does not have the active class when isActive is false', () => {
    // * ARRANGE
    const props = { ...defaultProps, isActive: false };
    const expectedClass = 'active';

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    const button = screen.getByRole('button');
    expect(button).not.toHaveClass(expectedClass);
  });

  it('has the disabled class when isDisabled is true', () => {
    // * ARRANGE
    const props = { ...defaultProps, isDisabled: true };
    const expectedClass = 'disabled';

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    const button = screen.getByRole('button');
    expect(button).toHaveClass(expectedClass);
  });

  it('does not have the disabled class when isDisabled is false', () => {
    // * ARRANGE
    const props = { ...defaultProps, isDisabled: false };
    const expectedClass = 'disabled';

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    const button = screen.getByRole('button');
    expect(button).not.toHaveClass(expectedClass);
  });

  it('invokes onClick when the button is clicked and isDisabled is false and the label is a number', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const props = { ...defaultProps, label: faker.number.int(), isDisabled: false };
    const expectedLabel = props.label;

    // * ACT
    render(getComponentToRender(props));
    const button = screen.getByRole('button');
    await user.click(button);

    // * ASSERT
    expect(props.onClick).toHaveBeenCalledWith(expectedLabel);
  });

  it('does nothing when the button is clicked and isDisabled is false and onClick is not defined', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const props = { ...defaultProps, label: faker.number.int(), isDisabled: false, onClick: undefined };

    // * ACT
    render(getComponentToRender(props));
    const button = screen.getByRole('button');
    await user.click(button);

    // * ASSERT
    // * NOTE: This is a no-op test. The test will pass if the button is clicked and nothing happens.
    // * there is no function to call since onClick is undefined.
    expect(true).toBe(true);
  });

  it('does not invoke onClick when the button is clicked and isDisabled is false and the label is not a number', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const props = { ...defaultProps, label: faker.string.alphanumeric(10), isDisabled: false };

    // * ACT
    render(getComponentToRender(props));
    const button = screen.getByRole('button');
    await user.click(button);

    // * ASSERT
    expect(props.onClick).not.toHaveBeenCalled();
  });

  it('does not invoke onClick when the button is clicked and isDisabled is true', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const props = { ...defaultProps, isDisabled: true };

    // * ACT
    render(getComponentToRender(props));
    const button = screen.getByRole('button');
    await user.click(button);

    // * ASSERT
    expect(props.onClick).not.toHaveBeenCalled();
  });
});
