import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import styles from '../CollapsibleFormSection.module.css';

import { SectionBody } from './SectionBody';

// **********************************************************************
// * constants / test vars

const childrenContent = faker.lorem.sentence();

const defaultProps = {
  isCollapsed: false,
  onCollapsedContentClick: vi.fn(),
  children: <div>{childrenContent}</div>,
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <SectionBody {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');
vi.mock('configs/fontAwesomeConfig');

// **********************************************************************
// * unit tests

describe('SectionBody', () => {
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

  it('renders the children in the expanded-content area', () => {
    render(getComponentToRender(defaultProps));
    expect(screen.getByText(childrenContent)).toBeInTheDocument();
  });

  it('applies the collapsed class when isCollapsed is true', () => {
    // * ARRANGE
    const props = { ...defaultProps, isCollapsed: true };

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    expect(screen.getByRole('section-body')).toHaveClass(styles.collapsed);
  });

  it('does not apply the collapsed class when isCollapsed is false', () => {
    // * ARRANGE
    const props = { ...defaultProps, isCollapsed: false };

    // * ACT
    render(getComponentToRender(props));

    // * ASSERT
    expect(screen.getByRole('section-body')).not.toHaveClass(styles.collapsed);
  });

  it('invokes onCollapsedContentClick when the collapsed content is clicked', async () => {
    // * ARRANGE
    const user = userEvent.setup();
    const onCollapsedContentClick = vi.fn();
    const props = { ...defaultProps, onCollapsedContentClick };

    // * ACT
    render(getComponentToRender(props));
    await user.click(screen.getByRole('collapsed-content'));

    // * ASSERT
    expect(onCollapsedContentClick).toHaveBeenCalledOnce();
  });
});
