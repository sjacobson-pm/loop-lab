import { differenceInHours, interval, intervalToDuration } from 'date-fns';

/**
 * An object containing formatting strings for dates and date-times.
 *
 * @property {string} date - The format string for dates (MM/dd/yyyy).
 * @property {string} dateTime - The format string for date-times (MM/dd/yyyy h:mm a).
 */
export const FormattingStrings = {
  date: 'MM/dd/yyyy',
  dateTime: 'MM/dd/yyyy h:mm a',
};

/**
 * Calculates the elapsed time between a given start date and the current date.
 *
 * @param {Date} startDate - The start date from which to calculate the elapsed time.
 * @returns {string} - A string representing the elapsed time in the format "HH:mm:ss".
 */
export function calculateElapsedTime(startDate) {
  const now = new Date();
  const elapsedTimeInterval = interval(startDate, now);
  const elapsedTimeDuration = intervalToDuration(elapsedTimeInterval);
  const totalHours = differenceInHours(now, startDate).toString().padStart(2, '0');
  const minutes = elapsedTimeDuration.minutes?.toString().padStart(2, '0') ?? '00';
  const seconds = elapsedTimeDuration.seconds?.toString().padStart(2, '0') ?? '00';
  const elapsedTime = `${totalHours}:${minutes}:${seconds}`;

  return elapsedTime;
}
