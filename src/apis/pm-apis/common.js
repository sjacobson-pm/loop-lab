import axios from 'axios';
import urlJoin from 'url-join';

import { apiConfig } from 'configs/apiConfig';
import { acquireTokenPopup, acquireTokenSilent, getUser } from 'features/auth/microsoft/msalHelpers';

// import modules that are used as internal methods; this allows mocking the internal modules during testing
// * NOTE: ES6 modules support cyclic dependencies automatically, so it is perfectly valid to import a module
// *       into itself so that functions within the module can call the module export for other functions in the module
import { HelperMethods as Helpers } from './common';

// **********************************************************************
// * internal methods that are used by other functions within this module

export class HelperMethods {
  static acquireToken = async (scopes) => {
    const user = getUser();
    const request = { scopes, account: user };

    let authResult;

    try {
      authResult = await acquireTokenSilent(request);
    } catch {
      // if silent acquisition fails, fallback to interactive method
      authResult = await acquireTokenPopup(request);
    }

    return authResult;
  };

  static buildResourceQueryParams = ({
    apiVersion,
    pageSize,
    pageNumber,
    filter,
    searchQuery,
    orderBy,
    fields,
  } = {}) => {
    const apiVersionParam = apiVersion ? `apiVersion=${encodeURIComponent(apiVersion)}` : '';
    const pageSizeParam = pageSize ? `pageSize=${encodeURIComponent(pageSize)}` : '';
    const pageNumberParam = pageNumber ? `pageNumber=${encodeURIComponent(pageNumber)}` : '';
    const filterParam = filter ? `filter=${encodeURIComponent(filter)}` : '';
    const searchQueryParam = searchQuery ? `searchQuery=${encodeURIComponent(searchQuery)}` : '';
    const orderByParam = orderBy ? `orderBy=${encodeURIComponent(orderBy)}` : '';
    const fieldsParam = fields ? `fields=${encodeURIComponent(fields)}` : '';

    const paramsArray = [
      apiVersionParam,
      pageSizeParam,
      pageNumberParam,
      filterParam,
      searchQueryParam,
      orderByParam,
      fieldsParam,
    ];

    const queryParams = paramsArray.filter(Boolean).join('&');

    return queryParams;
  };

  /**
   * Builds a URL for the API request.
   * This method constructs the full URL by combining the base URL, APIM path, resource path, and query parameters.
   *
   * @param {string} baseUrl - The base URL of the API.
   * @param {string} apimPath - The APIM path for the API.
   * @param {string} resourcePath - The specific resource path for the API endpoint.
   * @param {string} queryParams - The query parameters to include in the API request.
   * @returns {string} - The fully constructed URL for the API request.
   *
   * @example
   * const baseUrl = 'https://api.example.com';
   * const apimPath = '/cds--api';
   * const resourcePath = '/lookups/widgets';
   * const queryParams = 'apiVersion=1&pageSize=10&pageNumber=1';
   * const url = HelperMethods.buildUrl(baseUrl, apimPath, resourcePath, queryParams);
   * // url will be 'https://api.example.com/cds--api/lookups/widgets?apiVersion=1&pageSize=10&pageNumber=1'
   */
  static buildUrl = (baseUrl, apimPath, resourcePath, queryParams) => {
    const url = new URL(baseUrl);
    url.pathname = urlJoin(apimPath, resourcePath);
    url.search = queryParams;

    return url.toString();
  };
}

// **********************************************************************
// * exported functions

/**
 * Deletes a resource from the specified API endpoint using the provided configuration object, search parameters, and ETag value.
 *
 * @param {Object} pmApiConfiguration - The configuration object for the PM API, including the APIM path and scopes.
 * @param {string} path - The API endpoint path to delete the resource from.
 * @param {Object} searchParams - The search parameters to include in the API request.
 * @param {string} etag - The ETag value for concurrency control.
 *
 * @returns {Promise<void>} - A promise that resolves when the resource is successfully deleted.
 *
 * @example
 * const pmApiConfiguration = {
 *  apimPath: '/cds--api',
 *  scopes: ['00000000-0000-0000-0000-000000000000/access_as_user']
 * };
 * const path = '/lookups/widgets/123';
 * const searchParams = { apiVersion: '1' };
 * const etag = 'W/"xyz"';
 * await deleteResource(pmApiConfiguration, path, searchParams, etag);
 * // Resource with ID 123 will be deleted if the ETag matches
 */
