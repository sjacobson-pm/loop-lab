import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IconAddOn } from './IconAddOn';

// **********************************************************************
// * constants

const defaultProps = {
  icon: faker.string.alpha(10),
  disabled: faker.datatype.boolean(),
  extendedContainerClass: faker.string.alpha(10),
  popover: null,
  onClick: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => <IconAddOn {...props} />;

// **********************************************************************
// * mock external dependencies

vi.mock('./IconAddOnContents', () => ({
  IconAddOnContents: ({ icon, disabled, extendedContainerClass, onClick }) => (
    <div
      data-icon={icon}
      data-disabled={disabled}
      data-extended-container-class={extendedContainerClass}
      onClick={onClick}>
      IconAddOnContents
    </div>
  ),
}));

vi.mock('./IconAddOnContentsWithPopover', () => ({
  IconAddOnContentsWithPopover: ({ icon, disabled, extendedContainerClass, onClick, popover }) => (
    <div
      data-icon={icon}
      data-disabled={disabled}
      data-extended-container-class={extendedContainerClass}
      data-popover={JSON.stringify(popover)}
      onClick={onClick}>
      IconAddOnContentsWithPopover
    </div>
  ),
}));

// **********************************************************************
// * unit tests

describe('IconAddOn', () => {
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

  describe('IconAddOnContents', () => {
    it('is not rendered when popover is defined', () => {
      // * ARRANGE
      const popover = {
        title: faker.string.alpha(10),
        content: faker.string.alpha(10),
        placement: faker.string.alpha(10),
      };
      const props = { ...defaultProps, popover };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.queryByText('IconAddOnContents')).not.toBeInTheDocument();
    });

    it('is rendered when popover is not defined', () => {
      const props = { ...defaultProps, popover: undefined };
      render(getComponentToRender(props));
      expect(screen.getByText('IconAddOnContents')).toBeInTheDocument();
    });

    describe('when rendered', () => {
      const popover = undefined;

      it('has correct icon prop', () => {
        // * ARRANGE
        const icon = faker.string.alpha(10);
        const props = { ...defaultProps, popover, icon };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByText('IconAddOnContents')).toHaveAttribute('data-icon', icon);
      });

      it('has correct disabled prop', () => {
        // * ARRANGE
        const disabled = faker.datatype.boolean();
        const props = { ...defaultProps, popover, disabled };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByText('IconAddOnContents')).toHaveAttribute('data-disabled', String(disabled));
      });

      it('has correct extendedContainerClass prop', () => {
        // * ARRANGE
        const extendedContainerClass = faker.string.alpha(10);
        const props = { ...defaultProps, popover, extendedContainerClass };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByText('IconAddOnContents')).toHaveAttribute(
          'data-extended-container-class',
          extendedContainerClass
        );
      });
    });
  });

  describe('IconAddOnContentsWithPopover', () => {
    it('is not rendered when popover is not defined', () => {
      // * ARRANGE
      const props = { ...defaultProps, popover: undefined };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.queryByText('IconAddOnContentsWithPopover')).not.toBeInTheDocument();
    });

    it('is rendered when popover is defined', () => {
      // * ARRANGE
      const popover = {
        title: faker.string.alpha(10),
        content: faker.string.alpha(10),
        placement: faker.string.alpha(10),
      };
      const props = { ...defaultProps, popover };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getByText('IconAddOnContentsWithPopover')).toBeInTheDocument();
    });

    describe('when rendered', () => {
      const popover = {
        title: faker.string.alpha(10),
        content: faker.string.alpha(10),
        placement: faker.string.alpha(10),
      };

      it('has correct icon prop', () => {
        // * ARRANGE
        const icon = faker.string.alpha(10);
        const props = { ...defaultProps, popover, icon };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByText('IconAddOnContentsWithPopover')).toHaveAttribute('data-icon', icon);
      });

      it('has correct disabled prop', () => {
        // * ARRANGE
        const disabled = faker.datatype.boolean();
        const props = { ...defaultProps, popover, disabled };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByText('IconAddOnContentsWithPopover')).toHaveAttribute('data-disabled', String(disabled));
      });

      it('has correct extendedContainerClass prop', () => {
        // * ARRANGE
        const extendedContainerClass = faker.string.alpha(10);
        const props = { ...defaultProps, popover, extendedContainerClass };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByText('IconAddOnContentsWithPopover')).toHaveAttribute(
          'data-extended-container-class',
          extendedContainerClass
        );
      });

      it('has correct popover prop', () => {
        // * ARRANGE
        const props = { ...defaultProps, popover };

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByText('IconAddOnContentsWithPopover')).toHaveAttribute(
          'data-popover',
          JSON.stringify(popover)
        );
      });
    });
  });
});
