import { useQuery } from '@tanstack/react-query';
import { getStaffById, getStaffCollection, getStaffForAuthenticatedUser } from './staff';

/**
 * Query keys for staff-related queries.
 */
export const staffKeys = {
  all: ['staff'],
  lists: () => [...staffKeys.all, 'list'],
  list: (params = {}) => [...staffKeys.lists(), params],
  details: () => [...staffKeys.all, 'detail'],
  byId: (id) => [...staffKeys.details(), id],
  current: () => [...staffKeys.details(), 'current'],
};

const DEFAULT_STALE_TIME = 1000 * 60 * 5; // 5 minutes

/**
 * Custom hook to fetch the staff details of the authenticated user.
 * @param {boolean} enabled - Whether the query should be enabled.
 * @param {boolean} throwOnError - Whether to throw an error on query failure.
 * @param {number} staleTime - Time in milliseconds before the data is considered stale.
 * @returns {Object} The query result object containing data, error, and status.
 *
 * @example
 * const { data, error, isLoading } = useAuthenticatedStaffQuery(true, false, 300000);
 */
export const useAuthenticatedStaffQuery = (enabled = true, throwOnError = false, staleTime = DEFAULT_STALE_TIME) => {
  return useQuery({
    queryKey: staffKeys.current(),
    queryFn: getStaffForAuthenticatedUser,
    enabled,
    throwOnError,
    staleTime,
  });
};

/**
 * Custom hook to fetch staff details by their ID.
 * @param {number|string} id - The ID of the staff member to fetch.
 * @param {boolean} enabled - Whether the query should be enabled.
 * @param {boolean} throwOnError - Whether to throw an error on query failure.
 * @param {number} staleTime - Time in milliseconds before the data is considered stale.
 * @returns {Object} The query result object containing data, error, and status.
 *
 * @example
 * const { data, error, isLoading } = useStaffByIdQuery(123, true, false, 300000);
 */
export const useStaffByIdQuery = (id, enabled = true, throwOnError = false, staleTime = DEFAULT_STALE_TIME) =>
  useQuery({
    queryKey: staffKeys.byId(id),
    queryFn: getStaffById,
    enabled,
    throwOnError,
    staleTime,
  });

/**
 * Custom hook to fetch a collection of staff members based on query parameters.
 * @param {Object} params - Query parameters for fetching the staff collection.
 * @param {boolean} enabled - Whether the query should be enabled.
 * @param {boolean} throwOnError - Whether to throw an error on query failure.
 * @param {number} staleTime - Time in milliseconds before the data is considered stale.
 * @returns {Object} The query result object containing data, error, and status.
 *
 * @example
 * const { data, error, isLoading } = useStaffCollectionQuery({ role: 'admin' }, true, false, 300000);
 */
export const useStaffCollectionQuery = (
  params = {},
  enabled = true,
  throwOnError = false,
  staleTime = DEFAULT_STALE_TIME
) =>
  useQuery({
    queryKey: staffKeys.list(params),
    queryFn: getStaffCollection,
    enabled,
    throwOnError,
    staleTime,
  });
