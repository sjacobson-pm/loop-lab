import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ButtonAddOn } from './ButtonAddOn';

// **********************************************************************
// * constants

const defaultProps = {
  text: faker.string.alpha(10),
  variant: faker.string.alpha(10),
  disabled: faker.datatype.boolean(),
  onClick: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => <ButtonAddOn {...props} />;

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('ButtonAddOn', () => {
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

  describe('button', () => {
    it('invokes onClick when the button is clicked and it is not disabled', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onClick = vi.fn();
      const disabled = false;
      const props = { ...defaultProps, onClick, disabled };

      // * ACT
      render(getComponentToRender(props));
      expect(onClick).not.toHaveBeenCalled();
      await user.click(screen.getByText(defaultProps.text));

      // * ASSERT
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not invoke onClick when the button is clicked and it is disabled', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onClick = vi.fn();
      const disabled = true;
      const props = { ...defaultProps, onClick, disabled };

      // * ACT
      render(getComponentToRender(props));
      expect(onClick).not.toHaveBeenCalled();
      await user.click(screen.getByText(defaultProps.text));

      // * ASSERT
      expect(onClick).not.toHaveBeenCalled();
    });

    it('has correct text', () => {
      const expectedText = defaultProps.text;
      render(getComponentToRender(defaultProps));
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('has correct variant', () => {
      const expectedVariant = `btn-${defaultProps.variant}`;
      render(getComponentToRender(defaultProps));
      expect(screen.getByRole('button')).toHaveClass(expectedVariant);
    });

    it('is disabled when disabled prop is true', () => {
      const expectedDisabled = true;
      const props = { ...defaultProps, disabled: expectedDisabled };
      render(getComponentToRender(props));
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is not disabled when disabled prop is false', () => {
      const expectedDisabled = false;
      const props = { ...defaultProps, disabled: expectedDisabled };
      render(getComponentToRender(props));
      expect(screen.getByRole('button')).toBeEnabled();
    });

    it('has type="button"', () => {
      // * ARRANGE
      const expectedType = 'button';

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      expect(screen.getByRole('button')).toHaveAttribute('type', expectedType);
    });
  });
});
