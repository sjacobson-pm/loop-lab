import { describe, expect, it } from 'vitest';

import { escapeRegex } from './regex';

// **********************************************************************
// * constants

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('escapeRegex', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution
  it('should escape special regex characters', () => {
    const input = 'hello.*+?^${}()|[]\\world';
    const expected = 'hello\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\world';
    expect(escapeRegex(input)).toBe(expected);
  });

  it('should return empty string when input is empty', () => {
    expect(escapeRegex('')).toBe('');
  });

  it('should not escape normal characters', () => {
    expect(escapeRegex('abc123')).toBe('abc123');
  });

  it('should handle strings with only special characters', () => {
    expect(escapeRegex('.*+?')).toBe('\\.\\*\\+\\?');
  });

  it('should handle null and undefined gracefully', () => {
    expect(escapeRegex(null)).toBe('');
    expect(escapeRegex(undefined)).toBe('');
  });
});
