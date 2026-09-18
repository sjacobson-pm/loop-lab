/* v8 ignore start -- justification: this is simply a typedef file and has nothing to test */

/**
 * @typedef {Object} AutocompleteRenderContext
 * @property {string} query - Current user-entered search string used for rendering highlights.
 * @property {boolean} isHighlighted - Whether the suggestion is currently highlighted.
 */

/**
 * @typedef {Object} AutocompleteChangeEvent
 * @property {Object} displayTarget - Details of the display input.
 * @property {string} displayTarget.name - The name of the display input.
 * @property {string} displayTarget.value - The current value of the display input.
 * @property {Object} valueTarget - Details of the hidden value input.
 * @property {string} valueTarget.name - The name of the hidden value input.
 * @property {string} valueTarget.value - The current value of the hidden value input.
 */

/**
 * @typedef {Object} AutocompleteProps
 * @property {string} name - The name used to identify the input.
 * - There will be two inputs rendered: one for display and one hidden for value.
 * - The display input will have the name `${name}--autocomplete` and the hidden value input will have the name `${name}--value`.
 * @property {string} value - The value of the hidden input (the actual value).
 * @property {string} displayValue - The value of the display input (what the user sees).
 * @property {string} [placeholder] - Placeholder text for the input.
 * @property {boolean} [disabled=false] - Whether the input is disabled.
 * @property {number} [minimumSearchChars=3] - Minimum number of characters required to trigger a search.
 * @property {number} [searchDelayMs=500] - Delay in milliseconds before triggering a search after user stops typing.
 * - This is to prevent excessive searches while the user is typing.
 * @property {boolean} isLoading - Whether the suggestions are currently being loaded; shows a loading spinner if true.
 * @property {Array<Object>} suggestions - Array of suggestion objects to display.
 * - These objects can take on any shape, but you must specify which properties to use for display and value.
 * - e.g. a staff autocomplete might have objects with properties like { id: 123, preferredFullName: 'John Doe' }
 * - e.g. a product autocomplete might have objects with properties like { sku: 'ABC123', productName: 'Widget' }
 * @property {string} suggestionTextPropName - The property of the suggestion object to use for display; e.g. 'preferredFullName'
 * @property {string} suggestionValuePropName - The property of the suggestion object to use for the value; e.g. 'id'
 * @property {(suggestion: Object, context: AutocompleteRenderContext) => React.ReactNode} renderSuggestion
 * - Function to render a suggestion item.
 * - This function receives the suggestion object and an object with the current query and whether the item is highlighted.
 * - It should return a React node to render.
 * - e.g. (suggestion) => <div>{suggestion.preferredFullName} ({suggestion.id})</div>
 * @property {(event: AutocompleteChangeEvent) => void} onChange - Callback when the input value changes.
 * - This function receives an event-like object with two properties:
 *   - displayTarget: { name: string, value: string } - the display input details
 *   - valueTarget: { name: string, value: string } - the hidden value input details
 * @property {(value: string) => void} onSuggestionsFetchRequested - Callback to fetch suggestions based on the current input value.
 * - This function receives the current input value as a string.
 * - This function will be called every time you might need to update suggestions
 * @property {() => void} onSuggestionsClearRequested - Callback when suggestions should be cleared.
 * - This function will be called every time you need to clear suggestions.
 */

// Make this a module (prevents global pollution)
// (no runtime impact)
export {};
