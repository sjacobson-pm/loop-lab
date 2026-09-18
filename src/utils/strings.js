/**
 * Generates a random alphanumeric string of the specified length.
 *
 * @param {number} length - The length of the string to generate.
 * @returns {string} - The generated alphanumeric string.
 *
 * @remarks
 * - The generated string consists of uppercase letters, lowercase letters, and digits.
 * - The function uses `Math.random()` to select characters from the defined character set.
 * - The resulting string is built by concatenating randomly selected characters until the desired length is reached.
 */
export function generateAlphanumericString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  let counter = 0;
  let result = '';

  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }

  return result;
}
