import InputGroup from 'react-bootstrap/InputGroup';

/**
 * TextAddOn component
 * Renders a text add-on for an input group.
 * @param {import('../types').TextAddOnProps} props - The properties for the TextAddOn component.
 * @returns {JSX.Element} The rendered TextAddOn component.
 *
 * @example
 * <TextAddOn text="Search" />
 *
 * @note This component is designed to be used within an input group and may not function as expected if used outside of that context.
 */
const TextAddOn = ({ text }) => {
  // **********************************************************************
  // * constants / component vars

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return <InputGroup.Text>{text}</InputGroup.Text>;
};

export { TextAddOn };
