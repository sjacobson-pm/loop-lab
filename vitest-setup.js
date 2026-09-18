import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from 'jest-extended';
import { afterEach, expect } from 'vitest';

/*
 * vitest notes
 *
 * ignoring code
 *  - ignoring the next line: "v8 ignore next"
 *  - ignoring the next n lines: "v8 ignore next 3"
 *  - ignoring all lines until told: "v8 ignore start" >> "v8 ignore stop"
 */

expect.extend(matchers);

afterEach(() => {
  // unmount react trees that were mounted with render
  cleanup();
});
