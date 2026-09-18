import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

import { MenuItemIcon } from './MenuItemIcon';

// **********************************************************************
// * constants

const defaultProps = {
  icon: faker.helpers.arrayElement(Object.values(fontAwesomeConfig.classicSolidIcons)),
  counter: faker.number.int(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <MenuItemIcon {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');

// **********************************************************************
// * unit tests

describe('MenuItemIcon', () => {
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

  it('renders the counter when it is provided', () => {
    // * ARRANGE
    const counter = faker.number.int();
    const props = { ...defaultProps, counter };

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    expect(screen.getByRole('counter')).toBeInTheDocument();
    expect(screen.getByRole('counter')).toHaveTextContent(counter.toString());
  });

  it('does not render the counter when it is zero', () => {
    // * ARRANGE
    const counter = 0;
    const props = { ...defaultProps, counter };

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    expect(screen.queryByRole('counter')).not.toBeInTheDocument();
  });

  it('does not render the counter when it is not provided', () => {
    // * ARRANGE
    const props = { ...defaultProps, counter: undefined };

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    expect(screen.queryByRole('counter')).not.toBeInTheDocument();
  });
});
