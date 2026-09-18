import { faker } from '@faker-js/faker';

/**
 * Mocks the event values for react-autosuggest component.
 * @param {string} textPropName - The property name for the text value in the suggestion object.
 * @param {string} valuePropName - The property name for the value in the suggestion object.
 * @returns {Object} An object containing mocked inputProps and onSuggestionsFetchRequestedValue.
 *
 * @example
 * const mockValues = mockEventValues('name', 'id');
 * console.log(mockValues);
 * // {
 *   inputProps: {
 *    onChangeNewValueString: 'random
 *   onChangeNewValueObject: { name: 'randomString', id: 'randomString' }
 *   },
 *   onSuggestionsFetchRequestedValue: 'randomString'
 * }
 */
export const mockEventValues = (textPropName, valuePropName) => ({
  inputProps: {
    onChangeNewValueString: faker.string.alpha(10),
    onChangeNewValueObject: {
      [textPropName]: faker.string.alpha(10),
      [valuePropName]: faker.string.alpha(10),
    },
  },
  onSuggestionsFetchRequestedValue: faker.string.alpha(10),
});
