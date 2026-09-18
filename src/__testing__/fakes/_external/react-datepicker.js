import { faker } from '@faker-js/faker';

/**
 * Mocks the event values for react-datepicker component.
 * @returns {Object} An object containing mocked onChange value.
 *
 * @example
 * const mockValues = mockEventValues();
 * console.log(mockValues);
 * // {
 * //   onChange: 'randomDate'
 * // }
 */
export const mockEventValues = () => ({
  onChange: faker.date.anytime(),
});
