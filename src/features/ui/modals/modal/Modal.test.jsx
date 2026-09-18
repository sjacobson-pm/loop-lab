import { faker } from '@faker-js/faker';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

// **********************************************************************
// * constants

const childrenContent = faker.string.alphanumeric(10);

const defaultProps = {
  isOpen: true,
  children: <div>{childrenContent}</div>,
  allowEscapeClose: true,
  centered: true,
  size: 'sm',
  onHide: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <Modal {...props} />;
};

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('Modal', () => {
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

  it('renders without crashing when optional props are undefined', () => {
    const props = { ...defaultProps, allowEscapeClose: undefined };
    render(getComponentToRender(props));
    expect(true).toBe(true);
  });
});
