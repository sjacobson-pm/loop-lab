import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

// **********************************************************************
// * useSiteHeaderStore
// **********************************************************************

const defaultSiteHeaderStore = {
  pageTitle: faker.string.alphanumeric(10),
  pageSubtitle: faker.string.alphanumeric(10),
  setPageTitle: vi.fn(),
  setPageSubtitle: vi.fn(),
};

let siteHeaderStore = { ...defaultSiteHeaderStore };
const useSiteHeaderStore = vi.fn((selector) => selector(siteHeaderStore));
useSiteHeaderStore.__getMockSiteHeaderStore = () => siteHeaderStore;

useSiteHeaderStore.__resetMockSiteHeaderStore = () => {
  siteHeaderStore = { ...defaultSiteHeaderStore };
  return siteHeaderStore;
};

// **********************************************************************
// * exports
// **********************************************************************

export { useSiteHeaderStore };
