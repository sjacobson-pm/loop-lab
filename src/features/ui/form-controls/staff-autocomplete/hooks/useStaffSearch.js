import { useEffect, useState } from 'react';

import { useStaffCollectionQuery } from 'apis/pm-apis/central-data-store/root/staff/queries';

export const useStaffSearch = () => {
  // **********************************************************************
  // * constants / component vars

  const [staffSearchResults, setStaffSearchResults] = useState([]);
  const [staffSearchTerm, setStaffSearchTerm] = useState('');

  // params for the staff collection query
  // we only need a few fields for the autocomplete
  // so we limit the fields returned to just those we need
  // to reduce payload size
  const staffCollectionQueryParams = {
    pageSize: 15,
    pageNumber: 1,
    searchQuery: staffSearchTerm,
    orderBy: 'preferredFullName',
    fields: 'id,preferredFullName',
  };

  // if we do not have a search term, the query should be disabled
  // this prevents us from querying with no search term
  // which would return the first page of all staff; which is not what we want
  const queryEnabled = !!staffSearchTerm;

  const { data, isPending } = useStaffCollectionQuery(staffCollectionQueryParams, queryEnabled);

  // we are searching if the query is enabled and is pending
  // this is used to show a loading indicator in the autocomplete
  // while we are waiting for the query to return
  const isSearching = queryEnabled && isPending;

  // **********************************************************************
  // * functions

  const clearStaffSearchResults = () => setStaffSearchResults([]);

  // **********************************************************************
  // * side effects

  useEffect(
    function updateStaffSearchResults() {
      const setResults = async () => setStaffSearchResults(data?.data || []);
      setResults();
    },
    [data]
  );

  // **********************************************************************
  // * return values

  return { staffSearchTerm, setStaffSearchTerm, isSearching, staffSearchResults, clearStaffSearchResults };
};
