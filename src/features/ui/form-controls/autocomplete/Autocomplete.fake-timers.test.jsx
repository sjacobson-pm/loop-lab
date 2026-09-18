import { faker } from '@faker-js/faker';
import { fireEvent, render, screen } from '@testing-library/react';
import Autosuggest from 'react-autosuggest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('Autocomplete - tests requiring fake timers', () => {
  describe('Autosuggest component', () => {
    describe('onSuggestionsFetchRequested timeout-based tests', () => {
      // **********************************************************************
      // * setup

      beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(globalThis, 'clearTimeout');
        vi.spyOn(globalThis, 'setTimeout');

        const MockAutosuggest = ({ onSuggestionsFetchRequested }) => (
          <button
            type="button"
            onClick={() => onSuggestionsFetchRequested({ value: eventValues.onSuggestionsFetchRequestedValue })}>
            event-trigger--fetch-suggestions
          </button>
        );
        Autosuggest.mockImplementation(MockAutosuggest);
      });

      // **********************************************************************
      // * tear-down

      afterEach(() => {
        globalThis.clearTimeout.mockRestore();
        globalThis.setTimeout.mockRestore();

        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.clearAllTimers();
      });

      // **********************************************************************
      // * execution

      it('invokes onSuggestionsFetchRequested when autoSuggest.onSuggestionsFetchRequested is triggered', async () => {
        const props = { ...defaultProps, onSuggestionsFetchRequested: vi.fn() };
        const expectedEventArgs = eventValues.onSuggestionsFetchRequestedValue;
        render(getComponentToRender(props));
        const fetchSuggestionsTrigger = screen.getByText('event-trigger--fetch-suggestions');
        fireEvent.click(fetchSuggestionsTrigger);
        await vi.runOnlyPendingTimersAsync();
        expect(props.onSuggestionsFetchRequested).toHaveBeenCalledTimes(1);
        expect(props.onSuggestionsFetchRequested).toHaveBeenCalledWith(expectedEventArgs);
      });

      it('invokes onSuggestionsFetchRequested once when autoSuggest.onSuggestionsFetchRequested is triggered multiple times in succession', async () => {
        const props = { ...defaultProps, onSuggestionsFetchRequested: vi.fn() };
        render(getComponentToRender(props));
        const fetchSuggestionsTrigger = screen.getByText('event-trigger--fetch-suggestions');
        fireEvent.click(fetchSuggestionsTrigger);
        fireEvent.click(fetchSuggestionsTrigger);
        vi.runOnlyPendingTimers();
        expect(props.onSuggestionsFetchRequested).toHaveBeenCalledTimes(1);
      });

      it('invokes onSuggestionsFetchRequested multiple times when autoSuggest.onSuggestionsFetchRequested is triggered multiple times in succession with time for delay to expire', async () => {
        const props = { ...defaultProps, onSuggestionsFetchRequested: vi.fn() };
        render(getComponentToRender(props));
        const fetchSuggestionsTrigger = screen.getByText('event-trigger--fetch-suggestions');
        fireEvent.click(fetchSuggestionsTrigger);
        vi.runOnlyPendingTimers();
        expect(props.onSuggestionsFetchRequested).toHaveBeenCalledTimes(1);
        fireEvent.click(fetchSuggestionsTrigger);
        vi.runOnlyPendingTimers();
        expect(props.onSuggestionsFetchRequested).toHaveBeenCalledTimes(2);
      });
    });
  });
});
