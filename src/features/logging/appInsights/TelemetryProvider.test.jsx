import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { appInsightsConfig } from 'configs/appInsightsConfig';

import { TelemetryProvider } from './TelemetryProvider';

// **********************************************************************
// * constants

const childrenContent = faker.string.alphanumeric(10);

const defaultProps = {
  children: <div>{childrenContent}</div>,
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <TelemetryProvider {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('configs/appInsightsConfig');
vi.mock('./telemetryService');

// **********************************************************************
// * unit tests

describe('TelemetryProvider', () => {
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

  it('does not render children when appInsightsConfig.connectionString has no value', () => {
    // * ARRANGE
    appInsightsConfig.connectionString = '';

    // * ACT
    render(getComponentToRender(defaultProps));

    // * ASSERT
    expect(screen.queryByText(childrenContent)).not.toBeInTheDocument();
  });

  it('renders children when appInsightsConfig.connectionString has a value', () => {
    // * ARRANGE
    appInsightsConfig.connectionString = faker.string.alphanumeric(10);

    // * ACT
    render(getComponentToRender(defaultProps));

    // * ASSERT
    expect(screen.getByText(childrenContent)).toBeInTheDocument();
  });
});
