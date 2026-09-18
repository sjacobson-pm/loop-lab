import { vi } from 'vitest';

const actualModule = await vi.importActual('../themes');
const THEMES = actualModule.THEMES;

const applyBootstrapTheme = vi.fn();
const getPreferredTheme = vi.fn();
const setStoredThemeName = vi.fn();

export { applyBootstrapTheme, getPreferredTheme, setStoredThemeName, THEMES };
