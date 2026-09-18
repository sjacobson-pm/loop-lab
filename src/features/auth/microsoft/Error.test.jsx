import { AuthError } from '@azure/msal-browser';
import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAppInsights } from 'features/logging/appInsights/telemetryService';

import { Error } from './Error';

// **********************************************************************
// * constants

const defaultProps = {
  error: new AuthError(faker.string.alphanumeric(10), faker.string.alphanumeric(10)),
  login: vi.fn(),
  acquireToken: vi.fn(),
  result: null,
};

let appInsights;

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <Error {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');
vi.mock('features/logging/appInsights/telemetryService');

// **********************************************************************
// * unit tests

describe('Error', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    appInsights = getAppInsights.__resetMockAppInsights();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(screen.getByText(/A microsoft authentication error occurred!/i)).toBeInTheDocument();
  });

  it('tracks the error in app insights', () => {
    // * ARRANGE
    const error = new AuthError(faker.string.alphanumeric(10), faker.string.alphanumeric(10));
    const props = { ...defaultProps, error };

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    expect(appInsights.trackException).toHaveBeenCalledOnce();
    expect(appInsights.trackException).toHaveBeenCalledExactlyOnceWith({ exception: error });
  });
});
