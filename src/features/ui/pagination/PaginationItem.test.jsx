import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

import { PaginationItem } from './PaginationItem';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  className: faker.string.alphanumeric(10),
  label: faker.string.alphanumeric(10),
  icon: faker.helpers.arrayElement(Object.values(fontAwesomeConfig.classicSolidIcons)),
  swapLabelPosition: faker.datatype.boolean(),
  title: faker.string.alphanumeric(10),
  isActivePage: faker.datatype.boolean(),
  disabled: faker.datatype.boolean(),
  onClick: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <PaginationItem {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');

// **********************************************************************
// * unit tests

describe('PaginationItem', () => {
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

  describe('list item', () => {
    it('has the disabled class when the disabled prop is true', () => {
      const props = { ...defaultProps, disabled: true };
      render(getComponentToRender(props));
      expect(screen.getByRole('listitem')).toHaveClass('disabled');
    });

    it('does not have the disabled class when the disabled prop is false', () => {
      const props = { ...defaultProps, disabled: false };
      render(getComponentToRender(props));
      expect(screen.getByRole('listitem')).not.toHaveClass('disabled');
    });

    it('has the active class when the isActivePage prop is true', () => {
      const props = { ...defaultProps, isActivePage: true };
      render(getComponentToRender(props));
      expect(screen.getByRole('listitem')).toHaveClass('active');
    });

    it('does not have the active class when the isActivePage prop is false', () => {
      const props = { ...defaultProps, isActivePage: false };
      render(getComponentToRender(props));
      expect(screen.getByRole('listitem')).not.toHaveClass('active');
    });

    describe('button', () => {
      it('has the correct className when the className prop has a value', () => {
        // * ARRANGE
        const className = faker.string.alphanumeric(10);
        const props = { ...defaultProps, className };
        const expectedClassName = `page-link ${className}`;

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByRole('button')).toHaveClass(expectedClassName);
      });

      it('has the correct className when the className prop has no value', () => {
        // * ARRANGE
        const props = { ...defaultProps, className: undefined };
        const expectedClassName = 'page-link';

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByRole('button')).toHaveClass(expectedClassName);
      });

      it('invokes onClick when the button is clicked', async () => {
        // * ARRANGE
        const user = userEvent.setup();
        const onClick = vi.fn();
        const props = { ...defaultProps, onClick };

        // * ACT
        render(getComponentToRender(props));
        const button = screen.getByRole('button');
        await user.click(button);

        // * ASSERT
        expect(onClick).toHaveBeenCalledOnce();
      });

      it('sets the button text to [label] [icon] when swapLabelPosition is false', () => {
        // * ARRANGE
        const label = faker.string.alphanumeric(5);
        const iconNames = Object.values(fontAwesomeConfig.classicSolidIcons).map((icon) => icon.iconName);
        const icon = faker.helpers.arrayElement(iconNames);
        const props = { ...defaultProps, swapLabelPosition: false, icon, label };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        const button = screen.getByRole('button');
        const iconElement = screen.getByText('FontAwesomeIcon');
        const actualIcon = JSON.parse(iconElement.getAttribute('data-icon'));
        expect(button).toHaveTextContent(`${label} FontAwesomeIcon`);
        expect(actualIcon).toBe(icon);
      });

      it('sets the button text to [icon] [label] when swapLabelPosition is true', () => {
        // * ARRANGE
        const label = faker.string.alphanumeric(5);
        const iconNames = Object.values(fontAwesomeConfig.classicSolidIcons).map((icon) => icon.iconName);
        const icon = faker.helpers.arrayElement(iconNames);
        const props = { ...defaultProps, swapLabelPosition: true, icon, label };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        const button = screen.getByRole('button');
        const iconElement = screen.getByText('FontAwesomeIcon');
        const actualIcon = JSON.parse(iconElement.getAttribute('data-icon'));
        expect(button).toHaveTextContent(`FontAwesomeIcon ${label}`);
        expect(actualIcon).toBe(icon);
      });

      it('does not render the icon when icon does not have a value', () => {
        // * ARRANGE
        const label = faker.string.alphanumeric(5);
        const props = { ...defaultProps, icon: undefined, label };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        const button = screen.getByRole('button');
        expect(button).toHaveTextContent(label);
      });

      it('does not render the label when label does not have a value', () => {
        // * ARRANGE
        const iconNames = Object.values(fontAwesomeConfig.classicSolidIcons).map((icon) => icon.iconName);
        const icon = faker.helpers.arrayElement(iconNames);
        const props = { ...defaultProps, label: undefined, icon };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        const button = screen.getByRole('button');
        const iconElement = screen.getByText('FontAwesomeIcon');
        const actualIcon = JSON.parse(iconElement.getAttribute('data-icon'));
        expect(button).toHaveTextContent('FontAwesomeIcon');
        expect(actualIcon).toBe(icon);
      });
    });
  });
});
