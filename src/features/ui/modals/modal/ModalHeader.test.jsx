import { faker } from '@faker-js/faker';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModalHeader } from './ModalHeader';

// **********************************************************************
// * constants

const defaultProps = {
  title: faker.string.alphanumeric(10),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <ModalHeader {...props} />;
};

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('ModalHeader', () => {
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
