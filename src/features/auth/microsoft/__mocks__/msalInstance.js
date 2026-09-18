import { vi } from 'vitest';

export const msalInstance = {
  acquireTokenPopup: vi.fn(),
  acquireTokenSilent: vi.fn(),
  getAllAccounts: vi.fn(),
};
