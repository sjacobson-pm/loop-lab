import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTheme } from '../theme/useTheme';

import { ErrorFallback } from './ErrorFallback';

// **********************************************************************
// * constants

const defaultProps = {
  error: null,
  resetErrorBoundary: () => vi.fn(),
};

let theme;

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <ErrorFallback {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');
vi.mock('../theme/useTheme');

// **********************************************************************
// * unit tests

describe('ErrorFallback', () => {
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
    render(getComponentToRender(defaultProps));
    expect(screen.getByText('Oops! Something went wrong!')).toBeInTheDocument();
  });

  it('sets the logo image correctly when the theme is dark', () => {
    // * ARRANGE
    theme.isDarkTheme = true;
    const expectedImageSrc = '/pm-logo--wide--reverse.png';

    useTheme.mockReturnValue(theme);

    // * ACT
    render(getComponentToRender(defaultProps));

    // * ASSERT
    expect(screen.getByAltText('plante moran logo')).toHaveAttribute('src', expectedImageSrc);
  });

  it('sets the logo image correctly when the theme is not dark', () => {
    // * ARRANGE
    theme.isDarkTheme = false;
    const expectedImageSrc = '/pm-logo--wide--color.png';

    useTheme.mockReturnValue(theme);

    // * ACT
    render(getComponentToRender(defaultProps));

    // * ASSERT
    expect(screen.getByAltText('plante moran logo')).toHaveAttribute('src', expectedImageSrc);
  });

  it('does not render an error message when the error is not an instance of Error', () => {
    // * ARRANGE
    const error = faker.number.int();

    // * ACT
    render(getComponentToRender({ ...defaultProps, error }));

    // * ASSERT
    expect(screen.queryByText('Error:')).not.toBeInTheDocument();
  });

  it('renders an error message when the error is an instance of Error', () => {
    // * ARRANGE
    const error = new Error(faker.lorem.sentence());

    // * ACT
    render(getComponentToRender({ ...defaultProps, error }));

    // * ASSERT
    expect(screen.getByText(`Error: ${error.message}`)).toBeInTheDocument();
  });

  it('invokes resetErrorBoundary when the retry button is clicked', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const resetErrorBoundary = vi.fn();

    // * ACT
    render(getComponentToRender({ ...defaultProps, resetErrorBoundary }));
    const button = screen.getByRole('button', { name: 'Retry' });
    await user.click(button);

    // * ASSERT
    expect(resetErrorBoundary).toHaveBeenCalledOnce();
  });
});
