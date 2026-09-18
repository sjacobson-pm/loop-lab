import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import styles from './SideBar.module.css';
import { useSideBarStore } from './store/sideBarStore';

import { SideBar } from './SideBar';

// **********************************************************************
// * constants / test vars

let sideBarStore;

// **********************************************************************
// * functions

const getComponentToRender = () => {
  return <SideBar />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('./store/sideBarStore');
vi.mock('./menu-items/MenuItem');
vi.mock('./menu-items/ExpanderMenuItem');
vi.mock('./menu-items/LinkMenuItem');

// **********************************************************************
// * unit tests

describe('SideBar', () => {
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

  it('does not render if not visible', () => {
    // * ARRANGE
    sideBarStore.isVisible = false;

    // * ACT
    render(getComponentToRender());

    // * ASSERT
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  describe('when isVisible is true', () => {
    beforeEach(() => {
      sideBarStore.isVisible = true;
    });

    it('renders with expanded class when isExpanded is true', () => {
      // * ARRANGE
      sideBarStore.isExpanded = true;
      const expectedClass = styles.expanded;

      // * ACT
      render(getComponentToRender());

      // * ASSERT
      expect(screen.getByRole('navigation')).toHaveClass(expectedClass);
    });

    it('renders with collapsed class when isExpanded is false', () => {
      // * ARRANGE
      sideBarStore.isExpanded = false;
      const expectedClass = styles.collapsed;

      // * ACT
      render(getComponentToRender());

      // * ASSERT
      expect(screen.getByRole('navigation')).toHaveClass(expectedClass);
    });
  });
});
