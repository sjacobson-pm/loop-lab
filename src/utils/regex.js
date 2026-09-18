/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} str - The input string to escape.
 * @returns {string} - The escaped string.
 */
export const escapeRegex = (str) => {
  // Using loose equality (==) here: str == null matches both null and undefined
  if (str == null) {
    return '';
  }

  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
