import { faker } from '@faker-js/faker';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MenuItemLabel } from './MenuItemLabel';

// **********************************************************************
// * constants

const defaultProps = {
  label: faker.string.alphanumeric(10),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <MenuItemLabel {...props} />;
};

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('MenuItemLabel', () => {
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
});
