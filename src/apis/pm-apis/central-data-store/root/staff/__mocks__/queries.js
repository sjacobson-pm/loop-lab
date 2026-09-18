import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

const defaultQuery = {
  data: null,
  isPending: faker.datatype.boolean(),
  error: null,
};

// **********************************************************************
// * useAuthenticatedStaffQuery
// **********************************************************************

const defaultAuthenticatedStaffQuery = {
  ...defaultQuery,
  data: {
    id: faker.number.int({ min: 1, max: 1000 }),
    azureAdObjectId: faker.string.uuid(),
  },
};

let authenticatedStaffQuery = { ...defaultAuthenticatedStaffQuery };
const useAuthenticatedStaffQuery = vi.fn(() => authenticatedStaffQuery);
useAuthenticatedStaffQuery.__getMockAuthenticatedStaffQuery = () => authenticatedStaffQuery;

useAuthenticatedStaffQuery.__resetMockAuthenticatedStaffQuery = () => {
  authenticatedStaffQuery = { ...defaultAuthenticatedStaffQuery };
  return authenticatedStaffQuery;
};

// **********************************************************************
// * useStaffByIdQuery
// **********************************************************************

const defaultStaffByIdQuery = {
  ...defaultQuery,
  data: {
    id: faker.number.int({ min: 1, max: 1000 }),
    displayName: faker.person.fullName(),
  },
};

let staffByIdQuery = { ...defaultStaffByIdQuery };
const useStaffByIdQuery = vi.fn(() => staffByIdQuery);
useStaffByIdQuery.__getMockStaffByIdQuery = () => staffByIdQuery;

useStaffByIdQuery.__resetMockStaffByIdQuery = () => {
  staffByIdQuery = { ...defaultStaffByIdQuery };
  return staffByIdQuery;
};

// **********************************************************************
// * useStaffCollectionQuery
// **********************************************************************

const defaultStaffCollectionQuery = {
  ...defaultQuery,
  data: {
    data: faker.helpers.multiple(
      () => ({ id: faker.number.int({ min: 1, max: 1000 }), displayName: faker.person.fullName() }),
      { count: faker.number.int({ min: 1, max: 10 }) }
    ),
    pagination: {
      currentPage: 1,
      pageSize: 10,
      totalItemCount: 10,
      totalPageCount: 1,
    },
  },
};

let staffCollectionQuery = { ...defaultStaffCollectionQuery };
const useStaffCollectionQuery = vi.fn(() => staffCollectionQuery);
useStaffCollectionQuery.__getMockStaffCollectionQuery = () => staffCollectionQuery;

useStaffCollectionQuery.__resetMockStaffCollectionQuery = () => {
  staffCollectionQuery = { ...defaultStaffCollectionQuery };
  return staffCollectionQuery;
};

// **********************************************************************
// * exports
// **********************************************************************

export { useAuthenticatedStaffQuery, useStaffByIdQuery, useStaffCollectionQuery };
