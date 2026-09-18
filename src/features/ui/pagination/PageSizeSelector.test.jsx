import { faker } from '@faker-js/faker';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { describe, expect, it, vi } from 'vitest';
import { PageSizeSelector } from './PageSizeSelector';

// **********************************************************************
// * constants

const defaultProps = {
  pageSizeOptions: Array.from(
    new Set(faker.helpers.multiple(() => faker.number.int({ min: 1, max: 100 }), { count: 5 }))
  ),
  selectedPageSize: faker.number.int({ min: 1, max: 100 }),
  onPageSizeItemClick: vi.fn(),
};

const getComponentToRender = (props) => {
  return <PageSizeSelector {...props} />;
};

const mockPageSize = faker.number.int({ min: 1, max: 100 });

// **********************************************************************
// * mock external dependencies

vi.mock('./PageSizeSelectorItem', () => ({
  PageSizeSelectorItem: ({ label, isActive, isDisabled, onClick }) => (
    <div>
      PageSizeSelectorItem - {label}
      <div>isActive: {isActive?.toString()}</div>
      <div>isDisabled: {isDisabled?.toString()}</div>
      <button type="button" onClick={() => onClick(mockPageSize)}>
        on-click-trigger
      </button>
    </div>
  ),
}));

// **********************************************************************
// * unit tests

describe('PageSizeSelector', () => {
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

  describe('PageSizeSelectorItem for page size options', () => {
    it('renders a page size element for each of the page size options', () => {
      // * ARRANGE

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      defaultProps.pageSizeOptions.forEach((pageSizeOption) => {
        const expectedText = `PageSizeSelectorItem - ${pageSizeOption}`;
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });
    });

    it('sets isActive to true when page size is the selected page size', () => {
      // * ARRANGE
      const selectedPageSize = faker.helpers.arrayElement(defaultProps.pageSizeOptions);
      const props = { ...defaultProps, selectedPageSize };
      const expectedText = `PageSizeSelectorItem - ${selectedPageSize}`;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const pageSizeElement = screen.getByText(expectedText);
      expect(within(pageSizeElement).getByText('isActive: true')).toBeInTheDocument();
    });

    it('sets isDisabled to true when page size is the selected page size', () => {
      // * ARRANGE
      const selectedPageSize = faker.helpers.arrayElement(defaultProps.pageSizeOptions);
      const props = { ...defaultProps, selectedPageSize };
      const expectedText = `PageSizeSelectorItem - ${selectedPageSize}`;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      const pageSizeElement = screen.getByText(expectedText);
      expect(within(pageSizeElement).getByText('isDisabled: true')).toBeInTheDocument();
    });

    it('invokes onPageSizeItemClick when onClick is triggered', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onPageSizeItemClick = vi.fn();
      const selectedPageSize = faker.helpers.arrayElement(defaultProps.pageSizeOptions);
      const props = { ...defaultProps, onPageSizeItemClick, selectedPageSize };

      // * ACT
      render(getComponentToRender(props));
      const expectedText = `PageSizeSelectorItem - ${selectedPageSize}`;
      const triggerButton = within(screen.getByText(expectedText)).getByRole('button');
      await user.click(triggerButton);

      // * ASSERT
      expect(onPageSizeItemClick).toHaveBeenCalled();
    });
  });
});
