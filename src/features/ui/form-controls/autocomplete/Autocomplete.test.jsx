import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Autosuggest from 'react-autosuggest';
import { describe, expect, it, vi } from 'vitest';

import { theme } from 'features/ui/form-controls/autocomplete/theme';
import { mockEventValues } from 'testing/fakes/_external/react-autosuggest';

import { Autocomplete } from './Autocomplete';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  name: faker.string.alphanumeric(10),
  value: faker.string.alphanumeric(10),
  displayValue: faker.string.alphanumeric(10),
  placeholder: faker.string.alphanumeric(10),
  disabled: faker.datatype.boolean(),
  minimumSearchChars: faker.number.int({ min: 2, max: 10 }),
  searchDelayMs: faker.number.int({ min: 100, max: 500 }),
  isLoading: faker.datatype.boolean(),
  suggestions: faker.helpers.multiple(() => ({
    id: faker.string.alphanumeric(10),
    name: faker.string.alphanumeric(10),
  })),
  suggestionTextPropName: faker.string.alphanumeric(10),
  suggestionValuePropName: faker.string.alphanumeric(10),
  renderSuggestion: vi.fn(),
  onChange: vi.fn(),
  onSuggestionsFetchRequested: vi.fn(),
  onSuggestionsClearRequested: vi.fn(),
};

