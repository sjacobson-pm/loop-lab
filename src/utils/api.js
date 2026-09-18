import { AxiosError } from 'axios';

/**
 * Creates an array of JSON Patch operations from an object.
 *
 * @param {object} data - The object containing key-value pairs to be converted into JSON Patch operations.
 * @returns {Array<object>} - An array of JSON Patch operations where each operation is an object with `op`, `path`, and `value` properties.
 *
 * @remarks
 * - Each key in the input object is converted into a `replace` operation in the output array.
 * - The `path` for each operation is constructed by prefixing the key with a forward slash (`/`).
 */
export function createJsonPatchOperations(data) {
  return Object.keys(data).map((key) => ({
    op: 'replace',
    path: `/${key}`,
    value: data[key],
  }));
}

/**
 * Gets the error message from an API error.
 *
 * @param {AxiosError | Error} error - The error object to extract the message from.
 * @returns {string | undefined} - A string containing the error message if it can be determined, otherwise `undefined`.
 *
 * @remarks
 * - If the error is an instance of `AxiosError` and has a status of 412, a specific message is returned.
 * - If the error is an instance of `Error`, the error's message is returned.
 * - If the error type is not recognized, `undefined` is returned.
 */
export function getErrorMessage(error) {
  let errorMessage;

  if (error instanceof AxiosError) {
    errorMessage = error.status === 412 ? 'This data has changed since the page was loaded.' : error.message;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return errorMessage;
}
