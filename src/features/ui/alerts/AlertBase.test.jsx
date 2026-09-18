import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AlertBase } from './AlertBase';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  variant: faker.string.alphanumeric(10),
  icon: faker.string.alpha(10),
  iconSpinPulse: faker.datatype.boolean(),
  displayText: faker.lorem.sentence(),
};

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <AlertBase {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('@fortawesome/react-fontawesome');

// **********************************************************************
// * unit tests

describe('AlertBase', () => {
  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBe(true);
  });

  it('passes the variant to Alert and applies the className', () => {
    // * ARRANGE
    const variant = faker.string.alphanumeric(10);

    // * ACT
    render(getComponentToRender({ ...defaultProps, variant }));

    // * ASSERT
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass(`alert-${variant}`);
    expect(alert).toHaveClass('tw:text-xl');
  });

  it('renders FontAwesomeIcon with provided icon and fixed size "xl"', () => {
    // * ARRANGE
    const icon = faker.string.alpha(10);

    // * ACT
    render(getComponentToRender({ ...defaultProps, icon }));

    // * ASSERT
    const iconElement = screen.getByText('FontAwesomeIcon');
    const actualIcon = JSON.parse(iconElement.getAttribute('data-icon'));
    const actualSize = JSON.parse(iconElement.getAttribute('data-size'));
    expect(actualIcon).toBe(icon);
    expect(actualSize).toBe('xl');
  });

  it('sets FontAwesomeIcon spinPulse=false when iconSpinPulse is false', () => {
    // * ARRANGE
    const iconSpinPulse = false;

    // * ACT
    render(getComponentToRender({ ...defaultProps, iconSpinPulse }));

    // * ASSERT
    const iconElement = screen.getByText('FontAwesomeIcon');
    const actualSpinPulse = JSON.parse(iconElement.getAttribute('data-spin-pulse'));
    expect(actualSpinPulse).toBe(iconSpinPulse);
  });

  it('sets FontAwesomeIcon spinPulse=true when iconSpinPulse is true', () => {
    // * ARRANGE
    const iconSpinPulse = true;

    // * ACT
    render(getComponentToRender({ ...defaultProps, iconSpinPulse }));

    // * ASSERT
    const iconElement = screen.getByText('FontAwesomeIcon');
    const actualSpinPulse = JSON.parse(iconElement.getAttribute('data-spin-pulse'));
    expect(actualSpinPulse).toBe(iconSpinPulse);
  });

  it('renders the displayText', () => {
    const displayText = faker.lorem.sentence();
    render(getComponentToRender({ ...defaultProps, displayText }));
    expect(screen.getByText(displayText)).toBeInTheDocument();
  });

  it('renders children content', () => {
    const childContent = faker.lorem.sentence();
    render(getComponentToRender({ ...defaultProps, children: <span>{childContent}</span> }));
    expect(screen.getByText(childContent)).toBeInTheDocument();
  });
});
