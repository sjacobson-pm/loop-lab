import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { escapeRegex } from 'utils/regex';

import { ErrorAlert } from './ErrorAlert';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  displayText: faker.lorem.sentence(),
  error: { message: faker.lorem.sentence(), traceId: faker.string.alphanumeric(10) },
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <ErrorAlert {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('./AlertBase');
vi.mock('configs/fontAwesomeConfig');

// **********************************************************************
// * unit tests

describe('ErrorAlert', () => {
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

  it('renders AlertBase', () => {
    render(getComponentToRender(defaultProps));
    expect(screen.getByText('AlertBase')).toBeInTheDocument();
  });

  it('passes variant="danger" to AlertBase', () => {
    render(getComponentToRender(defaultProps));
    const alertBase = screen.getByText('AlertBase');
    const actualVariant = JSON.parse(alertBase.getAttribute('data-variant'));
    expect(actualVariant).toBe('danger');
  });

  it('passes the triangle exclamation icon to AlertBase', () => {
    render(getComponentToRender(defaultProps));
    const alertBase = screen.getByText('AlertBase');
    const actualIcon = JSON.parse(alertBase.getAttribute('data-icon'));
    expect(actualIcon).toBe(fontAwesomeConfig.classicSolidIcons.faTriangleExclamation);
  });

  it('does not enable iconSpinPulse on AlertBase', () => {
    render(getComponentToRender(defaultProps));
    const alertBase = screen.getByText('AlertBase');
    const attr = alertBase.getAttribute('data-icon-spin-pulse');
    expect(attr).toBeNull();
  });

  it('passes displayText to AlertBase', () => {
    render(getComponentToRender(defaultProps));
    const alertBase = screen.getByText('AlertBase');
    const actualDisplayText = JSON.parse(alertBase.getAttribute('data-display-text'));
    expect(actualDisplayText).toBe(defaultProps.displayText);
  });

  it('renders the error message in children', () => {
    render(getComponentToRender(defaultProps));
    const msg = escapeRegex(defaultProps.error.message);
    expect(screen.getByText(new RegExp(`^error: ${msg}$`))).toBeInTheDocument();
  });

  it('renders the trace id when provided', () => {
    render(getComponentToRender(defaultProps));
    const traceId = escapeRegex(defaultProps.error.traceId);
    expect(screen.getByText(new RegExp(`^trace-id: ${traceId}$`))).toBeInTheDocument();
  });

  it('does not render the trace id when not provided', () => {
    const props = { ...defaultProps, error: { message: faker.lorem.sentence() } };
    render(getComponentToRender(props));
    expect(screen.queryByText(/^trace-id:/i)).not.toBeInTheDocument();
  });
});