export async function deleteResource(pmApiConfiguration, path, searchParams, etag) {
  const authResult = await Helpers.acquireToken(pmApiConfiguration.scopes);
  const queryParams = Helpers.buildResourceQueryParams(searchParams);
  const url = Helpers.buildUrl(apiConfig.apimBaseUrl, pmApiConfiguration.apimPath, path, queryParams);

  const axiosConfig = {
    headers: {
      Authorization: `bearer ${authResult.accessToken}`,
      Accept: 'application/json',
      'If-Match': `"${etag}"`,
    },
  };

  await axios.delete(url, axiosConfig);
}

/**
 * Fetches a single resource from the specified API endpoint using the provided configuration object and search parameters.
 *
 * @param {Object} pmApiConfiguration - The configuration object for the PM API, including the APIM path and scopes.
 * @param {string} path - The API endpoint path to fetch the resource from.
 * @param {Object} searchParams - The search parameters to include in the API request.
 *
 * @returns {Promise<Object>} - A promise that resolves to the API response data.
 * - The response data includes the resource object and an optional ETag value.
 * - e.g. { id: '123', displayName: 'John Doe', etag: 'W/"xyz"' }
 *
 * @example
 * const pmApiConfiguration = {
 *   apimPath: '/cds--api',
 *   scopes: ['00000000-0000-0000-0000-000000000000/access_as_user']
 * };
 * const path = '/lookups/widgets/123';
 * const searchParams = {
 *   apiVersion: '1',
 *   fields: 'id,displayName',
 * };
 * const response = await getResource(pmApiConfiguration, path, searchParams);
 * // response will be { id: '123', displayName: 'John Doe', etag: 'W/"xyz"' }
 */
export async function getResource(pmApiConfiguration, path, searchParams) {
  const authResult = await Helpers.acquireToken(pmApiConfiguration.scopes);
  const queryParams = Helpers.buildResourceQueryParams(searchParams);
  const url = Helpers.buildUrl(apiConfig.apimBaseUrl, pmApiConfiguration.apimPath, path, queryParams);

  const axiosConfig = {
    headers: {
      Authorization: `bearer ${authResult.accessToken}`,
      Accept: 'application/json',
    },
  };

  const response = await axios.get(url, axiosConfig);
  const returnVal = { ...response.data };

  if (response.headers.etag) {
    returnVal.etag = response.headers.etag;
  }

  return returnVal;
}

/**
 *
 * Fetches a collection of resources from the specified API endpoint using the provided configuration object and search parameters.
 *
 * @param {Object} pmApiConfiguration - The configuration object for the PM API, including the APIM path and scopes.
 * @param {string} path - The API endpoint path to fetch resources from.
 * @param {Object} searchParams - The search parameters to include in the API request.
 *
 * @returns {Promise<Object>} - A promise that resolves to the API response data.
 * - The response data includes the resource collection and pagination information.
 * - e.g. { data: [...], pagination: { ... } }
 *
 * @example
 * const pmApiConfiguration = {
 *   apimPath: '/cds--api',
 *   scopes: ['00000000-0000-0000-0000-000000000000/access_as_user']
 * };
 * const path = '/lookups/widgets';
 * const searchParams = {
 *   apiVersion: '1',
 *   pageSize: 10,
 *   pageNumber: 1,
 *   filter: 'isActive eq true',
 *   searchQuery: 'john',
 *   orderBy: 'displayName asc',
 *   fields: 'id,displayName',
 * };
 * const response = await getResourceCollection(pmApiConfiguration, path, searchParams);
 */
