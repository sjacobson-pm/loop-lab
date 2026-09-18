import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmationModal } from './ConfirmationModal';

// **********************************************************************
// * constants

const defaultProps = {
  isOpen: faker.datatype.boolean(),
  title: faker.lorem.words(),
  confirmationMessage: faker.lorem.words(),
  confirmButtonText: faker.lorem.words(),
  cancelButtonText: faker.lorem.words(),
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <ConfirmationModal {...props} />;
};

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('ConfirmationModal', () => {
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

  it('invokes onCancel when cancel button is clicked', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const props = { ...defaultProps, isOpen: true };

    // * ACT
    render(getComponentToRender(props));
    const cancelButton = screen.getByText(props.cancelButtonText);
    await user.click(cancelButton);

    // * ASSERT
    expect(props.onCancel).toHaveBeenCalledOnce();
  });

  it('invokes onConfirm when confirm button is clicked', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const props = { ...defaultProps, isOpen: true };

    // * ACT
    render(getComponentToRender(props));
    const confirmButton = screen.getByText(props.confirmButtonText);
    await user.click(confirmButton);

    // * ASSERT
    expect(props.onConfirm).toHaveBeenCalledOnce();
  });
});
