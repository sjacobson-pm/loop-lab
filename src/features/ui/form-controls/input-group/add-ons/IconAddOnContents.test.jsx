import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { IconAddOnContents } from './IconAddOnContents';

// **********************************************************************
// * constants

const defaultProps = {
  icon: faker.string.alpha(10),
  disabled: faker.datatype.boolean(),
  extendedContainerClass: faker.string.alpha(10),
  onClick: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => <IconAddOnContents {...props} />;

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');

// **********************************************************************
// * unit tests

describe('IconAddOnContents', () => {
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

  describe('icon container', () => {
    it.each([
      { extendedContainerClass: undefined, onClick: undefined, expected: 'icon' },
      { extendedContainerClass: 'extra-class', onClick: undefined, expected: 'icon extra-class' },
      { extendedContainerClass: undefined, onClick: () => {}, expected: 'icon clickable' },
      { extendedContainerClass: 'extra-class', onClick: () => {}, expected: 'icon extra-class clickable' },
    ])('has correct class', ({ extendedContainerClass, onClick, expected }) => {
      // * ARRANGE
      const props = { ...defaultProps, extendedContainerClass, onClick };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getByRole('add-on-icon')).toHaveClass(expected);
    });

    it('invokes onClick when clicked and disabled is false', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onClick = vi.fn();
      const props = { ...defaultProps, disabled: false, onClick };

      // * ACT
      render(getComponentToRender(props));
      expect(onClick).not.toHaveBeenCalled();
      const container = screen.getByRole('add-on-icon');
      await user.click(container);

      // * ASSERT
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not invoke onClick when clicked and disabled is true', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onClick = vi.fn();
      const props = { ...defaultProps, disabled: true, onClick };

      // * ACT
      render(getComponentToRender(props));
      expect(onClick).not.toHaveBeenCalled();
      const container = screen.getByRole('add-on-icon');
      await user.click(container);

      // * ASSERT
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('FontAwesomeIcon', () => {
    it('has correct icon', () => {
      // * ARRANGE
      const icon = faker.string.alpha(10);
      const props = { ...defaultProps, icon };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getByText('FontAwesomeIcon')).toHaveAttribute('data-icon', JSON.stringify(icon));
    });
  });
});
