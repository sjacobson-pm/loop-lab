import { faker } from '@faker-js/faker';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModalFooter } from './ModalFooter';

// **********************************************************************
// * constants

const childrenContent = faker.string.alphanumeric(10);

const defaultProps = {
  children: <div>{childrenContent}</div>,
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <ModalFooter {...props} />;
};

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('ModalFooter', () => {
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
