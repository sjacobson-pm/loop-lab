import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppLayout } from './AppLayout';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

const getComponentToRender = () => {
  return <AppLayout />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('../side-bar/SideBar', () => ({ SideBar: () => <div>SideBar</div> }));
vi.mock('../site-header/SiteHeader', () => ({ SiteHeader: () => <div>SiteHeader</div> }));

// **********************************************************************
// * unit tests

describe('AppLayout', () => {
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
