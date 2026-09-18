import { PageSizeSelectorItem } from './PageSizeSelectorItem';

const PageSizeSelector = ({ pageSizeOptions, selectedPageSize, onPageSizeItemClick }) => {
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
    <div className="page-size-selector">
      <div className="list-group list-group-horizontal">
        <PageSizeSelectorItem label="Page Size" isDisabled />

        {pageSizeOptions.map((pageSize, index) => (
          <PageSizeSelectorItem
            key={index}
            label={pageSize}
            isActive={pageSize === selectedPageSize}
            isDisabled={pageSize === selectedPageSize}
            onClick={onPageSizeItemClick}
          />
        ))}
      </div>
    </div>
  );
};

export { PageSizeSelector };
