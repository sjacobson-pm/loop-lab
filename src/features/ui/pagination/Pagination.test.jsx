import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './Pagination';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  pageSizeOptions: Array.from(
    new Set(faker.helpers.multiple(() => faker.number.int({ min: 1, max: 100 }), { count: 5 }))
  ),
  pageSize: faker.number.int({ min: 5, max: 10 }),
  currentPage: faker.number.int({ min: 1, max: 20 }),
  totalPageCount: faker.number.int({ min: 20, max: 40 }),
  prePostItemCount: faker.number.int({ min: 2, max: 4 }),
  onPageItemClick: vi.fn(),
  onPageSizeItemClick: vi.fn(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <Pagination {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('configs/fontAwesomeConfig');

vi.mock('./PaginationItem', () => ({
  PaginationItem: ({ label, title, className, onClick }) => (
    <div>
      PaginationItem - {label}
      <div onClick={onClick}>title: {title}</div>
      <div>className - {className}</div>
    </div>
  ),
}));

vi.mock('./PageSizeSelector', () => ({
  PageSizeSelector: ({ pageSizeOptions }) => (
    <div>
      PageSizeSelector
      <div>pageSizeOptions - {JSON.stringify(pageSizeOptions)}</div>
    </div>
  ),
}));

// **********************************************************************
// * unit tests

describe('Pagination', () => {
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

  describe('pagination items', () => {
    it('adds a page item for every page when total page count <= max page item count', () => {
      // * ARRANGE
      const prePostItemCount = faker.number.int({ min: 1, max: 5 });
      const totalPageCount = faker.number.int({ min: 1, max: prePostItemCount * 2 + 4 });
      const props = { ...defaultProps, prePostItemCount, totalPageCount };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      for (let index = 1; index <= totalPageCount; index++) {
        const expectedTitle = `title: page ${index}`;
        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      }
    });

    it('adds a page item for the first and last page when total page count > max page item count', () => {
      // * ARRANGE
      const prePostItemCount = faker.number.int({ min: 1, max: 5 });
      const totalPageCount = faker.number.int({ min: prePostItemCount * 2 + 5, max: 20 });
      const props = { ...defaultProps, prePostItemCount, totalPageCount };

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getByText('PaginationItem - 1')).toBeInTheDocument();
      expect(screen.getByText(`PaginationItem - ${totalPageCount}`)).toBeInTheDocument();
    });

    it('adds the low page indexes when the current page is on the very low end of total page count', () => {
      // * ARRANGE
      const prePostItemCount = faker.number.int({ min: 1, max: 5 });
      const currentPage = faker.number.int({ min: 1, max: prePostItemCount + 3 });
      const props = { ...defaultProps, prePostItemCount, currentPage };
      const expectedIndexes = [...Array(prePostItemCount * 2 + 3).keys()].map((ix) =>
        Math.max(1, Math.min(props.totalPageCount, ix + 1))
      );

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      for (const index of expectedIndexes) {
        const expectedTitle = `title: page ${index}`;
        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      }
    });

    it('adds the mid page indexes for the sliding block)', () => {
      // * ARRANGE
      const props = { ...defaultProps };
      const expectedIndexes = [...Array(props.prePostItemCount * 2 + 1).keys()].map((ix) =>
        Math.max(1, Math.min(props.totalPageCount, ix + (props.currentPage - props.prePostItemCount)))
      );

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      for (const index of expectedIndexes) {
        const expectedTitle = `title: page ${index}`;
        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      }
    });

    it('adds the high page indexes when the current page is on the very high end of total page count', () => {
      // * ARRANGE
      const prePostItemCount = faker.number.int({ min: 1, max: 5 });
      const totalPageCount = defaultProps.totalPageCount;
      const currentPage = faker.number.int({ min: totalPageCount - (prePostItemCount + 2), max: totalPageCount });
      const props = { ...defaultProps, prePostItemCount, currentPage };
      const expectedIndexes = [...Array(prePostItemCount * 2 + 3).keys()].map((ix) =>
        Math.max(1, Math.min(totalPageCount, ix + (totalPageCount - (prePostItemCount * 2 + 2))))
      );

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      for (const index of expectedIndexes) {
        const expectedTitle = `title: page ${index}`;
        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      }
    });

    it('adds the high-end separator ("...") item  when total page count > max page item count and the current page number is not on the very high end', () => {
      const prePostItemCount = defaultProps.prePostItemCount;
      const totalPageCount = faker.number.int({ min: prePostItemCount * 2 + 6, max: 20 });
      const currentPage = faker.number.int({ min: 1, max: totalPageCount - (prePostItemCount + 3) });
      const props = { ...defaultProps, totalPageCount, currentPage };
      render(getComponentToRender(props));
      const expectedClassName = 'className - d-none d-lg-block high-separator';
      expect(screen.getByText(expectedClassName)).toBeInTheDocument();
    });

    it('adds the low-end separator ("...") item  when total page count > max page item count and the current page number is not on the very low end', () => {
      const prePostItemCount = defaultProps.prePostItemCount;
      const totalPageCount = faker.number.int({ min: prePostItemCount * 2 + 6, max: 20 });
      const currentPage = faker.number.int({ min: prePostItemCount + 4, max: totalPageCount });
      const props = { ...defaultProps, totalPageCount, currentPage };
      render(getComponentToRender(props));
      const expectedClassName = 'className - d-none d-lg-block low-separator';
      expect(screen.getByText(expectedClassName)).toBeInTheDocument();
    });

    it('invokes onPageItemClick for the first page when the "first page" page item is clicked', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onPageItemClick = vi.fn();
      const props = { ...defaultProps, onPageItemClick };
      const expectedTitle = 'title: first page';

      // * ACT
      render(getComponentToRender(props));
      await user.click(screen.getByText(expectedTitle));

      // * ASSERT
      expect(onPageItemClick).toHaveBeenCalledExactlyOnceWith(1);
    });

    it('invokes onPageItemClick for the previous page when the "previous page" page item is clicked', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onPageItemClick = vi.fn();
      const props = { ...defaultProps, onPageItemClick };
      const expectedTitle = `title: previous page`;

      // * ACT
      render(getComponentToRender(props));
      await user.click(screen.getByText(expectedTitle));

      // * ASSERT
      expect(onPageItemClick).toHaveBeenCalledExactlyOnceWith(props.currentPage - 1);
    });

    it('invokes onPageItemClick for the next page when the "next page" page item is clicked', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onPageItemClick = vi.fn();
      const props = { ...defaultProps, onPageItemClick };
      const expectedTitle = `title: next page`;

      // * ACT
      render(getComponentToRender(props));
      await user.click(screen.getByText(expectedTitle));

      // * ASSERT
      expect(onPageItemClick).toHaveBeenCalledExactlyOnceWith(props.currentPage + 1);
    });

    it('invokes onPageItemClick for the last page when the "last page" page item is clicked', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onPageItemClick = vi.fn();
      const props = { ...defaultProps, onPageItemClick };
      const expectedTitle = `title: last page`;

      // * ACT
      render(getComponentToRender(props));
      await user.click(screen.getByText(expectedTitle));

      // * ASSERT
      expect(onPageItemClick).toHaveBeenCalledExactlyOnceWith(props.totalPageCount);
    });

    it('invokes onPageItemClick when a numbered page item is clicked and it is not the current page', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onPageItemClick = vi.fn();
      const props = { ...defaultProps, onPageItemClick, currentPage: 2 };
      const expectedTitle = `title: page ${props.currentPage - 1}`;

      // * ACT
      render(getComponentToRender(props));
      await user.click(screen.getByText(expectedTitle));

      // * ASSERT
      expect(onPageItemClick).toHaveBeenCalledExactlyOnceWith(props.currentPage - 1);
    });

    it('does not invoke onPageItemClick when a numbered page item is clicked and it is the current page', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const onPageItemClick = vi.fn();
      const props = { ...defaultProps, onPageItemClick };
      const expectedTitle = `title: page ${props.currentPage}`;

      // * ACT
      render(getComponentToRender(props));
      await user.click(screen.getByText(expectedTitle));

      // * ASSERT
      expect(onPageItemClick).not.toHaveBeenCalled();
    });
  });

  describe('PageSizeSelector', () => {
    it('has correct page size options when pageSizeOptions has no values', () => {
      // * ARRANGE
      const props = { ...defaultProps, pageSizeOptions: undefined };
      const expectedPageSizeOptions = [10, 15, 25, 40];
      const expectedText = `pageSizeOptions - ${JSON.stringify(expectedPageSizeOptions)}`;

      // * ACT
      render(getComponentToRender(props));

      // * ASSERT
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });
});
