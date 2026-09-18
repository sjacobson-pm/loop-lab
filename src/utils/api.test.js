import { faker } from '@faker-js/faker';
import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { createJsonPatchOperations, getErrorMessage } from './api';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('api', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('createJsonPatchOperations', () => {
    it('should create an array of JSON Patch operations from a partial object', () => {
      // * ARRANGE
      const data = {
        bar: faker.number.int(),
        baz: faker.datatype.boolean(),
      };

      const expectedOperations = [
        { op: 'replace', path: '/bar', value: data.bar },
        { op: 'replace', path: '/baz', value: data.baz },
      ];

      // * ACT
      const actual = createJsonPatchOperations(data);

      // * ASSERT
      expect(actual).toEqual(expectedOperations);
    });
  });

  describe('getErrorMessage', () => {
    it('should return a specific message when the error is an AxiosError with a status of 412', () => {
      // * ARRANGE
      const error = new AxiosError(faker.lorem.sentence());
      error.status = 412;
      const expected = 'This data has changed since the page was loaded.';

      // * ACT
      const actual = getErrorMessage(error);

      // * ASSERT
      expect(actual).toBe(expected);
    });

    it('should return the error message when the error is an AxiosError with a status other than 412', () => {
      // * ARRANGE
      const error = new AxiosError(faker.lorem.sentence());
      const expected = error.message;

      // * ACT
      const actual = getErrorMessage(error);

      // * ASSERT
      expect(actual).toBe(expected);
    });

    it('should return the error message when the error is an instance of Error', () => {
      // * ARRANGE
      const error = new Error(faker.lorem.sentence());
      const expected = error.message;

      // * ACT
      const actual = getErrorMessage(error);

      // * ASSERT
      expect(actual).toBe(expected);
    });

    it('should return undefined when the error type is not recognized', () => {
      // * ARRANGE
      const error = faker.string.alphanumeric(10);
      const expected = undefined;

      // * ACT
      const actual = getErrorMessage(error);

      // * ASSERT
      expect(actual).toBe(expected);
    });
  });
});
