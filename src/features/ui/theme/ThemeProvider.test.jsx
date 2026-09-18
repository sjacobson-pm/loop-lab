import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeStore } from './store/themeStore';
import * as themes from './themes';

import { ThemeProvider } from './ThemeProvider';

// **********************************************************************
// * constants

const childrenContent = faker.string.alphanumeric(10);

const defaultProps = {
  children: <div>{childrenContent}</div>,
};

let themeStore;

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <ThemeProvider {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('./themes');
vi.mock('./store/themeStore');

// **********************************************************************
// * unit tests

describe('ThemeProvider', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    themeStore = useThemeStore.__resetMockThemeStore();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(screen.getByText(childrenContent)).toBeInTheDocument();
  });

  describe('side effects', () => {
    describe('initialize theme', () => {
      it('initializes the theme on load', () => {
        // * ARRANGE
        const preferredTheme = faker.helpers.arrayElement(Object.values(themes.THEMES));
        themes.getPreferredTheme.mockReturnValue(preferredTheme);

        // * ACT
        render(getComponentToRender(defaultProps));

        // * ASSERT
        expect(themes.applyBootstrapTheme).toHaveBeenCalledExactlyOnceWith(preferredTheme);
        expect(themeStore.setTheme).toHaveBeenCalledExactlyOnceWith(preferredTheme);
      });
    });
  });
});
