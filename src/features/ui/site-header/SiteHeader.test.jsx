import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestRouter } from 'testing/TestRouter';

import { useSiteHeaderStore } from './store/siteHeaderStore';

import { SiteHeader } from './SiteHeader';

// **********************************************************************
// * constants

let siteHeaderStore;

// **********************************************************************
// * functions

const getComponentToRender = () => {
  return (
    <TestRouter>
      <SiteHeader />
    </TestRouter>
  );
};

// **********************************************************************
// * mock external dependencies

vi.mock('./store/siteHeaderStore');
vi.mock('./navs/ThemeToggleNav', () => ({ ThemeToggleNav: () => <div>ThemeToggleNav</div> }));

// **********************************************************************
// * unit tests

describe('SiteHeader', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    siteHeaderStore = useSiteHeaderStore.__resetMockSiteHeaderStore();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender());
    expect(true).toBe(true);
  });

  it('does not render the page title if there is no page title in the store', () => {
    // * ARRANGE
    siteHeaderStore.pageTitle = '';

    // * ACT
    render(getComponentToRender());

    // * ASSERT
    expect(screen.queryByRole('title')).not.toBeInTheDocument();
  });

  it('renders the page title if there is a page title in the store', () => {
    // * ARRANGE
    siteHeaderStore.pageTitle = faker.string.alphanumeric(10);

    // * ACT
    render(getComponentToRender());

    // * ASSERT
    expect(screen.getByText(siteHeaderStore.pageTitle)).toBeInTheDocument();
  });

  it('does not render the page subtitle if there is no page subtitle in the store', () => {
    // * ARRANGE
    siteHeaderStore.pageSubtitle = '';

    // * ACT
    render(getComponentToRender());

    // * ASSERT
    expect(screen.queryByRole('subtitle')).not.toBeInTheDocument();
  });

  it('renders the page subtitle if there is a page subtitle in the store', () => {
    // * ARRANGE
    siteHeaderStore.pageSubtitle = faker.string.alphanumeric(10);

    // * ACT
    render(getComponentToRender());

    // * ASSERT
    expect(screen.getByText(siteHeaderStore.pageSubtitle)).toBeInTheDocument();
  });
});
