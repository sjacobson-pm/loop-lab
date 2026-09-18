import { msalInstance } from './msalInstance';

// import modules that are used as internal methods; this allows mocking the internal modules during testing
// * NOTE: ES6 modules support cyclic dependencies automatically, so it is perfectly valid to import a module
// *       into itself so that functions within the module can call the module export for other functions in the module
import { HelperMethods as InternalMethods } from './msalHelpers';

const acquireTokenPopup = async (request) => await msalInstance.acquireTokenPopup(request);

const acquireTokenSilent = async (request) => await msalInstance.acquireTokenSilent(request);

const getUser = () => InternalMethods.getUser();

const getUserRoles = () => {
  // * NOTE: uncomment these next 2 lines when you need to start utilizing user roles
  // const account = InternalMethods.getUser();
  // const roles = account.idTokenClaims?.roles ?? [];

  const userRoles = {
    // * example adding a user role
    // isAppAdmin: roles.includes(msalConfig.webApp.userRoles.applicationAdministrator),
  };

  return userRoles;
};

export class HelperMethods {
  static getUser = () => {
    const accounts = msalInstance.getAllAccounts();
    const account = accounts[0];

    return account;
  };
}

export { acquireTokenPopup, acquireTokenSilent, getUser, getUserRoles };
