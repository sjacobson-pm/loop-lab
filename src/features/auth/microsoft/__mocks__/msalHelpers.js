import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

const defaultAuthResult = () => ({ accessToken: faker.string.alpha(20) });
let authResult = defaultAuthResult();

// **********************************************************************
// * acquireTokenPopup
// **********************************************************************

const acquireTokenPopup = vi.fn(() => Promise.resolve(authResult));
acquireTokenPopup.__getMockAuthResult = () => authResult;

acquireTokenPopup.__resetMockAuthResult = () => {
  authResult = defaultAuthResult();
  return authResult;
};

// **********************************************************************
// * acquireTokenSilent
// **********************************************************************

const acquireTokenSilent = vi.fn(() => Promise.resolve(authResult));
acquireTokenSilent.__getMockAuthResult = () => authResult;

acquireTokenSilent.__resetMockAuthResult = () => {
  authResult = defaultAuthResult();
  return authResult;
};

// **********************************************************************
// * getUser
// **********************************************************************

const defaultUser = () => ({
  tenantId: faker.string.uuid(),
  accountId: faker.string.uuid(),
  localAccountId: faker.string.uuid(),
  username: faker.internet.username(),
  name: faker.person.fullName(),
});

let user = defaultUser();
const getUser = vi.fn(() => user);
getUser.__getMockUser = () => user;

getUser.__resetMockUser = () => {
  user = defaultUser();
  return user;
};

// **********************************************************************
// * getUserRoles
// **********************************************************************

const defaultUserRoles = () => [faker.string.alpha(10), faker.string.alpha(10), faker.string.alpha(10)];
let userRoles = defaultUserRoles();
const getUserRoles = vi.fn(() => userRoles);
getUserRoles.__getMockUserRoles = () => userRoles;

getUserRoles.__resetMockUserRoles = () => {
  userRoles = defaultUserRoles();
  return userRoles;
};

// **********************************************************************
// * exports
// **********************************************************************

export { acquireTokenPopup, acquireTokenSilent, getUser, getUserRoles };
