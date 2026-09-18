import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IconAddOnContentsWithPopover } from './IconAddOnContentsWithPopover';

// **********************************************************************
// * constants

const defaultPopoverProp = {
  title: faker.string.alpha(10),
  content: faker.string.alpha(10),
  placement: faker.string.alpha(10),
};

const defaultProps = {
  icon: faker.string.alpha(10),
  disabled: faker.datatype.boolean(),
  extendedContainerClass: faker.string.alpha(10),
  popover: { ...defaultPopoverProp },
  onClick: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => <IconAddOnContentsWithPopover {...props} />;

// **********************************************************************
// * mock external dependencies

vi.mock('react-bootstrap/OverlayTrigger');
vi.mock('react-bootstrap/Popover');

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

// **********************************************************************
// * unit tests

describe('IconAddOnContentsWithPopover', () => {
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

  describe('OverlayTrigger', () => {
    it('has correct placement prop when popover.placement is not defined', () => {
      // * ARRANGE
      const popover = { ...defaultPopoverProp, placement: undefined };
      const props = { ...defaultProps, popover };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const overlayTrigger = screen.getByText('OverlayTrigger');
      expect(overlayTrigger).toHaveAttribute('data-placement', 'auto');
    });

    it('has correct placement prop when popover.placement is defined', () => {
      // * ARRANGE
      const popover = { ...defaultPopoverProp };
      const props = { ...defaultProps, popover };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const overlayTrigger = screen.getByText('OverlayTrigger');
      expect(overlayTrigger).toHaveAttribute('data-placement', popover.placement);
    });
  });

  describe('Popover', () => {
    it('does not render header when popover.title is not defined', () => {
      // * ARRANGE
      const popover = { ...defaultPopoverProp, title: undefined };
      const props = { ...defaultProps, popover };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const popoverHeader = screen.queryByText('PopoverHeader');
      expect(popoverHeader).not.toBeInTheDocument();
    });

    it('renders title when popover.title is defined', () => {
      // * ARRANGE
      const popover = { ...defaultPopoverProp };
      const props = { ...defaultProps, popover };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const popoverTitle = screen.getByText('PopoverHeader', { exact: false });
      expect(popoverTitle).toBeInTheDocument();
      expect(popoverTitle).toHaveTextContent(popover.title);
    });

    it('renders correct body', () => {
      // * ARRANGE
      const popover = { ...defaultPopoverProp };
      const props = { ...defaultProps, popover };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const popoverBody = screen.getByText('PopoverBody', { exact: false });
      expect(popoverBody).toBeInTheDocument();
      expect(popoverBody).toHaveTextContent(popover.content);
    });
  });

  describe('IconAddOnContents', () => {
    it('has correct extendedContainerClass prop when incoming extendedContainerClass prop is defined', () => {
      // * ARRANGE
      const extendedContainerClass = faker.string.alpha(10);
      const props = { ...defaultProps, extendedContainerClass };
      const expected = `${extendedContainerClass} hover-info`;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getByText('IconAddOnContents')).toHaveAttribute('data-extended-container-class', expected);
    });

    it('has correct extendedContainerClass prop when incoming extendedContainerClass prop is not defined', () => {
      // * ARRANGE
      const props = { ...defaultProps, extendedContainerClass: undefined };
      const expected = 'hover-info';

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getByText('IconAddOnContents')).toHaveAttribute('data-extended-container-class', expected);
    });
  });
});
