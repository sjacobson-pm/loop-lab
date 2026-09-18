/* v8 ignore start -- justification: this is just an enum; no testing needed */

/**
 * Enum for input group add-on types.
 * - Used to specify the type of add-on being used in an input group.
 * @type {import("../../types").InputGroupAddOnType}
 * @readonly
 */
export const INPUT_GROUP_ADD_ON_TYPE = Object.freeze({
  icon: { id: 1, name: 'icon' },
  text: { id: 2, name: 'text' },
  button: { id: 3, name: 'button' },
});
