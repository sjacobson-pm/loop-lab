import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { INPUT_GROUP_ADD_ON_TYPE } from 'features/ui/form-controls/input-group/add-ons/enums/inputGroupAddOnType';

import { InputGroup } from './InputGroup';

// **********************************************************************
// * constants

const defaultProps = {
  prependAddOns: null,
  appendAddOns: null,
  children: faker.string.alpha(10),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => <InputGroup {...props} />;

const fakeAddOn = () => ({ addOnType: faker.helpers.arrayElement(Object.values(INPUT_GROUP_ADD_ON_TYPE)) });

// **********************************************************************
// * mock external dependencies

vi.mock('./add-ons/AddOnCollection', () => ({
  AddOnCollection: ({ addOns }) => <div data-add-ons={JSON.stringify(addOns)}>AddOnCollection</div>,
}));

// **********************************************************************
// * unit tests

describe('InputGroup', () => {
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

  describe('AddOnCollection', () => {
    it('does not render when neither prependAddOns nor appendAddOns has a value', () => {
      const props = { ...defaultProps, prependAddOns: null, appendAddOns: null };
      render(getComponentToRender(props));
      expect(screen.queryByText('AddOnCollection')).not.toBeInTheDocument();
    });

    it('renders once when prependAddOns has a value and appendAddOns has no value', () => {
      // * ARRANGE
      const prependAddOns = [fakeAddOn()];
      const props = { ...defaultProps, prependAddOns, appendAddOns: null };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getAllByText('AddOnCollection')).toHaveLength(1);
    });

    it('renders once when prependAddOns has no value and appendAddOns has a value', () => {
      // * ARRANGE
      const appendAddOns = [fakeAddOn()];
      const props = { ...defaultProps, appendAddOns, prependAddOns: null };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getAllByText('AddOnCollection')).toHaveLength(1);
    });

    it('renders twice when prependAddOns and appendAddOns both have a value', () => {
      // * ARRANGE
      const prependAddOns = [fakeAddOn()];
      const appendAddOns = [fakeAddOn()];
      const props = { ...defaultProps, prependAddOns, appendAddOns };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getAllByText('AddOnCollection')).toHaveLength(2);
    });
  });
});
