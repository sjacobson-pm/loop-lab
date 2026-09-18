import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { useSideBarStore } from '../store/sideBarStore';

import { MenuItemContents } from './MenuItemContents';

// **********************************************************************
// * constants

const defaultProps = {
  label: faker.string.alphanumeric(10),
  icon: faker.helpers.arrayElement(Object.values(fontAwesomeConfig.classicSolidIcons)),
  counter: faker.number.int(),
};

let sideBarStore;

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <MenuItemContents {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('../store/sideBarStore');
vi.mock('./MenuItemIcon');
vi.mock('./MenuItemLabel');

// **********************************************************************
// * unit tests

describe('MenuItemContents', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    sideBarStore = useSideBarStore.__resetMockSideBarStore();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBe(true);
  });

  describe('MenuItemIcon', () => {
    it('is not rendered when icon is not set', () => {
      // * ARRANGE
      const props = { ...defaultProps, icon: undefined };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.queryByText('MenuItemIcon')).not.toBeInTheDocument();
    });

    it('is rendered when icon is set', () => {
      // * ARRANGE
      const props = { ...defaultProps };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getByText('MenuItemIcon')).toBeInTheDocument();
    });
  });

  describe('MenuItemLabel', () => {
    it('is not rendered when the side bar is not expanded', () => {
      // * ARRANGE
      sideBarStore.isExpanded = false;
      const props = { ...defaultProps };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.queryByText('MenuItemLabel')).not.toBeInTheDocument();
    });

    it('is not rendered when the side bar is expanded and the label is not set', () => {
      // * ARRANGE
      sideBarStore.isExpanded = true;
      const props = { ...defaultProps, label: undefined };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.queryByText('MenuItemLabel')).not.toBeInTheDocument();
    });

    it('is rendered when the side bar is expanded and the label is set', () => {
      // * ARRANGE
      sideBarStore.isExpanded = true;
      const props = { ...defaultProps };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getByText('MenuItemLabel')).toBeInTheDocument();
    });

    it('has correct label when the side bar is expanded and the label is set', () => {
      // * ARRANGE
      sideBarStore.isExpanded = true;
      const props = { ...defaultProps };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const label = screen.getByText('MenuItemLabel');
      expect(label.attributes['data-label'].value).toBe(props.label);
    });
  });
});
