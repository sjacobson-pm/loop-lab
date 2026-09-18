import { vi } from 'vitest';

const Autosuggest = ({ id, suggestions, inputProps, theme, renderSuggestion, onSuggestionsClearRequested }) => {
  return (
    <div
      data-component="Autosuggest mock"
      data-id={id}
      data-suggestions={JSON.stringify(suggestions)}
      data-input-props={JSON.stringify(inputProps)}
      data-theme={JSON.stringify(theme)}>
      Autosuggest
      <button type="button" onClick={renderSuggestion}>
        event-trigger--render-suggestion
      </button>
      <button type="button" onClick={onSuggestionsClearRequested}>
        event-trigger--clear-suggestions
      </button>
    </div>
  );
};

const AutosuggestMock = vi.fn(Autosuggest);

export default AutosuggestMock;
