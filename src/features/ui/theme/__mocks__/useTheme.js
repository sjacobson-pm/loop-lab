import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

// **********************************************************************
// * useTheme
// **********************************************************************

const defaultTheme = {
  isDarkTheme: faker.datatype.boolean(),
  toggleTheme: vi.fn(),
};

let theme = { ...defaultTheme };
const useTheme = vi.fn(() => theme);
useTheme.__getMockTheme = () => theme;

useTheme.__resetMockTheme = () => {
  theme = { ...defaultTheme };
  return theme;
};

// **********************************************************************
// * exports
// **********************************************************************

export { useTheme };
