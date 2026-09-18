import { IconAddOnContents } from './IconAddOnContents';
import { IconAddOnContentsWithPopover } from './IconAddOnContentsWithPopover';

/**
 * IconAddOn component
 * Renders an icon add-on for an input group, optionally with a popover.
 * @param {import('../types').IconAddOnProps} props - The properties for the IconAddOn component.
 * @returns {JSX.Element} The rendered IconAddOn component.
 *
 * @example
 * <IconAddOn
 *    icon="search"
 *    disabled={false}
 *    extendedContainerClass="my-icon-class"
 *    popover={{ title: 'Info', content: 'This is a search icon', placement: 'top' }}
 *    onClick={() => console.log('Icon clicked')}
 * />
 *
 * @note This component is designed to be used within an input group and may not function as expected if used outside of that context.
 */
const IconAddOn = ({ icon, disabled, extendedContainerClass, popover, onClick }) => {
  // **********************************************************************
  // * constants / component vars

  const hasPopover = !!popover;
  const addOnContentsProps = { icon, disabled, extendedContainerClass, onClick };
  const addOnContentsWithPopoverProps = { ...addOnContentsProps, popover };

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <>
      {hasPopover ? (
        <IconAddOnContentsWithPopover {...addOnContentsWithPopoverProps} />
      ) : (
        <IconAddOnContents {...addOnContentsProps} />
      )}
    </>
  );
};

export { IconAddOn };
