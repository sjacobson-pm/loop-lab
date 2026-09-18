import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

const defaultStaffSearchResult = () => ({
  staffSearchTerm: faker.string.alpha(10),
  setStaffSearchTerm: vi.fn(),
  isSearching: faker.datatype.boolean(),
  staffSearchResults: [],
  clearStaffSearchResults: vi.fn(),
});

let staffSearchResult = defaultStaffSearchResult();

const useStaffSearch = vi.fn(() => staffSearchResult);

useStaffSearch.__getMockResult = () => staffSearchResult;

useStaffSearch.__resetMockResult = () => {
  staffSearchResult = defaultStaffSearchResult();
  return staffSearchResult;
};

export { useStaffSearch };
