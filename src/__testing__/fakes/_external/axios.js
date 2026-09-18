import { faker } from '@faker-js/faker';

/**
 * Generates a fake resource object that mimics the structure of a typical resource returned by an API.
 */
export const fakeResource = () => ({
  id: faker.number.int(),
  etag: faker.string.alphanumeric(10),
});

/**
 * Generates a fake response object that mimics the structure of an Axios response.
 * @returns {Object} A fake Axios response object.
 */
export const fakeResponse = () => ({
  data: fakeResource(),
  status: faker.number.int(),
  statusText: faker.string.alphanumeric(10),
  headers: { etag: faker.string.alphanumeric(10) },
  config: { headers: {} },
});

/**
 * Generates a fake PM API collection response that includes pagination metadata in the headers.
 * @param {Object} paginationMetadata - The pagination metadata to include in the response headers.
 * @returns {Object} A fake PM API response object with pagination metadata in the headers.
 */
export const fakePmApiCollectionResponse = (paginationMetadata) => ({
  ...fakeResponse(),
  headers: { 'x-pagination': JSON.stringify(paginationMetadata) },
});

/**
 * Generates a fake PM API resource response that includes an ETag in the headers.
 * @returns {Object} A fake PM API response object with an ETag in the headers.
 */
export const fakePmApiResourceResponse = () => ({
  ...fakeResponse(),
  headers: { etag: faker.string.alphanumeric(10) },
});
