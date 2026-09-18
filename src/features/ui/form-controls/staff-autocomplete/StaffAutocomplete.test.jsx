import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStaffByIdQuery } from 'apis/pm-apis/central-data-store/root/staff/queries';
import { highlightMatch } from 'features/ui/form-controls/autocomplete/utils/highlightMatch';
import { useStaffSearch } from 'features/ui/form-controls/staff-autocomplete/hooks/useStaffSearch';

import { Autocomplete } from 'features/ui/form-controls/autocomplete/Autocomplete';

import { StaffAutocomplete } from './StaffAutocomplete';

// **********************************************************************
// * constants / test vars

const defaultProps = {
  name: faker.string.alpha(10),
  value: faker.string.alpha(10),
  disabled: faker.datatype.boolean(),
  placeholder: faker.string.alpha(10),
  onChange: vi.fn(),
};

let staffByIdQuery;
let staffSearchResult;
let highlightMatchResult;

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <StaffAutocomplete {...props} />;
};

// **********************************************************************
// * mock external dependencies

vi.mock('apis/pm-apis/central-data-store/root/staff/queries');
vi.mock('features/ui/form-controls/autocomplete/utils/highlightMatch', () => ({
  highlightMatch: vi.fn(),
}));
vi.mock('features/ui/form-controls/staff-autocomplete/hooks/useStaffSearch');
vi.mock('features/ui/form-controls/autocomplete/Autocomplete');

// **********************************************************************
// * unit tests

