import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MicrosoftAuthInProgress } from './MicrosoftAuthInProgress';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

const getComponentToRender = () => {
  return <MicrosoftAuthInProgress />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('../AuthInProgress');

// **********************************************************************
// * unit tests

describe('MicrosoftAuthInProgress', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender());
    expect(true).toBe(true);
  });
});
