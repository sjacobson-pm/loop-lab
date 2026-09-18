import RbInputGroup from 'react-bootstrap/InputGroup';

import { AddOnCollection } from './add-ons/AddOnCollection';

/**
 * InputGroup component that wraps input fields with optional add-ons.
 * @param {import('./types').InputGroupProps} props - Component props.
 * @returns {JSX.Element} The rendered InputGroup component.
 *
 * @example
 * const prependAddOns = [
 *   { addOnType: INPUT_GROUP_ADD_ON_TYPE.text, text: 'Prefix' },
 * ];
 * const appendAddOns = [
 *   { addOnType: INPUT_GROUP_ADD_ON_TYPE.button, text: 'Search', onClick: handleSearch },
 * ];
 * <InputGroup prependAddOns={prependAddOns} appendAddOns={appendAddOns}>
 *   <FormControl type="text" placeholder="Search..." />
 * </InputGroup>
 */
const InputGroup = ({ prependAddOns, appendAddOns, children }) => {
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

  return (
    <RbInputGroup>
      {prependAddOns ? <AddOnCollection addOns={prependAddOns} /> : null}
      {children}
      {appendAddOns ? <AddOnCollection addOns={appendAddOns} /> : null}
    </RbInputGroup>
  );
};

export { InputGroup };
