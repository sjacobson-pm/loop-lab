import { vi } from 'vitest';

const Autocomplete = ({
  name,
  value,
  displayValue,
  placeholder,
  disabled,
  minimumSearchChars,
  searchDelayMs,
  isLoading,
  suggestions,
  suggestionTextPropName,
  suggestionValuePropName,
  onSuggestionsClearRequested,
}) => {
  return (
    <div
      data-component="Autocomplete mock"
      data-name={name}
      data-value={value}
      data-display-value={displayValue}
      data-placeholder={placeholder}
      data-disabled={disabled}
      data-minimum-search-chars={minimumSearchChars}
      data-search-delay-ms={searchDelayMs}
      data-is-loading={isLoading}
      data-suggestions={JSON.stringify(suggestions)}
      data-suggestion-text-prop-name={suggestionTextPropName}
      data-suggestion-value-prop-name={suggestionValuePropName}>
      Autocomplete
      <button type="button" onClick={onSuggestionsClearRequested}>
        event-trigger--clear-suggestions
      </button>
    </div>
  );
};

const AutocompleteMock = vi.fn(Autocomplete);

export { AutocompleteMock as Autocomplete };
