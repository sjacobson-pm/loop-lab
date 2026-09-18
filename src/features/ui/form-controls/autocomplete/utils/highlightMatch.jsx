import { escapeRegex } from 'utils/regex';

/**
 * Highlights matching text within a larger text string.
 * @param {string} text - The text to search within.
 * @param {string} query - The text to search for.
 *
 * @returns The original text with matching portions highlighted.
 */
export const highlightMatch = (text, query) => {
  if (!query) {
    return text;
  }

  const escaped = escapeRegex(query);
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));

  return parts.map((part, idx) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={idx} className="tw:font-extrabold">
        {part}
      </span>
    ) : (
      part
    )
  );
};
