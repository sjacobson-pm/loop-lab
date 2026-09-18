import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

import * as themes from '../../themes';

// **********************************************************************
// * useThemeStore
// **********************************************************************

const defaultThemeStore = {
  setTheme: vi.fn(),
  theme: faker.helpers.arrayElement(Object.values(themes.THEMES)),
  isDarkTheme: faker.datatype.boolean(),
};

let themeStore = { ...defaultThemeStore };
const useThemeStore = vi.fn(() => themeStore);
useThemeStore.__getMockThemeStore = () => themeStore;

useThemeStore.__resetMockThemeStore = () => {
  themeStore = { ...defaultThemeStore };
  return themeStore;
};

// **********************************************************************
// * exports
// **********************************************************************

export { useThemeStore };
