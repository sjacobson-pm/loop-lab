import { faker } from '@faker-js/faker';

/**
 * Generates a fake pagination metadata object that mimics the structure of typical pagination metadata returned by an API.
 * @returns {Object} A fake pagination metadata object.
 */
export const fakePaginationMetadata = () => ({
  currentPage: faker.number.int({ min: 1, max: 10 }),
  pageSize: faker.number.int({ min: 1, max: 100 }),
  totalItemCount: faker.number.int({ min: 1, max: 1000 }),
  totalPageCount: faker.number.int({ min: 1, max: 50 }),
});

/**
 * Generates a fake resource collection query parameters object that mimics the structure of typical query parameters used for fetching a collection of resources from an API.
 * @returns {Object} A fake resource collection query parameters object.
 */
export const fakeResourceCollectionQueryParams = () => ({
  apiVersion: faker.number.int(),
  pageSize: faker.number.int(),
  pageNumber: faker.number.int(),
  filter: faker.string.alphanumeric(10),
  searchQuery: faker.string.alphanumeric(10),
  orderBy: faker.string.alphanumeric(10),
  fields: faker.string.alphanumeric(10),
});
