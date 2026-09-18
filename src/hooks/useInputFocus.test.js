import { renderHook } from '@testing-library/react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInputFocus } from './useInputFocus';

// **********************************************************************
// * constants / test vars

let mockRef;

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('useInputFocus', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    mockRef = {
      current: {
        focus: vi.fn(),
      },
    };
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('calls focus on the input element when ref.current exists', () => {
    renderHook(() => useInputFocus(mockRef));
    expect(mockRef.current.focus).toHaveBeenCalledOnce();
  });

  it('does not throw an error when ref.current is null', () => {
    mockRef.current = null;
    expect(() => renderHook(() => useInputFocus(mockRef))).not.toThrow();
  });

  it('only focuses the input on initial render', () => {
    const { rerender } = renderHook(() => useInputFocus(mockRef));
    mockRef.current.focus.mockClear();
    rerender();
    expect(mockRef.current.focus).not.toHaveBeenCalled();
  });
});
