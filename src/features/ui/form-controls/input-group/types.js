/* v8 ignore start -- justification: this is simply a typedef file and has nothing to test */

/**
 * @typedef {Object} InputGroupAddOnType
 * @property {Object} icon - Type for icon add-ons.
 * @property {string} icon.id - Unique identifier for the icon add-on type.
 * @property {string} icon.name - Name of the icon add-on type.
 * @property {Object} text - Type for text add-ons.
 * @property {string} text.id - Unique identifier for the text add-on type.
 * @property {string} text.name - Name of the text add-on type.
 * @property {Object} button - Type for button add-ons.
 * @property {string} button.id - Unique identifier for the button add-on type.
 * @property {string} button.name - Name of the button add-on type.
 */

/**
 * @typedef {Object} InputGroupProps
 * @property {(TextAddOnProps|IconAddOnProps|ButtonAddOnProps)[]} prependAddOns - Array of add-on objects to render before the input field.
 * @property {(TextAddOnProps|IconAddOnProps|ButtonAddOnProps)[]} appendAddOns - Array of add-on objects to render after the input field.
 * @property {ReactNode} children - The input field(s) to render within the input group.
 */

/**
 * @typedef {Object} AddOnCollectionProps
 * @property {(TextAddOnProps|IconAddOnProps|ButtonAddOnProps)[]} addOns - Array of add-on objects to render.
 * Each object should have an `addOnType` property indicating the type of add-on (text, icon, or button) and
 * other properties specific to that type.
 * - For text add-ons, use {@link TextAddOnProps}.
 * - For icon add-ons, use {@link IconAddOnProps}.
 * - For button add-ons, use {@link ButtonAddOnProps}.
 */

/**
 * @typedef {Object} TextAddOnProps
 * @property {string} text - The text to display in the add-on.
 */

/**
 *  @typedef {Object} ButtonAddOnProps
 *  @property {string} text - The text to display in the button.
 *  @property {string} variant - The variant of the button (e.g., 'primary', 'secondary').
 *  @property {boolean} disabled - Whether the button is disabled.
 *  @property {function} onClick - The function to call when the button is clicked.
 */

/**
 * @typedef {Object} IconAddOnProps
 * @property {import('@fortawesome/fontawesome-svg-core').IconProp} icon - The FontAwesome icon to display.
 * @property {boolean} disabled - Whether the icon add-on is disabled.
 * @property {string} extendedContainerClass - Additional CSS classes to apply to the icon container.
 * @property {PopoverProps} popover - The content to display in a popover (if any).
 * @property {function} onClick - The function to call when the icon is clicked.
 */

/**
 * @typedef {Object} IconAddOnContentsProps
 * @property {import('@fortawesome/fontawesome-svg-core').IconProp} icon - The FontAwesome icon to display.
 * @property {boolean} disabled - Whether the icon add-on is disabled.
 * @property {string} extendedContainerClass - Additional CSS classes to apply to the icon container.
 * @property {function} onClick - The function to call when the icon is clicked.
 */

/**
 * @typedef {Object} IconAddOnContentsWithPopoverProps
 * @property {import('@fortawesome/fontawesome-svg-core').IconProp} icon - The FontAwesome icon to display.
 * @property {boolean} disabled - Whether the icon add-on is disabled.
 * @property {string} extendedContainerClass - Additional CSS classes to apply to the icon container.
 * @property {PopoverProps} popover - The content to display in a popover (if any).
 * @property {function} onClick - The function to call when the icon is clicked.
 */

/**
 * @typedef {Object} PopoverProps
 * @property {string} placement - The placement of the popover relative to the target (e.g., 'top', 'bottom', 'left', 'right').
 * @property {string} title - The title of the popover.
 * @property {ReactNode} content - The content to display inside the popover.
 */

// Make this a module (prevents global pollution)
// (no runtime impact)
export {};
