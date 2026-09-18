import Button from 'react-bootstrap/Button';

/**
 * ButtonAddOn component
 * Renders a button add-on for an input group.
 * @param {import('../types').ButtonAddOnProps} props - The properties for the ButtonAddOn component.
 * @returns {JSX.Element} The rendered ButtonAddOn component.
 *
 * @example
 * <ButtonAddOn
 *    text="Click Me"
 *    variant="primary"
 *    disabled={false}
 *    onClick={() => console.log('Button clicked')}
 * />
 *
 * @note This component is designed to be used within an input group and may not function as expected if used outside of that context.
 */
const ButtonAddOn = ({ text, variant, disabled, onClick }) => {
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
    <Button type="button" disabled={disabled} variant={variant} onClick={onClick}>
      {text}
    </Button>
  );
};

export { ButtonAddOn };
