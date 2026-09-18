import js from '@eslint/js';
import tanstackQuery from '@tanstack/eslint-plugin-query';
import vitest from '@vitest/eslint-plugin';
import jestDom from 'eslint-plugin-jest-dom';
import noBarrelFiles from 'eslint-plugin-no-barrel-files';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import testingLibrary from 'eslint-plugin-testing-library';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

/**
 * @see https://eslint.org/docs/latest/use/configure/
 * @type {import("eslint").Linter.Config}
 *
 * @see https://github.com/art0rz/eslint-plugin-no-barrel-files
 * @see https://github.com/jsx-eslint/eslint-plugin-react?tab=readme-ov-file#flat-configs
 * @see https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks
 * @see https://github.com/ArnaudBarre/eslint-plugin-react-refresh
 *
 * @see https://github.com/vitest-dev/eslint-plugin-vitest
 * @see https://github.com/testing-library/eslint-plugin-testing-library
 * @see https://github.com/testing-library/eslint-plugin-jest-dom
 */
export default defineConfig([
  globalIgnores(['dist']),
  ...tanstackQuery.configs['flat/recommended'],
  noBarrelFiles.flat,
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [
      js.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // * custom rules
      'no-console': 'warn',
      'no-alert': 'warn',
      'no-var': 'error',
      'react/prop-types': 'off',
      semi: 'error',
    },
  },
  {
    files: ['**/*.test.{js,jsx}', '**/__mocks__/*.{js,jsx}'],
    extends: [
      vitest.configs.recommended,
      // ...vitest.configs.all, /* OR THIS ONE */
      testingLibrary.configs['flat/react'],
      jestDom.configs['flat/recommended'],
    ],
  },
]);
