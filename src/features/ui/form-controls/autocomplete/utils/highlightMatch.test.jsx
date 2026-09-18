import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { highlightMatch } from './highlightMatch';

// **********************************************************************
// * constants / test vars

const LABEL_SUBJECT = 'subject';

// **********************************************************************
// * functions

const getAllHighlightSpans = (matcher) => screen.queryAllByText(matcher, { selector: 'span.tw\\:font-extrabold' });

const getComponentToRender = (children) => <div aria-label={LABEL_SUBJECT}>{children}</div>;

// **********************************************************************
// * mock external dependencies

// **********************************************************************
// * unit tests

describe('highlightMatch', () => {
  // **********************************************************************
  // * setup

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('should return the original text when query is empty', () => {
    // * ARRANGE
    const text = 'Hello World';
    const query = '';

    // * ACT
    render(getComponentToRender(highlightMatch(text, query)));

    // * ASSERT
    expect(screen.getByLabelText(LABEL_SUBJECT)).toHaveTextContent(text);
    expect(getAllHighlightSpans(/.*/)).toHaveLength(0);
  });

  it('should not highlight anything when there is no match', () => {
    // * ARRANGE
    const text = 'Hello World';
    const query = 'xyz';

    // * ACT
    render(getComponentToRender(highlightMatch(text, query)));

    // * ASSERT
    expect(screen.getByLabelText(LABEL_SUBJECT)).toHaveTextContent(text);
    expect(getAllHighlightSpans(/.*/)).toHaveLength(0);
  });

  it('should highlight a case-insensitive match', () => {
    // * ARRANGE
    const text = 'Hello World';
    const query = 'world';

    // * ACT
    render(getComponentToRender(highlightMatch(text, query)));

    // * ASSERT
    const spans = getAllHighlightSpans(/world/i);
    expect(screen.getByLabelText(LABEL_SUBJECT)).toHaveTextContent(text);
    expect(spans.length).toBe(1);
    expect(spans[0]).toHaveTextContent('World');
    expect(spans[0]).toHaveClass('tw:font-extrabold');
  });

  it('should highlight all occurrences of the query', () => {
    // * ARRANGE
    const text = 'banana bandana'; // "banana bandana" contains 'an' 4 times
    const query = 'an';

    // * ACT
    render(getComponentToRender(highlightMatch(text, query)));

    // * ASSERT
    const spans = getAllHighlightSpans(/an/i);
    expect(screen.getByLabelText(LABEL_SUBJECT)).toHaveTextContent(text);
    expect(spans.length).toBe(4);
    spans.forEach((span) => expect(span).toHaveTextContent(query));
  });

  it('should escape regex special characters in the query and match literally', () => {
    // * ARRANGE
    const text = 'a.+?b and .+? end';
    const query = '.+?';

    // * ACT
    render(getComponentToRender(highlightMatch(text, query)));

    // * ASSERT
    const spans = getAllHighlightSpans(query);
    expect(screen.getByLabelText(LABEL_SUBJECT)).toHaveTextContent(text);
    expect(spans.length).toBe(2);
    spans.forEach((span) => expect(span).toHaveTextContent(query));
  });
});
