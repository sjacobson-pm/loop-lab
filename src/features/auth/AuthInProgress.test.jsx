import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

import { AuthInProgress } from './AuthInProgress';

// **********************************************************************
// * constants

const { brandIcons, classicRegularIcons } = fontAwesomeConfig;

const defaultProps = {
  authTypeName: faker.string.alphanumeric(10),
  authTypeIcon: faker.helpers.arrayElement([brandIcons.faMicrosoft, classicRegularIcons.faGear]),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <AuthInProgress {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');

// **********************************************************************
// * unit tests

describe('AuthInProgress', () => {
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

  it('renders correct message', () => {
    // * ARRANGE
    const expectedText = `${defaultProps.authTypeName} authentication in progress...`;

    // * ACT
    render(getComponentToRender(defaultProps));

    // * ASSERT
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });
});
