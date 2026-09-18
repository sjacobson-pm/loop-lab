import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CollapsibleFormSection } from './CollapsibleFormSection';

// **********************************************************************
// * constants / test vars

const childrenContent = faker.lorem.sentence();

const defaultProps = {
  id: faker.string.alphanumeric(10),
  title: faker.lorem.words(3),
  children: <div>{childrenContent}</div>,
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <CollapsibleFormSection {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('./components/SectionHeader', () => ({
  SectionHeader: ({ title, onClick, isCollapsed }) => (
    <div onClick={onClick} data-title={JSON.stringify(title)} data-is-collapsed={JSON.stringify(isCollapsed)}>
      SectionHeader
    </div>
  ),
}));

vi.mock('./components/SectionBody', () => ({
  SectionBody: ({ isCollapsed, onCollapsedContentClick, children }) => (
    <div>
      <div data-is-collapsed={JSON.stringify(isCollapsed)}>SectionBody</div>
      <div role="collapsed-content" onClick={onCollapsedContentClick}>
        collapsed-content
      </div>
      {children}
    </div>
  ),
}));

// **********************************************************************
// * unit tests

describe('CollapsibleFormSection', () => {
  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBe(true);
  });

  it('renders SectionHeader and SectionBody', () => {
    render(getComponentToRender(defaultProps));
    expect(screen.getByText('SectionHeader')).toBeInTheDocument();
    expect(screen.getByText('SectionBody')).toBeInTheDocument();
  });

  it('passes the title to SectionHeader', () => {
    render(getComponentToRender(defaultProps));
    const header = screen.getByText('SectionHeader');
    const actualTitle = JSON.parse(header.getAttribute('data-title'));
    expect(actualTitle).toBe(defaultProps.title);
  });

  it('initially passes isCollapsed=false to both SectionHeader and SectionBody', () => {
    render(getComponentToRender(defaultProps));
    const header = screen.getByText('SectionHeader');
    const body = screen.getByText('SectionBody');
    expect(JSON.parse(header.getAttribute('data-is-collapsed'))).toBe(false);
    expect(JSON.parse(body.getAttribute('data-is-collapsed'))).toBe(false);
  });

  it('toggles to isCollapsed=true when SectionHeader is clicked', async () => {
    // * ARRANGE
    const user = userEvent.setup();

    // * ACT
    render(getComponentToRender(defaultProps));
    await user.click(screen.getByText('SectionHeader'));

    // * ASSERT
    const header = screen.getByText('SectionHeader');
    const body = screen.getByText('SectionBody');
    expect(JSON.parse(header.getAttribute('data-is-collapsed'))).toBe(true);
    expect(JSON.parse(body.getAttribute('data-is-collapsed'))).toBe(true);
  });

  it('toggles to isCollapsed=true when collapsed content in SectionBody is clicked', async () => {
    // * ARRANGE
    const user = userEvent.setup();

    // * ACT
    render(getComponentToRender(defaultProps));
    await user.click(screen.getByRole('collapsed-content'));

    // * ASSERT
    const header = screen.getByText('SectionHeader');
    const body = screen.getByText('SectionBody');
    expect(JSON.parse(header.getAttribute('data-is-collapsed'))).toBe(true);
    expect(JSON.parse(body.getAttribute('data-is-collapsed'))).toBe(true);
  });

  it('renders children inside SectionBody', () => {
    render(getComponentToRender(defaultProps));
    expect(screen.getByText(childrenContent)).toBeInTheDocument();
  });
});
