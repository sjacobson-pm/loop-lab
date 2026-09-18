import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

// **********************************************************************
// * useSideBarStore
// **********************************************************************

const defaultSideBarStore = {
  isVisible: faker.datatype.boolean(),
  isExpanded: faker.datatype.boolean(),
  show: vi.fn(),
  hide: vi.fn(),
  toggle: vi.fn(),
};

let sideBarStore = { ...defaultSideBarStore };
const useSideBarStore = vi.fn((selector) => selector(sideBarStore));
useSideBarStore.__getMockSideBarStore = () => sideBarStore;

useSideBarStore.__resetMockSideBarStore = () => {
  sideBarStore = { ...defaultSideBarStore };
  return sideBarStore;
};

// **********************************************************************
// * exports
// **********************************************************************

export { useSideBarStore };
