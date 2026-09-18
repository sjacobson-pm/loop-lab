import { faker } from '@faker-js/faker';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakePmApiCollectionResponse, fakePmApiResourceResponse } from 'testing/fakes/_external/axios';
import { fakePaginationMetadata, fakeResourceCollectionQueryParams } from 'testing/fakes/apis/pm-apis/common';
import { fakeApiConfiguration } from 'testing/fakes/configs/apiConfig';

import { apiConfig } from 'configs/apiConfig';
import { acquireTokenPopup, acquireTokenSilent, getUser } from 'features/auth/microsoft/msalHelpers';

import {
  deleteResource,
  getResource,
  getResourceCollection,
  HelperMethods,
  patchResource,
  postResource,
} from './common';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

vi.mock('axios');
vi.mock('configs/apiConfig');
vi.mock('features/auth/microsoft/msalHelpers');

// **********************************************************************
// * unit tests

describe('pmApiCommon', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  describe('HelperMethods', () => {
    describe('acquireToken', () => {
      // **********************************************************************
      // * setup

      let authResult;
      let user;

      beforeEach(() => {
        authResult = acquireTokenSilent.__resetMockAuthResult();
        user = getUser.__resetMockUser();
      });

      // **********************************************************************
      // * tear-down

      // **********************************************************************
      // * execution

      it('returns the expected auth result from acquireTokenSilent', async () => {
        // * ARRANGE
        const scopes = [faker.internet.url()];

        // * ACT
        const actual = await HelperMethods.acquireToken(scopes);

        // * ASSERT
        expect(actual).toEqual(authResult);
        expect(acquireTokenSilent).toHaveBeenCalledWith({ scopes, account: user });
      });

      it('calls acquireTokenPopup when acquireTokenSilent throws an error', async () => {
        // * ARRANGE
        const scopes = [faker.internet.url()];
        acquireTokenSilent.mockImplementation(() => {
          throw new Error('silent token acquisition failed');
        });
        authResult = acquireTokenPopup.__resetMockAuthResult();

        // * ACT
        const actual = await HelperMethods.acquireToken(scopes);

        // * ASSERT
        expect(actual).toEqual(authResult);
        expect(acquireTokenPopup).toHaveBeenCalledWith({ scopes, account: user });
      });
    });

    describe('buildResourceQueryParams', () => {
      // **********************************************************************
      // * setup

      let fakeQueryParamValues;

      beforeEach(() => {
        fakeQueryParamValues = fakeResourceCollectionQueryParams();
      });

      // **********************************************************************
      // * tear-down

      // **********************************************************************
      // * execution

      it('returns empty string when no params are passed', () => {
        const actual = HelperMethods.buildResourceQueryParams();
        expect(actual).toBe('');
      });

      it('includes the api version param when apiVersion has a value', () => {
        const apiVersion = faker.number.int();
        const params = { ...fakeQueryParamValues, apiVersion };
        const expectedString = `apiVersion=${apiVersion}`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.stringContaining(expectedString));
      });

      it('includes the page size param when pageSize has a value', () => {
        const pageSize = faker.number.int();
        const params = { ...fakeQueryParamValues, pageSize };
        const expectedString = `pageSize=${pageSize}`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.stringContaining(expectedString));
      });

      it('includes the page number param when pageNumber has a value', () => {
        const pageNumber = faker.number.int();
        const params = { ...fakeQueryParamValues, pageNumber };
        const expectedString = `pageNumber=${pageNumber}`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.stringContaining(expectedString));
      });

      it('includes the filter param when filter has a value', () => {
        const filter = faker.string.alphanumeric(10);
        const params = { ...fakeQueryParamValues, filter };
        const expectedString = `filter=${encodeURIComponent(filter)}`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.stringContaining(expectedString));
      });

      it('includes the search query param when searchQuery has a value', () => {
        const searchQuery = faker.string.alphanumeric(10);
        const params = { ...fakeQueryParamValues, searchQuery };
        const expectedString = `searchQuery=${encodeURIComponent(searchQuery)}`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.stringContaining(expectedString));
      });

      it('includes the order by param when orderBy has a value', () => {
        const orderBy = faker.string.alphanumeric(10);
        const params = { ...fakeQueryParamValues, orderBy };
        const expectedString = `orderBy=${encodeURIComponent(orderBy)}`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.stringContaining(expectedString));
      });

      it('includes the fields param when fields has a value', () => {
        const fields = faker.string.alphanumeric(10);
        const params = { ...fakeQueryParamValues, fields };
        const expectedString = `fields=${encodeURIComponent(fields)}`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.stringContaining(expectedString));
      });

      it('does not include the api version param when apiVersion does not have a value', () => {
        const apiVersion = undefined;
        const params = { ...fakeQueryParamValues, apiVersion };
        const actual = HelperMethods.buildResourceQueryParams(params);
        const expectedString = `apiVersion=`;
        expect(actual).toEqual(expect.not.stringContaining(expectedString));
      });

      it('does not include the workflow step id param when workflowStepId does not have a value', () => {
        const workflowStepId = undefined;
        const params = { ...fakeQueryParamValues, workflowStepId };
        const actual = HelperMethods.buildResourceQueryParams(params);
        const expectedString = `workflowStepId=`;
        expect(actual).toEqual(expect.not.stringContaining(expectedString));
      });

      it('does not include the validation event type param when validationEventType does not have a value', () => {
        const validationEventType = undefined;
        const params = { ...fakeQueryParamValues, validationEventType };
        const actual = HelperMethods.buildResourceQueryParams(params);
        const expectedString = `validationEventType=`;
        expect(actual).toEqual(expect.not.stringContaining(expectedString));
      });

      it('does not include the page size param when pageSize does not have a value', () => {
        const pageSize = undefined;
        const params = { ...fakeQueryParamValues, pageSize };
        const expectedString = `pageSize=`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.not.stringContaining(expectedString));
      });

      it('does not include the page number param when pageNumber does not have a value', () => {
        const pageNumber = undefined;
        const params = { ...fakeQueryParamValues, pageNumber };
        const expectedString = `pageNumber=`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.not.stringContaining(expectedString));
      });

      it('does not include the filter param when filter does not have a value', () => {
        const filter = undefined;
        const params = { ...fakeQueryParamValues, filter };
        const expectedString = `filter=`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.not.stringContaining(expectedString));
      });

      it('does not include the search query param when searchQuery does not have a value', () => {
        const searchQuery = undefined;
        const params = { ...fakeQueryParamValues, searchQuery };
        const expectedString = `searchQuery=`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.not.stringContaining(expectedString));
      });

      it('does not include the order by param when orderBy does not have a value', () => {
        const orderBy = undefined;
        const params = { ...fakeQueryParamValues, orderBy };
        const expectedString = `orderBy=`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.not.stringContaining(expectedString));
      });

      it('does not include the fields param when fields does not have a value', () => {
        const fields = undefined;
        const params = { ...fakeQueryParamValues, fields };
        const expectedString = `fields=`;
        const actual = HelperMethods.buildResourceQueryParams(params);
        expect(actual).toEqual(expect.not.stringContaining(expectedString));
      });
    });

    describe('buildUrl', () => {
      it.each([
        {
          baseUrl: 'https://api.example.com',
          apimPath: 'cds--api',
          resourcePath: 'lookups/widgets',
          queryParams: 'apiVersion=1&pageSize=10&pageNumber=1',
          expectedUrl: 'https://api.example.com/cds--api/lookups/widgets?apiVersion=1&pageSize=10&pageNumber=1',
        },
        {
          baseUrl: 'https://api.example.com/',
          apimPath: '/cds--api',
          resourcePath: '/lookups/widgets',
          queryParams: 'apiVersion=1&pageSize=10&pageNumber=1',
          expectedUrl: 'https://api.example.com/cds--api/lookups/widgets?apiVersion=1&pageSize=10&pageNumber=1',
        },
        {
          baseUrl: 'https://api.example.com/',
          apimPath: '/cds--api/',
          resourcePath: '/lookups/widgets/',
          queryParams: 'apiVersion=1&pageSize=10&pageNumber=1',
          expectedUrl: 'https://api.example.com/cds--api/lookups/widgets/?apiVersion=1&pageSize=10&pageNumber=1',
        },
        {
          baseUrl: 'https://api.example.com/',
          apimPath: '',
          resourcePath: '/lookups/widgets/',
          queryParams: 'apiVersion=1&pageSize=10&pageNumber=1',
          expectedUrl: 'https://api.example.com/lookups/widgets/?apiVersion=1&pageSize=10&pageNumber=1',
        },
        {
          baseUrl: 'https://api.example.com/',
          apimPath: '/cds--api/',
          resourcePath: '',
          queryParams: 'apiVersion=1&pageSize=10&pageNumber=1',
          expectedUrl: 'https://api.example.com/cds--api?apiVersion=1&pageSize=10&pageNumber=1',
        },
        {
          baseUrl: 'https://api.example.com/',
          apimPath: '/cds--api/',
          resourcePath: '/lookups/widgets/',
          queryParams: '',
          expectedUrl: 'https://api.example.com/cds--api/lookups/widgets/',
        },
        {
          baseUrl: 'https://api.example.com/',
          apimPath: '',
          resourcePath: '',
          queryParams: '',
          expectedUrl: 'https://api.example.com/',
        },
      ])(
        'returns the expected URL when all parameters are provided',
        ({ baseUrl, apimPath, resourcePath, queryParams, expectedUrl }) => {
          const actualUrl = HelperMethods.buildUrl(baseUrl, apimPath, resourcePath, queryParams);
          expect(actualUrl).toEqual(expectedUrl);
        }
      );
    });
  });

  describe('exported functions', () => {
    // **********************************************************************
    // * setup

    let pmApiConfiguration;
    let path;
    let searchParams;

    let authResult;
    let queryParams;
    let url;

    beforeEach(() => {
      pmApiConfiguration = fakeApiConfiguration();
      path = faker.string.alpha(10);
      searchParams = fakeResourceCollectionQueryParams();

      authResult = acquireTokenSilent.__resetMockAuthResult();
      queryParams = faker.string.alpha(30);
      url = faker.internet.url();

      vi.spyOn(HelperMethods, 'acquireToken').mockImplementation(() => Promise.resolve(authResult));
      vi.spyOn(HelperMethods, 'buildResourceQueryParams').mockImplementation(() => queryParams);
      vi.spyOn(HelperMethods, 'buildUrl').mockImplementation(() => url);
    });

    // **********************************************************************
    // * tear-down

    // **********************************************************************
    // * execution

    describe('deleteResource', () => {
      // **********************************************************************
      // * setup

      let etag;

      beforeEach(() => {
        etag = faker.string.alphanumeric(10);

        axios.delete.mockResolvedValue({ status: 204 });
      });

      // **********************************************************************
      // * tear-down

      // **********************************************************************
      // * execution

      it('calls all methods with the expected arguments', async () => {
        // * ARRANGE
        const expectedAxiosConfig = {
          headers: {
            Authorization: `bearer ${authResult.accessToken}`,
            Accept: 'application/json',
            'If-Match': `"${etag}"`,
          },
        };

        // * ACT
        await deleteResource(pmApiConfiguration, path, searchParams, etag);

        // * ASSERT
        expect(HelperMethods.acquireToken).toHaveBeenCalledWith(pmApiConfiguration.scopes);
        expect(HelperMethods.buildUrl).toHaveBeenCalledWith(
          apiConfig.apimBaseUrl,
          pmApiConfiguration.apimPath,
          path,
          queryParams
        );
        expect(axios.delete).toHaveBeenCalledWith(url, expectedAxiosConfig);
      });
    });

    describe('getResource', () => {
      // **********************************************************************
      // * setup

      let response;

      beforeEach(() => {
        response = fakePmApiResourceResponse();

        axios.get.mockResolvedValue(response);
      });

      // **********************************************************************
      // * tear-down

      // **********************************************************************
      // * execution

      it('calls all methods with the expected arguments', async () => {
        // * ARRANGE
        const expectedAxiosConfig = {
          headers: {
            Authorization: `bearer ${authResult.accessToken}`,
            Accept: 'application/json',
          },
        };

        // * ACT
        await getResource(pmApiConfiguration, path, searchParams);

        // * ASSERT
        expect(HelperMethods.acquireToken).toHaveBeenCalledWith(pmApiConfiguration.scopes);
        expect(HelperMethods.buildResourceQueryParams).toHaveBeenCalledWith(searchParams);
        expect(HelperMethods.buildUrl).toHaveBeenCalledWith(
          apiConfig.apimBaseUrl,
          pmApiConfiguration.apimPath,
          path,
          queryParams
        );
        expect(axios.get).toHaveBeenCalledWith(url, expectedAxiosConfig);
      });

      it('returns the expected resource with an etag when there is an etag header', async () => {
        const actual = await getResource(pmApiConfiguration, path, searchParams);
        const expected = { ...response.data, etag: response.headers.etag };
        expect(actual).toEqual(expected);
      });

      it('returns the expected resource with no etag when there is no etag header', async () => {
        // * ARRANGE
        delete response.headers.etag;
        const expected = { ...response.data };
        const actual = await getResource(pmApiConfiguration, path, searchParams);
        expect(actual).toEqual(expected);
      });
    });

    describe('getResourceCollection', () => {
      // **********************************************************************
      // * setup

      let paginationMetadata;
      let response;

      beforeEach(() => {
        paginationMetadata = fakePaginationMetadata();
        response = fakePmApiCollectionResponse(paginationMetadata);

        axios.get.mockResolvedValue(response);
      });

      // **********************************************************************
      // * tear-down

      // **********************************************************************
      // * execution

      it('calls all methods with the expected arguments', async () => {
        // * ARRANGE
        const expectedAxiosConfig = {
          headers: {
            Authorization: `bearer ${authResult.accessToken}`,
            Accept: 'application/json',
          },
        };

        // * ACT
        await getResourceCollection(pmApiConfiguration, path, searchParams);

        // * ASSERT
        expect(HelperMethods.acquireToken).toHaveBeenCalledWith(pmApiConfiguration.scopes);
        expect(HelperMethods.buildResourceQueryParams).toHaveBeenCalledWith(searchParams);
        expect(HelperMethods.buildUrl).toHaveBeenCalledWith(
          apiConfig.apimBaseUrl,
          pmApiConfiguration.apimPath,
          path,
          queryParams
        );
        expect(axios.get).toHaveBeenCalledWith(url, expectedAxiosConfig);
      });

      it('returns the expected resource collection and pagination metadata', async () => {
        // * ARRANGE
        const expectedResults = { data: response.data, pagination: paginationMetadata };

        // * ACT
        const actual = await getResourceCollection(pmApiConfiguration, path, searchParams);

        // * ASSERT
        expect(actual).toEqual(expectedResults);
      });
    });

    describe('patchResource', () => {
      // **********************************************************************
      // * setup

      let etag;
      let jsonPatchOperations;
      let newEtag;
      let response;

      beforeEach(() => {
        etag = faker.string.alphanumeric(10);
        jsonPatchOperations = [
          { op: 'replace', path: faker.string.alpha(10), value: faker.string.alpha(10) },
          { op: 'replace', path: faker.string.alpha(10), value: faker.string.alpha(10) },
          { op: 'replace', path: faker.string.alpha(10), value: faker.string.alpha(10) },
        ];
        newEtag = faker.string.alphanumeric(10);
        response = { status: 204, headers: { etag: newEtag } };

        axios.patch.mockResolvedValue(response);
      });

      // **********************************************************************
      // * tear-down

      // **********************************************************************
      // * execution

      it('calls all methods with the expected arguments', async () => {
        // * ARRANGE
        const expectedAxiosConfig = {
          headers: {
            Authorization: `bearer ${authResult.accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json-patch+json',
            'If-Match': `"${etag}"`,
          },
        };

        // * ACT
        await patchResource(pmApiConfiguration, path, searchParams, etag, jsonPatchOperations);

        // * ASSERT
        expect(HelperMethods.acquireToken).toHaveBeenCalledWith(pmApiConfiguration.scopes);
        expect(HelperMethods.buildResourceQueryParams).toHaveBeenCalledWith(searchParams);
        expect(HelperMethods.buildUrl).toHaveBeenCalledWith(
          apiConfig.apimBaseUrl,
          pmApiConfiguration.apimPath,
          path,
          queryParams
        );
        expect(axios.patch).toHaveBeenCalledWith(url, jsonPatchOperations, expectedAxiosConfig);
      });

      it('returns the expected new etag from the response', async () => {
        const actual = await patchResource(pmApiConfiguration, path, searchParams, etag, jsonPatchOperations);
        expect(actual).toEqual(newEtag);
      });
    });

    describe('postResource', () => {
      // **********************************************************************
      // * setup

      let resource;
      let response;
      let createdResource;

      beforeEach(() => {
        resource = { displayName: faker.string.alpha(10) };
        createdResource = { id: faker.number.int(), displayName: faker.string.alpha(10) };
        response = { status: 201, headers: { location: faker.internet.url() }, data: createdResource };

        axios.post.mockResolvedValue(response);
      });

      // **********************************************************************
      // * tear-down

      // **********************************************************************
      // * execution

      it('calls all methods with the expected arguments', async () => {
        // * ARRANGE
        const expectedAxiosConfig = {
          headers: {
            Authorization: `bearer ${authResult.accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        };

        // * ACT
        await postResource(pmApiConfiguration, path, searchParams, resource);

        // * ASSERT
        expect(HelperMethods.acquireToken).toHaveBeenCalledWith(pmApiConfiguration.scopes);
        expect(HelperMethods.buildResourceQueryParams).toHaveBeenCalledWith(searchParams);
        expect(HelperMethods.buildUrl).toHaveBeenCalledWith(
          apiConfig.apimBaseUrl,
          pmApiConfiguration.apimPath,
          path,
          queryParams
        );
        expect(axios.post).toHaveBeenCalledWith(url, resource, expectedAxiosConfig);
      });

      it('returns the expected created resource id from the response', async () => {
        const actual = await postResource(pmApiConfiguration, path, searchParams, resource);
        expect(actual).toEqual(createdResource);
      });
    });
  });
});
