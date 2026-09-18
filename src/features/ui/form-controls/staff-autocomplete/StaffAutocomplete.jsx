import { useState } from 'react';

import { useStaffByIdQuery } from 'apis/pm-apis/central-data-store/root/staff/queries';
import { highlightMatch } from 'features/ui/form-controls/autocomplete/utils/highlightMatch';
import { useStaffSearch } from 'features/ui/form-controls/staff-autocomplete/hooks/useStaffSearch';

import { Autocomplete } from 'features/ui/form-controls/autocomplete/Autocomplete';

/**
 * StaffAutocomplete component that uses the generic Autocomplete component
 * and is pre-configured to search for staff members.
 *
 * @description
 * - This component manages the state for the search term and uses a custom hook to fetch staff suggestions.
 * - It also handles displaying the selected staff member's name based on the staff id value.
 * - You must provide an onChange handler to get the selected staff id and display value.
 *
 * @param {import('./types').StaffAutocompleteProps} props
 */
const StaffAutocomplete = ({
  name,
  value,
  disabled = false,
  placeholder = 'Type to search (at least 3 characters)...',
  onChange,
}) => {
  // **********************************************************************
  // * constants / component vars

  // keyedValue is what the user has typed into the autocomplete input
  // we need to keep track of this separately from the value prop
  // because the value prop is the selected staff id
  const [keyedValue, setKeyedValue] = useState('');

  // use our custom hook to manage staff searching
  // this will give us the search term, loading state, and search results
  // as well as functions to set the search term and clear the results
  const { setStaffSearchTerm, isSearching, staffSearchResults, clearStaffSearchResults } = useStaffSearch();

  // if we have a value (a staff id) but no keyedValue (the user hasn't typed anything),
  // then we need to fetch the staff data for that id so we can display the name
  // (this is for when the form is initialized with a value)
  const { data: staffData } = useStaffByIdQuery(value, !!value && !keyedValue);

  // if we have staff data, use the preferredFullName as the display value,
  // otherwise, just use the keyedValue (what the user has typed)
  // this way, if we have a value but no staff data (because the id is invalid),
  // we at least show what the user has typed
  // if we have neither, the displayValue will be an empty string
  // which is fine because the placeholder will show
  const displayValue = staffData?.preferredFullName || keyedValue;

  // **********************************************************************
  // * functions

  /**
   * Function to render a suggestion item
   * @description - this will highlight the matching part of the name based on what the user has typed
   * @param {Object} suggestion - the suggestion object (a staff member)
   * @param {import('../autocomplete/types').AutocompleteRenderContext} context - render-time context containing the query
   * @returns {React.ReactNode} the rendered suggestion item
   */
  const renderSuggestion = (suggestion, { query }) => {
    const suggestionText = `${suggestion.preferredFullName} (${suggestion.id})`;
    return <div>{highlightMatch(suggestionText, query)}</div>;
  };

  // **********************************************************************
  // * handlers

  const handleAutocompleteChange = (event) => {
    setKeyedValue(event.displayTarget.value);
    onChange(event);
  };

  const handleStaffSearchSuggestionsClearRequested = () => clearStaffSearchResults();

  const handleSuggestionsFetchRequested = async (searchQuery) => setStaffSearchTerm(searchQuery);

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <Autocomplete
      name={name}
      value={value}
      displayValue={displayValue}
      disabled={disabled}
      placeholder={placeholder}
      isLoading={isSearching}
      suggestions={staffSearchResults}
      suggestionTextPropName={'preferredFullName'}
      suggestionValuePropName={'id'}
      renderSuggestion={renderSuggestion}
      onChange={handleAutocompleteChange}
      onSuggestionsFetchRequested={handleSuggestionsFetchRequested}
      onSuggestionsClearRequested={handleStaffSearchSuggestionsClearRequested}
    />
  );
};

export { StaffAutocomplete };
