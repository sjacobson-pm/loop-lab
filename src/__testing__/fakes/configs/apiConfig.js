import { faker } from '@faker-js/faker';

/**
 * Generates a fake generic API configuration object.
 * @returns {Object} A fake API configuration object.
 */
export const fakeApiConfiguration = () => ({
  apimPath: faker.string.alpha(10),
  scopes: faker.helpers.multiple(() => faker.string.alpha(10), { count: faker.number.int({ min: 1, max: 5 }) }),
});
