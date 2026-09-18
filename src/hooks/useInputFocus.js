import { useEffect } from 'react';

const useInputFocus = (inputRef) => {
  // **********************************************************************
  // * side effects

  useEffect(
    function focusInputOnLoad() {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    [inputRef]
  );
};

export { useInputFocus };
