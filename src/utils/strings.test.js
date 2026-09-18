import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { generateAlphanumericString } from './strings';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('generateAlphanumericString', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it.each([
    faker.number.int({ min: 1, max: 9 }),
    faker.number.int({ min: 10, max: 19 }),
    faker.number.int({ min: 20, max: 29 }),
    faker.number.int({ min: 30, max: 39 }),
    faker.number.int({ min: 40, max: 49 }),
    faker.number.int({ min: 50, max: 59 }),
    faker.number.int({ min: 60, max: 69 }),
  ])('should return a string of length %i', (length) => {
    const result = generateAlphanumericString(length);
    expect(result.length).toBe(length);
  });

  it('should return an empty string when length is 0', () => {
    const result = generateAlphanumericString(0);
    expect(result).toBe('');
  });

  it('should return an empty string when length is negative', () => {
    const result = generateAlphanumericString(-5);
    expect(result).toBe('');
  });

  it('should return a string containing only alphanumeric characters', () => {
    const length = faker.number.int({ min: 10, max: 20 });
    const result = generateAlphanumericString(length);
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    expect(alphanumericRegex.test(result)).toBe(true);
  });
});
