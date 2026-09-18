import { vi } from 'vitest';

export const useAppInsights = vi.fn(() => ({
  trackSideBarExpanderClicked: vi.fn(),
  trackThemeToggleClicked: vi.fn(),
}));
