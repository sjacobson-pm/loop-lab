import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

import { SuccessAlert } from './SuccessAlert';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  displayText: faker.lorem.sentence(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <SuccessAlert {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('./AlertBase');
vi.mock('configs/fontAwesomeConfig');

// **********************************************************************
// * unit tests

describe('SuccessAlert', () => {
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

  it('passes variant="success" to AlertBase', () => {
    render(getComponentToRender(defaultProps));
    const alertBase = screen.getByText('AlertBase');
    const actualVariant = JSON.parse(alertBase.getAttribute('data-variant'));
    expect(actualVariant).toBe('success');
  });

  it('passes the square check icon to AlertBase', () => {
    render(getComponentToRender(defaultProps));
    const alertBase = screen.getByText('AlertBase');
    const actualIcon = JSON.parse(alertBase.getAttribute('data-icon'));
    expect(actualIcon).toBe(fontAwesomeConfig.classicSolidIcons.faSquareCheck);
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
});
