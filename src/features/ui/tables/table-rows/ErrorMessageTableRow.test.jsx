import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorMessageTableRow } from './ErrorMessageTableRow';

// **********************************************************************
// * constants

const defaultProps = {
  errorMessage: faker.lorem.sentence(),
  colSpan: faker.number.int({ min: 1, max: 10 }),
  className: faker.lorem.word(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <ErrorMessageTableRow {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');
vi.mock('configs/fontAwesomeConfig');
vi.mock('./MessageTableRow');

// **********************************************************************
// * unit tests

describe('ErrorMessageTableRow', () => {
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

  describe('MessageTableRow', () => {
    it('has correct class name', () => {
      // * ARRANGE
      const expectedClass = `error-message-table-row ${defaultProps.className}`.trim();

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      const messageTableRow = screen.getByText(defaultProps.errorMessage);
      expect(messageTableRow).toHaveAttribute('data-class', expectedClass);
    });

    it('has correct colSpan', () => {
      // * ARRANGE
      const expectedColSpan = defaultProps.colSpan.toString();

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      const messageTableRow = screen.getByText(defaultProps.errorMessage);
      expect(messageTableRow).toHaveAttribute('data-colspan', expectedColSpan);
    });
  });
});