export async function getResourceCollection(pmApiConfiguration, path, searchParams) {
  const authResult = await Helpers.acquireToken(pmApiConfiguration.scopes);
  const queryParams = Helpers.buildResourceQueryParams(searchParams);
  const url = Helpers.buildUrl(apiConfig.apimBaseUrl, pmApiConfiguration.apimPath, path, queryParams);

  const axiosConfig = {
    headers: {
      Authorization: `bearer ${authResult.accessToken}`,
      Accept: 'application/json',
    },
  };

  const response = await axios.get(url, axiosConfig);
  const pagination = JSON.parse(response.headers['x-pagination']);

  return { data: response.data, pagination };
}

/**
 * Updates a resource at the specified API endpoint using the provided configuration object, search parameters, ETag value, and JSON Patch operations.
 *
 * @param {Object} pmApiConfiguration - The configuration object for the PM API, including the APIM path and scopes.
 * @param {string} path - The API endpoint path to update the resource at.
 * @param {Object} searchParams - The search parameters to include in the API request.
 * @param {string} etag - The ETag value for concurrency control.
 * @param {Array} jsonPatchOperations - An array of JSON Patch operations to apply to the resource.
 *
 * @returns {Promise<string>} - A promise that resolves to the new ETag value of the updated resource.
 *
 * @example
 * const pmApiConfiguration = {
 *   apimPath: '/cds--api',
 *   scopes: ['00000000-0000-0000-0000-000000000000/access_as_user']
 * };
 * const path = '/lookups/widgets/123';
 * const searchParams = { apiVersion: '1' };
 * const etag = 'W/"xyz"';
 * const jsonPatchOperations = [
 *   { op: 'replace', path: '/displayName', value: 'New Widget Name' },
 *   { op: 'replace', path: '/value1', value: 'New value1' },
 *   { op: 'replace', path: '/value2', value: 'New value2' },
 * ];
 * const newEtag = await patchResource(pmApiConfiguration, path, searchParams, etag, jsonPatchOperations);
 * // Resource with ID 123 will be updated if the ETag matches, and newEtag will contain the updated ETag value
 */
export async function patchResource(pmApiConfiguration, path, searchParams, etag, jsonPatchOperations) {
  const authResult = await Helpers.acquireToken(pmApiConfiguration.scopes);
  const queryParams = Helpers.buildResourceQueryParams(searchParams);
  const url = Helpers.buildUrl(apiConfig.apimBaseUrl, pmApiConfiguration.apimPath, path, queryParams);

  const axiosConfig = {
    headers: {
      Authorization: `bearer ${authResult.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json-patch+json',
      'If-Match': `"${etag}"`,
    },
  };

  const apiResponse = await axios.patch(url, jsonPatchOperations, axiosConfig);

  return apiResponse.headers.etag;
}

/**
 * Creates a new resource at the specified API endpoint using the provided configuration object, search parameters, and data.
 *
 * @param {Object} pmApiConfiguration - The configuration object for the PM API, including the APIM path and scopes.
 * @param {string} path - The API endpoint path to create the resource at.
 * @param {Object} searchParams - The search parameters to include in the API request.
 * @param {Object} data - The data for the new resource to be created.
 *
 * @returns {Promise<Object>} - A promise that resolves to the API response data containing the created resource.
 *
 * @example
 * const pmApiConfiguration = {
 *  apimPath: '/cds--api',
 *  scopes: ['00000000-0000-0000-0000-000000000000/access_as_user']
 * };
 * const path = '/lookups/widgets';
 * const searchParams = { apiVersion: '1' };
 * const data = { displayName: 'New Widget', value1: 'Value 1', value2: 'Value 2' };
 * const response = await postResource(pmApiConfiguration, path, searchParams, data);
 * // response will contain the created resource object
 */
export async function postResource(pmApiConfiguration, path, searchParams, data) {
  const authResult = await Helpers.acquireToken(pmApiConfiguration.scopes);
  const queryParams = Helpers.buildResourceQueryParams(searchParams);
  const url = Helpers.buildUrl(apiConfig.apimBaseUrl, pmApiConfiguration.apimPath, path, queryParams);

  const axiosConfig = {
    headers: {
      Authorization: `bearer ${authResult.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  const response = await axios.post(url, data, axiosConfig);

  return response.data;
}