const eventValues = mockEventValues(defaultProps.suggestionTextPropName, defaultProps.suggestionValuePropName);

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <Autocomplete {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('react-autosuggest');
vi.mock('@fortawesome/react-fontawesome');
vi.mock('configs/fontAwesomeConfig');

// **********************************************************************
// * unit tests

describe('Autocomplete', () => {
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

  describe('Autosuggest component', () => {
    it('has correct id based on name prop', () => {
      // * ARRANGE
      const expectedId = `${defaultProps.name}--autocomplete`;

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      const autosuggest = screen.getByText('Autosuggest');
      expect(autosuggest).toHaveAttribute('data-id', expectedId);
    });

    it('has correct suggestions based on suggestions prop', () => {
      // * ARRANGE
      const expectedSuggestions = JSON.stringify(defaultProps.suggestions);

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      const autosuggest = screen.getByText('Autosuggest');
      expect(autosuggest).toHaveAttribute('data-suggestions', expectedSuggestions);
    });

    describe('shouldRenderSuggestions', () => {
      it('returns false when reason is input-focused', () => {
        // * ARRANGE
        const { value } = defaultProps;
        const reason = 'input-focused';
        const MockAutosuggest = ({ shouldRenderSuggestions }) => (
          <div>{!shouldRenderSuggestions(value, reason) && <div>should-render--false</div>}</div>
        );
        Autosuggest.mockImplementation(MockAutosuggest);

        // * ACT
        render(getComponentToRender(defaultProps));

        // * ASSERT
        expect(screen.getByText('should-render--false')).toBeInTheDocument();
      });

      it('returns false when reason is not input-focused and value length is less than minimumSearchChars', () => {
        // * ARRANGE
        const minimumSearchChars = faker.number.int({ min: 2, max: 10 });
        const value = faker.string.alpha({ length: { min: 1, max: minimumSearchChars - 1 } });
        const reason = faker.string.alpha(10);
        const props = { ...defaultProps, value, minimumSearchChars };
        const MockAutosuggest = ({ shouldRenderSuggestions }) => (
          <div>{!shouldRenderSuggestions(value, reason) && <div>should-render--false</div>}</div>
        );
        Autosuggest.mockImplementation(MockAutosuggest);

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByText('should-render--false')).toBeInTheDocument();
      });

      it('returns true when reason is not input-focused and value length is equal to or greater than minimumSearchChars', () => {
        // * ARRANGE
        const minimumSearchChars = faker.number.int({ min: 2, max: 10 });
        const value = faker.string.alpha({ length: { min: minimumSearchChars, max: 50 } });
        const reason = faker.string.alpha(10);
        const props = { ...defaultProps, value, minimumSearchChars };
        const MockAutosuggest = ({ shouldRenderSuggestions }) => (
          <div>{shouldRenderSuggestions(value, reason) && <div>should-render--true</div>}</div>
        );
        Autosuggest.mockImplementation(MockAutosuggest);

        // * ACT
        render(getComponentToRender(props));

        // * ASSERT
        expect(screen.getByText('should-render--true')).toBeInTheDocument();
      });
    });

    describe('inputProps', () => {
      it('has correct prop values', () => {
        // * ARRANGE
        const expectedName = `${defaultProps.name}--autocomplete`;
        const expectedId = expectedName;
        const expectedValue = defaultProps.displayValue;
        const expectedPlaceholder = defaultProps.placeholder;
        const expectedDisabled = defaultProps.disabled;

        // * ACT
        render(getComponentToRender(defaultProps));

        // * ASSERT
        const autosuggest = screen.getByText('Autosuggest');
        const inputProps = JSON.parse(autosuggest.getAttribute('data-input-props'));
        expect(inputProps).toBeDefined();
        expect(inputProps.name).toBe(expectedName);
        expect(inputProps.id).toBe(expectedId);
        expect(inputProps.value).toBe(expectedValue);
        expect(inputProps.placeholder).toBe(expectedPlaceholder);
        expect(inputProps.disabled).toBe(expectedDisabled);
      });

      it('invokes onChange with correct args when input onChange is triggered and new value is a string', async () => {
        // * ARRANGE
        const user = userEvent.setup();
        const expectedEventDetails = {
          displayTarget: {
            name: `${defaultProps.name}--autocomplete`,
            value: eventValues.inputProps.onChangeNewValueString,
          },
          valueTarget: { name: `${defaultProps.name}--value`, value: '' },
        };
        const MockAutosuggest = ({ inputProps }) => (
          <button
            type="button"
            onClick={(event) =>
              inputProps.onChange(event, { newValue: eventValues.inputProps.onChangeNewValueString })
            }>
            event-trigger--input-change--string
          </button>
        );
        Autosuggest.mockImplementation(MockAutosuggest);

        // * ACT
        render(getComponentToRender(defaultProps));
        const inputChangeTrigger = screen.getByText('event-trigger--input-change--string');
        await user.click(inputChangeTrigger);

        // * ASSERT
        expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
        expect(defaultProps.onChange).toHaveBeenCalledWith(expectedEventDetails);
      });

      it('invokes onChange with correct args when input onChange is triggered and new value is an object', async () => {
        // * ARRANGE
        const user = userEvent.setup();
        const expectedEventDetails = {
          displayTarget: {
            name: `${defaultProps.name}--autocomplete`,
            value: eventValues.inputProps.onChangeNewValueObject[defaultProps.suggestionTextPropName],
          },
          valueTarget: {
            name: `${defaultProps.name}--value`,
            value: eventValues.inputProps.onChangeNewValueObject[defaultProps.suggestionValuePropName],
          },
        };
        const MockAutosuggest = ({ inputProps }) => (
          <button
            type="button"
            onClick={(event) =>
              inputProps.onChange(event, { newValue: eventValues.inputProps.onChangeNewValueObject })
            }>
            event-trigger--input-change--object
          </button>
        );
        Autosuggest.mockImplementation(MockAutosuggest);

        // * ACT
        render(getComponentToRender(defaultProps));
        const inputChangeTrigger = screen.getByText('event-trigger--input-change--object');
        await user.click(inputChangeTrigger);

        // * ASSERT
        expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
        expect(defaultProps.onChange).toHaveBeenCalledWith(expectedEventDetails);
      });

      it('invokes onChange with correct args when input onBlur is triggered and value is empty', async () => {
        // * ARRANGE
        const user = userEvent.setup();
        const value = '';
        const props = { ...defaultProps, value };
        const expectedEventDetails = {
          displayTarget: { name: `${defaultProps.name}--autocomplete`, value: '' },
          valueTarget: { name: `${defaultProps.name}--value`, value: '' },
        };
        const MockAutosuggest = ({ inputProps }) => (
          <button type="button" onClick={inputProps.onBlur}>
            event-trigger--input-blur
          </button>
        );
        Autosuggest.mockImplementation(MockAutosuggest);

        // * ACT
        render(getComponentToRender(props));
        const inputBlurTrigger = screen.getByText('event-trigger--input-blur');
        await user.click(inputBlurTrigger);

        // * ASSERT
        expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
        expect(defaultProps.onChange).toHaveBeenCalledWith(expectedEventDetails);
      });
    });

    it('has correct theme based on defaultProps', () => {
      // * ARRANGE
      const expectedTheme = theme;

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      const autosuggest = screen.getByText('Autosuggest');
      const themeProp = JSON.parse(autosuggest.getAttribute('data-theme'));
      expect(themeProp).toEqual(expectedTheme);
    });

    it('invokes renderSuggestion when autocomplete renderSuggestion is triggered', async () => {
      // * ARRANGE
      const user = userEvent.setup();

      // * ACT
      render(getComponentToRender(defaultProps));
      const renderSuggestionTrigger = screen.getByText('event-trigger--render-suggestion');
      await user.click(renderSuggestionTrigger);

      // * ASSERT
      expect(defaultProps.renderSuggestion).toHaveBeenCalledTimes(1);
    });

    describe('getSuggestionValue', () => {
      it('always returns the raw suggestion', () => {
        // * ARRANGE
        const suggestion = defaultProps.suggestions[0];
        const MockAutosuggest = ({ getSuggestionValue }) => <div>{JSON.stringify(getSuggestionValue(suggestion))}</div>;
        Autosuggest.mockImplementation(MockAutosuggest);

        // * ACT
        render(getComponentToRender(defaultProps));

        // * ASSERT
        expect(screen.getByText(JSON.stringify(suggestion))).toBeInTheDocument();
      });
    });

    it('invokes onSuggestionsClearRequested when autoSuggest.onSuggestionsClearRequested is triggered', async () => {
      // * ARRANGE
      const user = userEvent.setup();

      // * ACT
      render(getComponentToRender(defaultProps));
      const clearSuggestionsTrigger = screen.getByText('event-trigger--clear-suggestions');
      await user.click(clearSuggestionsTrigger);

      // * ASSERT
      expect(defaultProps.onSuggestionsClearRequested).toHaveBeenCalledTimes(1);
    });
  });

  describe('FontAwesomeIcon component (loading spinner)', () => {
    it('is rendered when isLoading is true', () => {
      const props = { ...defaultProps, isLoading: true };
      render(getComponentToRender(props));
      expect(screen.getByText('FontAwesomeIcon')).toBeInTheDocument();
    });

    it('is not rendered when isLoading is false', () => {
      const props = { ...defaultProps, isLoading: false };
      render(getComponentToRender(props));
      expect(screen.queryByText('FontAwesomeIcon')).not.toBeInTheDocument();
    });
  });

  describe('hidden input', () => {
    it('is rendered', () => {
      // * ARRANGE
      const expectedId = `${defaultProps.name}--value`;

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      const hiddenInput = screen.getByRole('textbox', { hidden: true });
      expect(hiddenInput).toBeInTheDocument();
      expect(hiddenInput).toHaveAttribute('type', 'hidden');
      expect(hiddenInput).toHaveAttribute('id', expectedId);
      expect(hiddenInput).toHaveValue(defaultProps.value);
    });
  });
});
