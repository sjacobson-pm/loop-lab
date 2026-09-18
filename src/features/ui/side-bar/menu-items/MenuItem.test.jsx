import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import styles from '../SideBar.module.css';

import { MenuItem } from './MenuItem';

// **********************************************************************
// * constants

const defaultProps = {
  label: faker.string.alphanumeric(10),
  icon: faker.helpers.arrayElement(Object.values(fontAwesomeConfig.classicSolidIcons)),
  title: faker.string.alphanumeric(10),
  useLabelAsTitle: faker.datatype.boolean(),
  isActive: faker.datatype.boolean(),
  isInvalid: faker.datatype.boolean(),
  counter: faker.number.int(),
  menuItemClass: faker.string.alphanumeric(10),
  onClick: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <MenuItem {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('./MenuItemContents', () => ({ MenuItemContents: () => <div>MenuItemContents</div> }));

// **********************************************************************
// * unit tests

describe('MenuItem', () => {
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

  describe('MenuItem', () => {
    it('has correct class when isActive is true', () => {
      // * ARRANGE
      const props = { ...defaultProps, isActive: true };
      const expectedClass = `${styles.sideBarMenuItem} active`;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const menuItem = screen.getByRole('button');
      expect(menuItem).toHaveClass(expectedClass);
    });

    it('has correct class when isInvalid is true', () => {
      // * ARRANGE
      const props = { ...defaultProps, isInvalid: true };
      const expectedClass = `${styles.sideBarMenuItem} ${styles.invalid}`;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const menuItem = screen.getByRole('button');
      expect(menuItem).toHaveClass(expectedClass);
    });

    it('has correct class when menuItemClass is set', () => {
      // * ARRANGE
      const menuItemClass = faker.lorem.slug();
      const props = { ...defaultProps, menuItemClass };
      const expectedClass = `${styles.sideBarMenuItem} ${menuItemClass}`;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const menuItem = screen.getByRole('button');
      expect(menuItem).toHaveClass(expectedClass);
    });

    it('has correct title when useLabelAsTitle is true', () => {
      // * ARRANGE
      const props = { ...defaultProps, useLabelAsTitle: true };
      const expectedTitle = props.label;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const menuItem = screen.getByRole('button');
      expect(menuItem).toHaveAttribute('title', expectedTitle);
    });

    it('has correct title when useLabelAsTitle is false', () => {
      // * ARRANGE
      const props = { ...defaultProps, useLabelAsTitle: false };
      const expectedTitle = props.title;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const menuItem = screen.getByRole('button');
      expect(menuItem).toHaveAttribute('title', expectedTitle);
    });

    it('invokes onClick when clicked', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const props = { ...defaultProps };

      // * ACT
      render(getComponentToRender(props));
      const menuItem = screen.getByRole('button');
      await user.click(menuItem);

      // * ASSERT
      expect(props.onClick).toHaveBeenCalledOnce();
    });
  });
});
