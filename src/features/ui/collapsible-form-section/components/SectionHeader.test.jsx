import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';

import { SectionHeader } from './SectionHeader';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  title: faker.lorem.words(3),
  onClick: vi.fn(),
  isCollapsed: faker.datatype.boolean(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <SectionHeader {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');
vi.mock('configs/fontAwesomeConfig');

// **********************************************************************
// * unit tests

describe('SectionHeader', () => {
  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBe(true);
  });

  it('renders the provided title', () => {
    const title = faker.lorem.words(2);
    render(getComponentToRender({ ...defaultProps, title }));
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('uses the caret-up icon when isCollapsed is true', () => {
    render(getComponentToRender({ ...defaultProps, isCollapsed: true }));
    const iconEl = screen.getByText('FontAwesomeIcon');
    const actualIcon = JSON.parse(iconEl.getAttribute('data-icon'));
    expect(actualIcon).toBe(fontAwesomeConfig.classicSolidIcons.faCaretUp);
  });

  it('uses the caret-down icon when isCollapsed is false', () => {
    render(getComponentToRender({ ...defaultProps, isCollapsed: false }));
    const iconEl = screen.getByText('FontAwesomeIcon');
    const actualIcon = JSON.parse(iconEl.getAttribute('data-icon'));
    expect(actualIcon).toBe(fontAwesomeConfig.classicSolidIcons.faCaretDown);
  });

  it('invokes onClick when clicked', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const onClick = vi.fn();
    const title = faker.lorem.words(2);

    // * ACT
    render(getComponentToRender({ ...defaultProps, onClick, title }));
    await user.click(screen.getByText(title));

    // * ASSERT
    expect(onClick).toHaveBeenCalledOnce();
  });
});
