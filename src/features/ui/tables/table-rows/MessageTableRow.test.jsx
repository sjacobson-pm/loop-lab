import { faker } from '@faker-js/faker';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { MessageTableRow } from './MessageTableRow';

// **********************************************************************
// * constants

const defaultProps = {
  colSpan: faker.number.int({ min: 1, max: 10 }),
  className: faker.lorem.word(),
  children: faker.lorem.sentence(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <MessageTableRow {...props} />;
};

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('MessageTableRow', () => {
  // **********************************************************************
  // * setup

  let table;
  let tbody;

  beforeEach(() => {
    table = document.createElement('table');
    tbody = document.createElement('tbody');
    table.appendChild(tbody);
    document.body.appendChild(table);
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps), { container: tbody });
    expect(true).toBe(true);
  });
});
