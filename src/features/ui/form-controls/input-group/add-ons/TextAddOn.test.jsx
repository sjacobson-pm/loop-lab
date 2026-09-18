import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';

import { describe, expect, it } from 'vitest';
import { TextAddOn } from './TextAddOn';

// **********************************************************************
// * constants

const defaultProps = {
  text: faker.string.alpha(10),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => <TextAddOn {...props} />;

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('TextAddOn', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBeTrue();
  });

  it('has correct text', () => {
    // * ARRANGE
    const expectedText = defaultProps.text;

    // * ACT
    render(getComponentToRender(defaultProps));

    // * ASSERT
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });
});
