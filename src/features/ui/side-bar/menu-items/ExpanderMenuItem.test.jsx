import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { useSideBarStore } from '../store/sideBarStore';

import { ExpanderMenuItem } from './ExpanderMenuItem';

// **********************************************************************
// * constants

let sideBarStore;

// **********************************************************************
// * functions

const getComponentToRender = () => {
  return <ExpanderMenuItem />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('features/logging/appInsights/useAppInsights');
vi.mock('../store/sideBarStore');
vi.mock('./MenuItem');

// **********************************************************************
// * unit tests

describe('ExpanderMenuItem', () => {
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
    render(getComponentToRender());
    expect(true).toBe(true);
  });

  describe('when side bar is expanded', () => {
    beforeEach(() => {
      sideBarStore.isExpanded = true;
    });

    it('has the correct title', () => {
      // * ARRANGE
      const expectedTitle = 'click to minimize the side bar';

      // * ACT
      render(getComponentToRender());

      // * ASSERT
      const menuItem = screen.getByText('MenuItem');
      expect(menuItem).toHaveAttribute('data-title', expectedTitle);
    });

    it('has the correct icon', () => {
      // * ARRANGE
      const expectedIcon = JSON.stringify(fontAwesomeConfig.classicSolidIcons.faAngleDoubleLeft);

      // * ACT
      render(getComponentToRender());

      // * ASSERT
      const menuItem = screen.getByText('MenuItem');
      expect(menuItem).toHaveAttribute('data-icon', expectedIcon);
    });
  });

  describe('when side bar is collapsed', () => {
    beforeEach(() => {
      sideBarStore.isExpanded = false;
    });

    it('has the correct title', () => {
      // * ARRANGE
      const expectedTitle = 'click to keep the side bar open';

      // * ACT
      render(getComponentToRender());

      // * ASSERT
      const menuItem = screen.getByText('MenuItem');
      expect(menuItem).toHaveAttribute('data-title', expectedTitle);
    });

    it('has the correct icon', () => {
      // * ARRANGE
      const expectedIcon = JSON.stringify(fontAwesomeConfig.classicSolidIcons.faAngleDoubleRight);

      // * ACT
      render(getComponentToRender());

      // * ASSERT
      const menuItem = screen.getByText('MenuItem');
      expect(menuItem).toHaveAttribute('data-icon', expectedIcon);
    });
  });

  it('dispatches the toggle action when clicked', async () => {
    // * ARRANGE
    const user = userEvent.setup();

    // * ACT
    render(getComponentToRender());
    const menuItem = screen.getByText('MenuItem');
    await user.click(menuItem);

    // * ASSERT
    expect(sideBarStore.toggle).toHaveBeenCalledExactlyOnceWith();
  });
});
