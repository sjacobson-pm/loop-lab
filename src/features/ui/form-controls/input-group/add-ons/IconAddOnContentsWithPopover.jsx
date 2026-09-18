import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';

import { IconAddOnContents } from 'features/ui/form-controls/input-group/add-ons/IconAddOnContents';

/**
 * IconAddOnContentsWithPopover component
 * Renders the contents of an icon add-on for an input group with a popover.
 * @param {import('../types').IconAddOnContentsWithPopoverProps} props - The properties for the IconAddOnContentsWithPopover component.
 * @returns {JSX.Element} The rendered IconAddOnContentsWithPopover component.
 *
 * @example
 * <IconAddOnContentsWithPopover
 *    icon="search"
 *    disabled={false}
 *    extendedContainerClass="my-custom-class"
 *    popover={{
 *      title: 'Search',
 *      content: 'Click to search',
 *      placement: 'top',
 *    }}
 *    onClick={() => console.log('Icon clicked')}
 * />
 *
 * @note This component is designed to be used within an input group and may not function as expected if used outside of that context.
 */
const IconAddOnContentsWithPopover = ({ icon, disabled, extendedContainerClass, popover, onClick }) => {
  // **********************************************************************
  // * constants / component vars

  extendedContainerClass = `${extendedContainerClass ?? ''} hover-info`.trim();

  const popoverPlacement = popover.placement || 'auto';
  const addOnContentsProps = { icon, disabled, extendedContainerClass, onClick };

  // **********************************************************************
  // * functions

  const createPopover = (
    <Popover>
      {!!popover.title && <Popover.Header as="h3">{popover.title}</Popover.Header>}
      <Popover.Body>{popover.content}</Popover.Body>
    </Popover>
  );

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <OverlayTrigger
      trigger={['hover', 'focus']}
      placement={popoverPlacement}
      delay={{ show: 200, hide: 200 }}
      overlay={createPopover}>
      <IconAddOnContents {...addOnContentsProps} />
    </OverlayTrigger>
  );
};

export { IconAddOnContentsWithPopover };
