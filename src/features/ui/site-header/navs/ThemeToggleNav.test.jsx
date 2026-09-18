import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { useTheme } from 'features/ui/theme/useTheme';

import { ThemeToggleNav } from './ThemeToggleNav';

// **********************************************************************
// * constants

let theme;

// **********************************************************************
// * functions

const getComponentToRender = () => {
  return <ThemeToggleNav />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');
vi.mock('features/logging/appInsights/useAppInsights');
vi.mock('features/ui/theme/useTheme');

// **********************************************************************
// * unit tests

describe('ThemeToggleNav', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    theme = useTheme.__resetMockTheme();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender());
    expect(true).toBe(true);
  });

  it('invokes toggleTheme when clicked', async () => {
    // * ARRANGE
    const user = userEvent.setup();

    // * ACT
    render(getComponentToRender());
    await user.click(screen.getByRole('button'));

    // * ASSERT
    expect(theme.toggleTheme).toHaveBeenCalledExactlyOnceWith();
  });

  it('renders the correct icon when the theme is dark', () => {
    // * ARRANGE
    theme.isDarkTheme = true;
    const expectedIcon = JSON.stringify(fontAwesomeConfig.classicSolidIcons.faMoonStars);

    // * ACT
    render(getComponentToRender());

    // * ASSERT
    const icon = screen.getByText('FontAwesomeIcon');
    expect(icon).toHaveAttribute('data-icon', expectedIcon);
  });

  it('renders the correct icon when the theme is light', () => {
    // * ARRANGE
    theme.isDarkTheme = false;
    const expectedIcon = JSON.stringify(fontAwesomeConfig.classicSolidIcons.faSunBright);

    // * ACT
    render(getComponentToRender());

    // * ASSERT
    const icon = screen.getByText('FontAwesomeIcon');
    expect(icon).toHaveAttribute('data-icon', expectedIcon);
  });
});
