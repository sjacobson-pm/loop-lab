import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { TestRouter } from 'testing/TestRouter';

import { LinkMenuItem } from './LinkMenuItem';

// **********************************************************************
// * constants

const defaultProps = {
  to: faker.string.alphanumeric(10),
  label: faker.string.alphanumeric(10),
  title: faker.string.alphanumeric(10),
  useLabelAsTitle: faker.datatype.boolean(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return (
    <TestRouter>
      <LinkMenuItem {...props} />
    </TestRouter>
  );
};

// **********************************************************************
// * mock external dependencies

vi.mock('./MenuItemContents');

// **********************************************************************
// * unit tests

describe('LinkMenuItem', () => {
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

  it('has correct title when useLabelAsTitle is true', () => {
    // * ARRANGE
    const label = faker.string.alphanumeric(10);
    const props = { ...defaultProps, label, useLabelAsTitle: true };

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    expect(screen.getByTitle(label)).toBeInTheDocument();
  });

  it('has correct title when useLabelAsTitle is false', () => {
    // * ARRANGE
    const title = faker.string.alphanumeric(10);
    const props = { ...defaultProps, title, useLabelAsTitle: false };

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    expect(screen.getByTitle(title)).toBeInTheDocument();
  });

  it('should change history when clicked and currentTarget.className does not contain "active"', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const to = `/${faker.string.alphanumeric(10)}`;
    const props = { ...defaultProps, to };
    const history = createMemoryHistory();
    const expectedPushArgs = { hash: '', pathname: to, search: '' };

    history.push = vi.fn();

    // * ACT
    render(
      <Router location={history.location} navigator={history}>
        <LinkMenuItem {...props} />
      </Router>
    );
    await user.click(screen.getByRole('link'));

    // * ASSERT
    expect(history.push).toHaveBeenCalledWith(expectedPushArgs, undefined, expect.any(Object));
  });

  it('should not change history when clicked and currentTarget.className contains "active"', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const to = `/${faker.string.alphanumeric(10)}`;
    const props = { ...defaultProps, to };
    const history = createMemoryHistory({ initialEntries: [to] });

    history.push = vi.fn();

    // * ACT
    render(
      <Router location={history.location} navigator={history}>
        <LinkMenuItem {...props} />
      </Router>
    );
    await user.click(screen.getByRole('link'));

    // * ASSERT
    expect(history.push).not.toHaveBeenCalled();
  });
});
