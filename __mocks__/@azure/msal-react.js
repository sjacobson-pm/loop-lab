import { vi } from 'vitest';

const defaultMsal = {
  instance: {
    addEventCallback: vi.fn(),
    getAllAccounts: vi.fn(),
    removeEventCallback: vi.fn(),
  },
};

let msal = { ...defaultMsal };

const useMsal = vi.fn(() => msal);

useMsal.__getMockMsal = () => msal;

useMsal.__resetMockMsal = () => {
  msal = { ...defaultMsal };
  return msal;
};

const MsalProvider = ({ children }) => children;
const MsalAuthenticationTemplate = ({ children }) => children;

export { MsalAuthenticationTemplate, MsalProvider, useMsal };
