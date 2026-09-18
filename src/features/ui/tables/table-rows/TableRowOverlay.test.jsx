import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TableRowOverlay } from './TableRowOverlay';

// **********************************************************************
// * constants

const testIds = {
  tableRowOverlay: 'table-row-overlay',
  overlayMessageDetails: 'overlay-message-details',
};

const defaultProps = {
  overlayType: faker.helpers.arrayElement(['info', 'error']),
  message: faker.lorem.sentence(),
  details: faker.lorem.sentence(),
  reloadMessage: faker.lorem.sentence(),
  onReload: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <TableRowOverlay {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');
vi.mock('configs/fontAwesomeConfig');

// **********************************************************************
// * unit tests

describe('TableRowOverlay', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBe(true);
  });

  it('has correct class name when overlayType is error', () => {
    // * ARRANGE
    const props = { ...defaultProps, overlayType: 'error' };
    const expectedClass = `table-row-overlay tw:bg-red-600/90 tw:text-white`;

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    const tableRowOverlay = screen.getByTestId(testIds.tableRowOverlay);
    expect(tableRowOverlay).toHaveClass(expectedClass);
  });

  it('has correct class name when overlayType is info', () => {
    // * ARRANGE
    const props = { ...defaultProps, overlayType: 'info' };
    const expectedClass = `table-row-overlay tw:bg-pm-slate-600/90 tw:text-white`;

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    const tableRowOverlay = screen.getByTestId(testIds.tableRowOverlay);
    expect(tableRowOverlay).toHaveClass(expectedClass);
  });

  describe('message details', () => {
    it('renders when details prop is provided', () => {
      // * ARRANGE
      const props = { ...defaultProps, details: faker.lorem.sentence(), reloadMessage: undefined };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const messageDetails = screen.getByText(props.details);
      expect(messageDetails).toBeInTheDocument();
    });

    it('renders when reloadMessage prop is provided', () => {
      // * ARRANGE
      const props = { ...defaultProps, reloadMessage: faker.lorem.sentence(), details: undefined };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const messageDetails = screen.getByText(props.reloadMessage);
      expect(messageDetails).toBeInTheDocument();
    });

    it('does not render when details and reloadMessage props are not provided', () => {
      // * ARRANGE
      const props = { ...defaultProps, details: undefined, reloadMessage: undefined };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const messageDetails = screen.queryByTestId(testIds.overlayMessageDetails);
      expect(messageDetails).not.toBeInTheDocument();
    });
  });

  describe('reload button', () => {
    it('does not render when onReload prop is not provided', () => {
      // * ARRANGE
      const props = { ...defaultProps, onReload: undefined };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const reloadButton = screen.queryByRole('button');
      expect(reloadButton).not.toBeInTheDocument();
    });

    it('renders when onReload prop is provided', () => {
      // * ARRANGE
      const props = { ...defaultProps, onReload: vi.fn() };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const reloadButton = screen.getByRole('button');
      expect(reloadButton).toBeInTheDocument();
    });

    it('invokes onReload callback when clicked', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const props = { ...defaultProps, onReload: vi.fn() };

      // * ACT
      render(getComponentToRender(props));
      const reloadButton = screen.getByRole('button');
      await user.click(reloadButton);

      // * ASSERT
      expect(props.onReload).toHaveBeenCalledOnce();
    });
  });
});
