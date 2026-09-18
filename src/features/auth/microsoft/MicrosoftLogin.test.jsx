import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MicrosoftLogin } from './MicrosoftLogin';

// **********************************************************************
// * constants

const childrenContent = faker.string.alphanumeric(10);

const defaultProps = {
  children: <div>{childrenContent}</div>,
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <MicrosoftLogin {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@azure/msal-react');
vi.mock('./Error', () => ({ Error: () => <div>Error</div> }));
vi.mock('./MicrosoftAuthInProgress', () => ({ MicrosoftAuthInProgress: () => <div>MicrosoftAuthInProgress</div> }));
vi.mock('./MsalAppInsights', () => ({ MsalAppInsights: ({ children }) => <div>{children}</div> }));

// **********************************************************************
// * unit tests

describe('MicrosoftLogin', () => {
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

  it('renders children', () => {
    render(getComponentToRender(defaultProps));
    expect(screen.getByText(childrenContent)).toBeInTheDocument();
  });
});
