import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageOverlay } from './PageOverlay';

// **********************************************************************
// * constants / test vars

const childrenContent = faker.string.alphanumeric(10);

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return (
    <PageOverlay {...props}>
      <div>{childrenContent}</div>
    </PageOverlay>
  );
};

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('PageOverlay', () => {
  it('renders without crashing', () => {
    render(getComponentToRender());
    expect(true).toBe(true);
  });

  it('renders children', () => {
    render(getComponentToRender());
    expect(screen.getByText(childrenContent)).toBeInTheDocument();
  });

  it('applies base overlay positioning classes', () => {
    render(getComponentToRender());
    const overlay = screen.getByRole('page-overlay');
    expect(overlay).toHaveClass('tw:fixed');
    expect(overlay).toHaveClass('tw:inset-0');
    expect(overlay).toHaveClass('tw:z-[9999]');
  });

  it('uses translucent background classes when isTranslucent=true', () => {
    render(getComponentToRender({ isTranslucent: true }));
    const overlay = screen.getByRole('page-overlay');

    // translucent
    expect(overlay).toHaveClass('tw:bg-white/80');
    expect(overlay).toHaveClass('tw:dark:bg-pm-granite-950/80');

    // not solid
    expect(overlay).not.toHaveClass('tw:bg-white');
    expect(overlay).not.toHaveClass('tw:dark:bg-pm-granite-950');
  });

  it('uses solid background classes when isTranslucent=false', () => {
    render(getComponentToRender({ isTranslucent: false }));
    const overlay = screen.getByRole('page-overlay');

    // solid
    expect(overlay).toHaveClass('tw:bg-white');
    expect(overlay).toHaveClass('tw:dark:bg-pm-granite-950');

    // not translucent
    expect(overlay).not.toHaveClass('tw:bg-white/80');
    expect(overlay).not.toHaveClass('tw:dark:bg-pm-granite-950/80');
  });

  it('defaults to solid background when isTranslucent is omitted', () => {
    render(getComponentToRender());
    const overlay = screen.getByRole('page-overlay');
    expect(overlay).toHaveClass('tw:bg-white');
    expect(overlay).toHaveClass('tw:dark:bg-pm-granite-950');
  });
});
