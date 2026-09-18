import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

// **********************************************************************
// * useAuthenticatedUser
// **********************************************************************

const defaultAuthenticatedUser = {
  currentUser: {
    tenantId: faker.string.uuid(),
    localAccountId: faker.string.uuid(),
    username: faker.internet.username(),
    name: faker.person.fullName(),
  },
  currentStaff: {
    id: faker.number.int({ min: 1, max: 1000 }),
    azureAdObjectId: faker.string.uuid(),
    preferredFullName: faker.person.fullName(),
    preferredFirstName: faker.person.firstName(),
    preferredLastName: faker.person.lastName(),
    emailAddress: faker.internet.email(),
    userPrincipalName: faker.internet.username(),
    isActive: faker.datatype.boolean(),
    positionCodeDescription: faker.lorem.words(3),
    jobProfileDescription: faker.lorem.words(5),
  },
};

let authenticatedUser = { ...defaultAuthenticatedUser };
const useAuthenticatedUser = vi.fn(() => authenticatedUser);
useAuthenticatedUser.__getMockAuthenticatedUser = () => authenticatedUser;

useAuthenticatedUser.__resetMockAuthenticatedUser = () => {
  authenticatedUser = { ...defaultAuthenticatedUser };
  return authenticatedUser;
};

// **********************************************************************
// * exports
// **********************************************************************

export { useAuthenticatedUser };
