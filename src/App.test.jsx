import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { Outlet } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { TestRouter } from 'testing/TestRouter';

import { App } from './App';

// **********************************************************************
// * constants / test vars

// **********************************************************************
// * functions

const getComponentToRender = (route = '/') => {
  return (
    <TestRouter initialEntries={[route]}>
      <App />;
    </TestRouter>
  );
};

// **********************************************************************
// * mock external dependencies

vi.mock('features/ui/app-layout/AppLayout', () => ({
  AppLayout: () => (
    <div>
      AppLayout
      <Outlet />
    </div>
  ),
}));

vi.mock('pages/sample-home/SampleHome', () => ({ SampleHome: () => <div>SampleHome</div> }));
vi.mock('pages/page-not-found/PageNotFound', () => ({ PageNotFound: () => <div>PageNotFound</div> }));

// **********************************************************************
// * unit tests

describe('App', () => {
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

  it('always renders the AppLayout component', () => {
    render(getComponentToRender());
    expect(screen.getByText('AppLayout')).toBeInTheDocument();
  });

  describe('the root route ("/")', () => {
    it('renders the SampleHome component', () => {
      render(getComponentToRender());
      expect(screen.getByText('SampleHome')).toBeInTheDocument();
    });
  });

  describe('unknown route route', () => {
    it('renders the PageNotFound component', () => {
      const route = `/${faker.string.alphanumeric(10)}`;
      render(getComponentToRender(route));
      expect(screen.getByText('PageNotFound')).toBeInTheDocument();
    });
  });
});
