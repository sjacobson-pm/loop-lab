import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestRouter } from 'testing/TestRouter';

import { useTheme } from 'features/ui/theme/useTheme';
import { usePageSetup } from 'pages/hooks/usePageSetup';

import { PageNotFound } from './PageNotFound';

// **********************************************************************
// * constants

let theme;

// **********************************************************************
// * functions

const getComponentToRender = () => {
  return (
    <TestRouter>
      <PageNotFound />
    </TestRouter>
  );
};

// **********************************************************************
// * mock external dependencies

vi.mock('pages/hooks/usePageSetup');
vi.mock('features/ui/theme/useTheme');

// **********************************************************************
// * unit tests

describe('PageNotFound', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    theme = useTheme.__resetMockTheme();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('page setup', () => {
    it('calls usePageSetup with correct params', () => {
      // * ARRANGE
      const expectedTitle = 'Page Not Found';
      const expectedSubtitle = '';
      const expectedShowSideBar = false;

      // * ACT
      render(getComponentToRender());

      // * ASSERT
      expect(usePageSetup).toHaveBeenCalledWith({
        title: expectedTitle,
        subtitle: expectedSubtitle,
        showSideBar: expectedShowSideBar,
      });
    });
  });

  describe('pm logo image', () => {
    const LOGO_ALT_TEXT = 'Plante Moran logo';

    it('sets the logo image correctly in light theme', () => {
      // * ARRANGE
      theme.isDarkTheme = false;

      // * ACT
      render(getComponentToRender());

      // * ASSERT
      expect(screen.getByAltText(LOGO_ALT_TEXT)).toHaveAttribute('src', '/pm-logo--wide--color.png');
    });

    it('sets the logo image correctly in dark theme', () => {
      // * ARRANGE
      theme.isDarkTheme = true;

      // * ACT
      render(getComponentToRender());

      // * ASSERT
      expect(screen.getByAltText(LOGO_ALT_TEXT)).toHaveAttribute('src', '/pm-logo--wide--reverse.png');
    });
  });
});
