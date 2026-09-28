import { realpathSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: realpathSync(new URL('./', import.meta.url)),
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['*.mjs', 'lib/**/*.mjs'],
      exclude: ['vitest.config.mjs'],
      reportsDirectory: './coverage',
      reporter: ['text', 'json'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
