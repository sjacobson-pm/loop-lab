import { INPUT_GROUP_ADD_ON_TYPE } from './enums/inputGroupAddOnType';

import { ButtonAddOn } from './ButtonAddOn';
import { IconAddOn } from './IconAddOn';
import { TextAddOn } from './TextAddOn';

/**
 * Renders a collection of input group add-ons.
 * @param {import('../types').AddOnCollectionProps} props - Component props.
 * @returns {JSX.Element} The rendered AddOnCollection component.
 *
 * @example
 * const addOns = [
 *   { addOnType: INPUT_GROUP_ADD_ON_TYPE.text, text: 'Prefix' },
 *   { addOnType: INPUT_GROUP_ADD_ON_TYPE.icon, icon: 'search' },
 *   { addOnType: INPUT_GROUP_ADD_ON_TYPE.button, text: 'Submit', onClick: handleSubmit },
 * ];
 * <AddOnCollection addOns={addOns} />
 *
 * @see {@link INPUT_GROUP_ADD_ON_TYPE} for available add-on types.
 * @see {@link TextAddOn} for text add-on details, including its props and usage.
 * @see {@link IconAddOn} for icon add-on details, including its props and usage.
 * @see {@link ButtonAddOn} for button add-on details, including its props and usage.
 *
 * @note This component is designed to be used within an input group and may not function as expected if used outside of that context.
 */
const AddOnCollection = ({ addOns }) => {
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
    <>
      {addOns.map((addOn, index) => {
        const addOnProps = { ...addOn };

        switch (addOn.addOnType) {
          case INPUT_GROUP_ADD_ON_TYPE.text:
            return <TextAddOn key={index} {...addOnProps} />;
          case INPUT_GROUP_ADD_ON_TYPE.icon:
            return <IconAddOn key={index} {...addOnProps} />;
          case INPUT_GROUP_ADD_ON_TYPE.button:
            return <ButtonAddOn key={index} {...addOnProps} />;
          default:
            return null;
        }
      })}
    </>
  );
};

export { AddOnCollection };
