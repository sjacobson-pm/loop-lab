import { getResource, getResourceCollection } from 'apis/pm-apis/common';
import { apiConfig } from 'configs/apiConfig';
import { getUser as getMsalUser } from 'features/auth/microsoft/msalHelpers';

const API_CONFIG_OBJECT = apiConfig.centralDataStore;

/**
 * Fetches staff details by their id.
 * @param {Object} param0 - The query parameters object.
 * @param {Array} param0.queryKey - The query key array containing the staff id.
 * @returns {Object} The staff details object.
 *
 * @example
 * const staffDetails = await getStaffById({ queryKey: ['staff', 'byId', 123] });
 * console.log(staffDetails);
 * // {
 * //   id: 123,
 * //   preferredFullName: 'John Doe',
 * //   emailAddress: 'john.doe@example.com',
 * //   isActive: true,
 * //   positionCodeDescription: 'Manager',
 * //   jobProfileDescription: 'Sales'
 * // }
 */
export async function getStaffById({ queryKey }) {
  const [, , id] = queryKey;
  const searchParams = { apiVersion: 1 };
  const path = `staff/${id}`;
  const result = await getResource(API_CONFIG_OBJECT, path, searchParams);

  return result;
}

/**
 * Fetches a collection of staff members based on query parameters.
 * @param {Object} param0 - The query parameters object.
 * @param {Array} param0.queryKey - The query key array containing the query parameters.
 * @param {Object} param0.queryKey[2] - The query parameters object.
 * @param {number} param0.queryKey[2].pageSize - The number of items per page.
 * @param {number} param0.queryKey[2].pageNumber - The current page number.
 * @param {string} param0.queryKey[2].filter - The filter string to apply to the collection.
 * @param {string} param0.queryKey[2].searchQuery - The search query string to apply to the collection.
 * @param {string} param0.queryKey[2].orderBy - The order by string to sort the collection.
 * @param {string} param0.queryKey[2].fields - The fields string to specify which fields to include in the response.
 * @returns {Object} The staff collection object with pagination metadata.
 *
 * @example
 * const staffCollection = await getStaffCollection({ queryKey: ['staff', 'list', { pageSize: 10, pageNumber: 1, filter: 'isActive eq true' }] });
 * console.log(staffCollection);
 * // {
 * //   data: [
 * //     { id: 1, preferredFullName: 'Jane Smith', emailAddress: 'jane.smith@example.com' },
 * //     { id: 2, preferredFullName: 'John Doe', emailAddress: 'john.doe@example.com' }
 * //   ],
 * //   pagination: {
 * //     currentPage: 1,
 * //     pageSize: 10,
 * //     totalItemCount: 50,
 * //     totalPageCount: 5
 * //   }
 * // }
 */
export async function getStaffCollection({ queryKey }) {
  const [, , params] = queryKey;
  const { pageSize, pageNumber, filter, searchQuery, orderBy, fields } = params;
  const searchParams = { apiVersion: 1, pageSize, pageNumber, filter, searchQuery, orderBy, fields };
  const path = 'staff';
  const results = await getResourceCollection(API_CONFIG_OBJECT, path, searchParams);

  return results;
}

/**
 * Fetches the staff details of the authenticated user.
 * @returns {Object} The staff details object of the authenticated user.
 *
 * @example
 * const authenticatedStaff = await getStaffForAuthenticatedUser();
 * console.log(authenticatedStaff);
 * // {
 * //   id: 123,
 * //   preferredFullName: 'John Doe',
 * //   emailAddress: 'john.doe@example.com'
 * //   isActive: true,
 * //   positionCodeDescription: 'Manager',
 * //   jobProfileDescription: 'Sales'
 * // }
 */
export async function getStaffForAuthenticatedUser() {
  const user = getMsalUser();

  const searchParams = {
    apiVersion: 1,
    pageSize: 1,
    pageNumber: 1,
    filter: `azureAdObjectId eq "${user.localAccountId}"`,
    fields:
      'id,azureAdObjectId,preferredFullName,preferredFirstName,preferredLastName,emailAddress,' +
      'userPrincipalName,isActive,positionCodeDescription,jobProfileDescription',
  };

  const path = 'staff';
  const results = await getResourceCollection(API_CONFIG_OBJECT, path, searchParams);

  return results.data[0];
}
