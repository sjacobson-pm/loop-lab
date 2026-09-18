import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRef } from 'react';
import Autosuggest from 'react-autosuggest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { theme } from './theme';

/**
 * Autocomplete component that can be used for any type of data.
 * It renders an input for display and a hidden input for the actual value.
 * It uses react-autosuggest under the hood to provide suggestions as the user types.
 *
 * @description
 * - This component is designed to be flexible and reusable for different types of data.
 * - You must provide functions to fetch and clear suggestions, as well as a function to render each suggestion.
 * - You must also specify which properties of the suggestion objects to use for display and value.
 * - The component handles debouncing the search input to prevent excessive calls to fetch suggestions.
 * - It also shows a loading spinner when suggestions are being loaded.
 * - Feel free to add additional props as needed, but keep in mind that this component is meant to be generic.
 *
 * @param {import('./types').AutocompleteProps} props
 */
const Autocomplete = ({
  name,
  value,
  displayValue,
  placeholder,
  disabled = false,
  minimumSearchChars = 3,
  searchDelayMs = 500,
  isLoading = false,
  suggestions = [],
  suggestionTextPropName,
  suggestionValuePropName,
  renderSuggestion,
  onChange,
  onSuggestionsFetchRequested,
  onSuggestionsClearRequested,
}) => {
  // **********************************************************************
  // * constants / component vars

  // names for the display input and the hidden value input
  const displayFieldName = `${name}--autocomplete`;
  const valueFieldName = `${name}--value`;

  // ref to hold the timeout for loading
  // this allows us to clear the timeout if the user types again before the delay is up
  // preventing multiple calls to fetch suggestions
  const loadingTimeoutRef = useRef();

  const { classicSolidIcons } = fontAwesomeConfig;

  // **********************************************************************
  // * functions

  /**
   * Tells Autosuggest how to map suggestions to input values
   * @description - we will simply return the suggestion object and let handleAutocompleteInputChange handle how to set the input values;
   * - this is because we've customized how this control works and we have a display input element and a value input element
   * @param {object} suggestion - the suggestion
   * @returns the suggestion
   */
  const getSuggestionValue = (suggestion) => suggestion;

  /**
   * Determines whether to render the suggestions.
   * @description gets the current value of the input and the reason why the suggestions might be rendered, and it should return a boolean
   * @param {*} value - the value of the input
   * @param {*} reason - the reason why the suggestion might be rendered
   * @returns whether the suggestions should be rendered
   */
  const shouldRenderSuggestions = (value, reason) => {
    // if the user simply focused on the input,
    // do not render suggestions
    if (reason === 'input-focused') return false;

    // only render if the length is >= minimumSearchChars
    return value.trim().length >= minimumSearchChars;
  };

  // **********************************************************************
  // * handlers

  /**
   * handler for when the input element for the autocomplete loses focus
   * @description - if there is no value selected, fire the onChange event with empty values
   * - this way, the autocomplete won't have partial text left in the input
   * - e.g. if the user types something but doesn't select a suggestion and then tabs out of the input
   * - we want to clear the input in that case
   */
  const handleAutocompleteInputBlur = () => {
    if (!value) {
      const eventDetails = {
        displayTarget: {
          name: displayFieldName,
          value: '',
        },
        valueTarget: {
          name: valueFieldName,
          value: '',
        },
      };

      onChange(eventDetails);
    }
  };

  /**
   * handler for when the input element for the autocomplete changes
   */
  const handleAutocompleteInputChange = (_event, { newValue }) => {
    let displayTargetValue = '';
    let valueTargetValue = '';

    // if the new value is a string, the user is still typing and hasn't selected anything yet
    // otherwise, an item is selected - get the display text and value from the suggestion object using the prop names provided
    if (typeof newValue === 'string') {
      displayTargetValue = newValue;
      valueTargetValue = '';
    } else {
      displayTargetValue = newValue[suggestionTextPropName];
      valueTargetValue = newValue[suggestionValuePropName];
    }

    const eventDetails = {
      displayTarget: {
        name: displayFieldName,
        value: displayTargetValue,
      },
      valueTarget: {
        name: valueFieldName,
        value: valueTargetValue,
      },
    };

    // fire this component's onChange event with the event details
    onChange(eventDetails);
  };

  /**
   * handles the request for new suggestions
   */
  const handleSuggestionsFetchRequested = async ({ value }) => {
    // if we have a timeout in progress
    // then, clear the timeout before starting another
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // only fetch after the delay has passed
    // this allows for typing w/o firing the event immediately after every keystroke
    // e.g. allow the user to type, then pause, then fire
    loadingTimeoutRef.current = setTimeout(async () => {
      await onSuggestionsFetchRequested(value);
    }, searchDelayMs);
  };

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <div className="tw:relative">
      <Autosuggest
        id={displayFieldName}
        suggestions={suggestions}
        shouldRenderSuggestions={shouldRenderSuggestions}
        inputProps={{
          name: displayFieldName,
          id: displayFieldName,
          value: displayValue,
          onChange: handleAutocompleteInputChange,
          onBlur: handleAutocompleteInputBlur,
          placeholder,
          disabled,
        }}
        theme={theme}
        renderSuggestion={renderSuggestion}
        getSuggestionValue={getSuggestionValue}
        onSuggestionsFetchRequested={handleSuggestionsFetchRequested}
        onSuggestionsClearRequested={onSuggestionsClearRequested}
      />
      {isLoading && (
        <FontAwesomeIcon icon={classicSolidIcons.faGear} className="tw:absolute tw:top-2.5 tw:right-2" spin />
      )}
      <input type="hidden" role="textbox" id={valueFieldName} readOnly className="form-control" value={value} />
    </div>
  );
};

export { Autocomplete };