describe('StaffAutocomplete', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    staffByIdQuery = useStaffByIdQuery.__resetMockStaffByIdQuery();
    staffSearchResult = useStaffSearch.__resetMockResult();

    highlightMatchResult = faker.string.alpha(10);
    highlightMatch.mockReturnValue(highlightMatchResult);
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBe(true);
  });

  describe('Autocomplete', () => {
    it('has correct name prop', () => {
      render(getComponentToRender(defaultProps));
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-name', defaultProps.name);
    });

    it('has correct value prop', () => {
      render(getComponentToRender(defaultProps));
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-value', defaultProps.value);
    });

    it('has correct displayValue prop when staff data has a value', () => {
      staffByIdQuery.data = { preferredFullName: faker.person.fullName() };
      render(getComponentToRender(defaultProps));
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-display-value', staffByIdQuery.data.preferredFullName);
    });

    it('has correct displayValue prop when staff data preferredFullName is empty', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const keyedValue = faker.string.alpha(10);
      const MockAutocomplete = ({ displayValue, onChange }) => (
        <div data-display-value={displayValue}>
          Autocomplete
          <button type="button" onClick={() => onChange({ displayTarget: { value: keyedValue } })}>
            event-trigger--on-change
          </button>
        </div>
      );
      Autocomplete.mockImplementation(MockAutocomplete);
      staffByIdQuery.data = { preferredFullName: '' };

      // * ACT
      render(getComponentToRender(defaultProps));
      const trigger = screen.getByText('event-trigger--on-change');
      await user.click(trigger);

      // * ASSERT
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-display-value', keyedValue);
    });

    it('has correct displayValue prop when staff data has no value', async () => {
      const user = userEvent.setup();
      const keyedValue = faker.string.alpha(10);
      const MockAutocomplete = ({ displayValue, onChange }) => (
        <div data-display-value={displayValue}>
          Autocomplete
          <button type="button" onClick={() => onChange({ displayTarget: { value: keyedValue } })}>
            event-trigger--on-change
          </button>
        </div>
      );
      Autocomplete.mockImplementation(MockAutocomplete);
      staffByIdQuery.data = null;

      // * ACT
      render(getComponentToRender(defaultProps));
      const trigger = screen.getByText('event-trigger--on-change');
      await user.click(trigger);

      // * ASSERT
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-display-value', keyedValue);
    });

    it('has correct disabled prop', () => {
      render(getComponentToRender(defaultProps));
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-disabled', String(defaultProps.disabled));
    });

    it('has correct placeholder prop', () => {
      render(getComponentToRender(defaultProps));
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-placeholder', defaultProps.placeholder);
    });

    it('has correct isLoading prop', () => {
      staffSearchResult.isSearching = faker.datatype.boolean();
      render(getComponentToRender(defaultProps));
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-is-loading', String(staffSearchResult.isSearching));
    });

    it('has correct suggestions prop', () => {
      staffSearchResult.staffSearchResults = [
        { id: faker.string.alpha(5), preferredFullName: faker.person.fullName() },
        { id: faker.string.alpha(5), preferredFullName: faker.person.fullName() },
      ];
      render(getComponentToRender(defaultProps));
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-suggestions', JSON.stringify(staffSearchResult.staffSearchResults));
    });

    it('has correct suggestionTextPropName prop', () => {
      render(getComponentToRender(defaultProps));
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-suggestion-text-prop-name', 'preferredFullName');
    });

    it('has correct suggestionValuePropName prop', () => {
      render(getComponentToRender(defaultProps));
      const autoComplete = screen.getByText('Autocomplete');
      expect(autoComplete).toHaveAttribute('data-suggestion-value-prop-name', 'id');
    });

    it('renders the correct suggestion when autocomplete renderSuggestion is invoked', () => {
      // * ARRANGE
      const suggestion = { id: faker.string.alpha(5), preferredFullName: faker.person.fullName() };
      const query = faker.string.alpha(3);
      const MockAutocomplete = ({ renderSuggestion }) => <div>aaa{renderSuggestion(suggestion, { query })}</div>;
      Autocomplete.mockImplementation(MockAutocomplete);

      // * ACT
      render(getComponentToRender(defaultProps));

      // * ASSERT
      expect(highlightMatch).toHaveBeenCalledWith(`${suggestion.preferredFullName} (${suggestion.id})`, query);
      expect(screen.getByText(highlightMatchResult)).toBeInTheDocument();
    });

    it('invokes onChange when autocomplete onChange is triggered', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const keyedValue = faker.string.alpha(10);
      const MockAutocomplete = ({ onChange }) => (
        <div>
          Autocomplete
          <button type="button" onClick={() => onChange({ displayTarget: { value: keyedValue } })}>
            event-trigger--on-change
          </button>
        </div>
      );
      Autocomplete.mockImplementation(MockAutocomplete);

      // * ACT
      render(getComponentToRender(defaultProps));
      const trigger = screen.getByText('event-trigger--on-change');
      await user.click(trigger);

      // * ASSERT
      expect(defaultProps.onChange).toHaveBeenCalledWith({ displayTarget: { value: keyedValue } });
    });

    it('invokes setStaffSearchTerm when autocomplete onSuggestionsFetchRequested is triggered', async () => {
      // * ARRANGE
      const user = userEvent.setup();
      const searchQuery = faker.string.alpha(10);
      const MockAutocomplete = ({ onSuggestionsFetchRequested }) => (
        <button type="button" onClick={() => onSuggestionsFetchRequested(searchQuery)}>
          event-trigger--fetch-suggestions
        </button>
      );
      Autocomplete.mockImplementation(MockAutocomplete);

      // * ACT
      render(getComponentToRender(defaultProps));
      const fetchSuggestionsTrigger = screen.getByText('event-trigger--fetch-suggestions');
      await user.click(fetchSuggestionsTrigger);

      // * ASSERT
      expect(staffSearchResult.setStaffSearchTerm).toHaveBeenCalledWith(searchQuery);
    });

    it('invokes clearStaffSearchResults when autocomplete onSuggestionsClearRequested is triggered', async () => {
      // * ARRANGE
      const user = userEvent.setup();

      // * ACT
      render(getComponentToRender(defaultProps));
      const clearSuggestionsTrigger = screen.getByText('event-trigger--clear-suggestions');
      await user.click(clearSuggestionsTrigger);

      // * ASSERT
      expect(staffSearchResult.clearStaffSearchResults).toHaveBeenCalled();
    });
  });
});
