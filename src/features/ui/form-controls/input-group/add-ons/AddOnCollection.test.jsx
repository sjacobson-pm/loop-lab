import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { INPUT_GROUP_ADD_ON_TYPE } from './enums/inputGroupAddOnType';

import { AddOnCollection } from './AddOnCollection';

// **********************************************************************
// * constants

const defaultProps = {
  addOns: [],
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => <AddOnCollection {...props} />;

// **********************************************************************
// * mock external dependencies

vi.mock('./ButtonAddOn', () => ({ ButtonAddOn: () => <div>ButtonAddOn</div> }));
vi.mock('./IconAddOn', () => ({ IconAddOn: () => <div>IconAddOn</div> }));
vi.mock('./TextAddOn', () => ({ TextAddOn: () => <div>TextAddOn</div> }));

// **********************************************************************
// * unit tests

describe('AddOnCollection', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBeTrue();
  });

  it.each([
    { addOnType: 'button', addOnName: 'ButtonAddOn' },
    { addOnType: 'icon', addOnName: 'IconAddOn' },
    { addOnType: 'text', addOnName: 'TextAddOn' },
  ])(
    'renders a $addOnName for each item in the addOns array with an addOnType of $addOnType',
    ({ addOnType, addOnName }) => {
      // * ARRANGE
      const itemCount = faker.number.int({ min: 5, max: 20 });
      const addOnTypes = Object.values(INPUT_GROUP_ADD_ON_TYPE);
      const addOns = [...Array(itemCount).keys()].map((_, index) => ({
        addOnType: addOnTypes[index % addOnTypes.length],
      }));
      const props = { ...defaultProps, addOns };
      const expectedCount = addOns.filter((addOn) => addOn.addOnType === INPUT_GROUP_ADD_ON_TYPE[addOnType]).length;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getAllByText(addOnName)).toHaveLength(expectedCount);
    }
  );

  it('does not render an add-on when the addOnType is invalid', () => {
    // * ARRANGE
    const itemCount = faker.number.int({ min: 5, max: 20 });
    const addOns = [...Array(itemCount).keys()].map(() => ({ addOnType: 0 }));
    const props = { ...defaultProps, addOns };

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    expect(screen.queryByText('ButtonAddOn')).not.toBeInTheDocument();
    expect(screen.queryByText('IconAddOn')).not.toBeInTheDocument();
    expect(screen.queryByText('TextAddOn')).not.toBeInTheDocument();
  });
});
