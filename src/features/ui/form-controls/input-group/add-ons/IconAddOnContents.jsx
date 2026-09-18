import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import InputGroup from 'react-bootstrap/InputGroup';

/**
 * IconAddOnContents component
 * Renders the contents of an icon add-on for an input group.
 * @param {import('../types').IconAddOnContentsProps} props - The properties for the IconAddOnContents component.
 * @returns {JSX.Element} The rendered IconAddOnContents component.
 *
 * @example
 * <IconAddOnContents
 *    icon="search"
 *    disabled={false}
 *    extendedContainerClass="my-custom-class"
 *    onClick={() => console.log('Icon clicked')}
 * />
 *
 * @note This component is designed to be used within an input group and may not function as expected if used outside of that context.
 */
const IconAddOnContents = ({ icon, disabled, extendedContainerClass, onClick, ...rest }) => {
  // **********************************************************************
  // * constants / component vars

  const containerClass = `icon ${extendedContainerClass || ''} ${onClick ? 'clickable' : ''}`.trim();

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  const handleClick = () => {
    if (disabled || !onClick) {
      return;
    }

    onClick();
  };

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <InputGroup.Text role="add-on-icon" className={containerClass} onClick={handleClick} {...rest}>
      <FontAwesomeIcon icon={icon} />
    </InputGroup.Text>
  );
};

export { IconAddOnContents };
