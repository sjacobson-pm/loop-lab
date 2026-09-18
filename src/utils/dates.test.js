import { faker } from '@faker-js/faker';
import { addHours, addMinutes } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateElapsedTime, FormattingStrings } from './dates';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('dates', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('FormattingStrings', () => {
    it('returns the correct date format string', () => {
      // * ARRANGE
      const expected = 'MM/dd/yyyy';

      // * ACT
      const actual = FormattingStrings.date;

      // * ASSERT
      expect(actual).toBe(expected);
    });

    it('returns the correct date-time format string', () => {
      // * ARRANGE
      const expected = 'MM/dd/yyyy h:mm a';

      // * ACT
      const actual = FormattingStrings.dateTime;

      // * ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('calculateElapsedTime', () => {
    // **********************************************************************
    // * setup

    beforeEach(() => {
      vi.useFakeTimers();
    });

    // **********************************************************************
    // * tear-down

    afterEach(() => {
      vi.useRealTimers();
    });

    // **********************************************************************
    // * execution

    it('returns the correct elapsed time when elapsed duration seconds is zero', () => {
      // * ARRANGE
      const startDate = new Date(2024, 0, 1, 0, 0, 0);
      const now = addMinutes(startDate, 1);
      const expected = '00:01:00';

      vi.setSystemTime(now);

      // * ACT
      const actual = calculateElapsedTime(startDate);

      // * ASSERT
      expect(actual).toBe(expected);
    });

    it('returns the correct elapsed time when elapsed duration minutes is zero', () => {
      // * ARRANGE
      const startDate = new Date(2024, 0, 1, 0, 0, 0);
      const now = addHours(startDate, 1);
      const expected = '01:00:00';

      vi.setSystemTime(now);

      // * ACT
      const actual = calculateElapsedTime(startDate);

      // * ASSERT
      expect(actual).toBe(expected);
    });

    it('returns the correct elapsed time when elapsed duration seconds is less than 10', () => {
      // * ARRANGE
      const startDate = new Date(2024, 0, 1, 0, 0, 0);
      const elapsedSeconds = faker.number.int({ min: 1, max: 9 });
      const now = addMinutes(startDate, 1).setSeconds(elapsedSeconds);
      const expected = `00:01:0${elapsedSeconds}`;

      vi.setSystemTime(now);

      // * ACT
      const actual = calculateElapsedTime(startDate);

      // * ASSERT
      expect(actual).toBe(expected);
    });

    it('returns the correct elapsed time when elapsed duration minutes is less than 10', () => {
      // * ARRANGE
      const startDate = new Date(2024, 0, 1, 0, 0, 0);
      const elapsedMinutes = faker.number.int({ min: 1, max: 9 });
      const now = addHours(startDate, 1).setMinutes(elapsedMinutes);
      const expected = `01:0${elapsedMinutes}:00`;

      vi.setSystemTime(now);

      // * ACT
      const actual = calculateElapsedTime(startDate);

      // * ASSERT
      expect(actual).toBe(expected);
    });
  });
});
