import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

const dataElement = {
  id: faker.number.int(),
  displayName: faker.commerce.productName(),
  isActive: faker.datatype.boolean(),
};

const dataElementCount = faker.number.int({ min: 1, max: 10 });

// **********************************************************************
// * getResource
// **********************************************************************

const defaultSingleResponse = () => ({
  ...dataElement,
  etag: faker.string.alphanumeric(10),
});

let singleResponse = defaultSingleResponse();
const getResource = vi.fn(() => singleResponse);
getResource.__getMockResponse = () => singleResponse;

getResource.__resetMockResponse = () => {
  singleResponse = defaultSingleResponse();
  return singleResponse;
};

// **********************************************************************
// * getResourceCollection
// **********************************************************************

const defaultCollectionResponse = () => ({
  data: faker.helpers.multiple(() => ({ ...dataElement }), { count: dataElementCount }),
  pagination: {
    currentPage: faker.number.int({ min: 1, max: 10 }),
    pageSize: faker.number.int({ min: 1, max: 50 }),
    totalItemCount: faker.number.int({ min: 1, max: 100 }),
    totalPageCount: faker.number.int({ min: 1, max: 10 }),
  },
});

let collectionResponse = defaultCollectionResponse();
const getResourceCollection = vi.fn(() => collectionResponse);
getResourceCollection.__getMockResponse = () => collectionResponse;

getResourceCollection.__resetMockResponse = () => {
  collectionResponse = defaultCollectionResponse();
  return collectionResponse;
};

// **********************************************************************
// * exports
// **********************************************************************

export { getResource, getResourceCollection };
