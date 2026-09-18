/* v8 ignore start -- justification: this is simply a typedef file and has nothing to test */

/**
 * @typedef {Object} StaffAutocompleteProps
 * @property {string} name - The name used to identify the input.
 * - There will be two inputs rendered: one for display and one hidden for value.
 * - The display input will have the name `${name}--autocomplete` and the hidden value input will have the name `${name}--value`.
 * @property {string} value - The value of the hidden input (the actual value, which is the staff id).
 * @property {string} [placeholder] - Placeholder text for the input.
 * @property {boolean} [disabled=false] - Whether the input is disabled.
 * @property {(event: import("../autocomplete/types").AutocompleteChangeEvent) => void} onChange - Callback when the input value changes.
 * - This function receives an event-like object with two properties:
 *   - displayTarget: { name: string, value: string } - the display input details
 *   - valueTarget: { name: string, value: string } - the hidden value input details
 */

// Make this a module (prevents global pollution)
// (no runtime impact)
export {};
