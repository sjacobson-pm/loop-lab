import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Authentication } from './Authentication';

// **********************************************************************
// * constants

const childrenContent = faker.string.alphanumeric(10);

const defaultProps = {
  children: <div>{childrenContent}</div>,
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <Authentication {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('./microsoft/MicrosoftLogin', () => ({ MicrosoftLogin: ({ children }) => <div>{children}</div> }));

// **********************************************************************
// * unit tests

describe('Authentication', () => {
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

  it('renders the children', () => {
    render(getComponentToRender(defaultProps));
    expect(screen.getByText(childrenContent)).toBeInTheDocument();
  });
});
