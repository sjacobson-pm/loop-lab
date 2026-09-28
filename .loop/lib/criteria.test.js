// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractCriteria } from './criteria.mjs';

const specPath = 'spec/example.html';
const options = Object.freeze({ acceptanceKinds: Object.freeze(['Rule']) });
const rule = '<div id="rule-a" data-pd-kind="Rule">A rule.</div>';

describe('extractCriteria', () => {
  it('projects exact metadata and richer nested source text without truncating quoted greater-than', () => {
    // * ARRANGE
    const html = `<div id="rule-positive" data-pd-slot="rules" data-pd-name="positive"
      data-pd-kind="Rule" data-pd-screen="Settings" data-pd-detail="Value must be > 0.">
      <b>Value</b> must be &gt; 0. <p>Reject <code>zero</code> &amp; negatives.</p>
    </div>`;
    // * ACT
    const result = extractCriteria(html, specPath, options);
    // * ASSERT
    expect(result).toEqual({
      spec_path: specPath,
      criteria: [
        {
          anchor: 'spec/example.html#rule-positive',
          slot: 'rules',
          name: 'positive',
          kind: 'Rule',
          screen: 'Settings',
          detail: 'Value must be > 0.',
          text: 'Value must be > 0. Reject zero & negatives.',
        },
      ],
      context: [],
    });
  });

  it('retains nonselected kinds and partial metadata as context in document order', () => {
    // * ARRANGE
    const html = `<section id="screen" data-pd-screen="Main">
      ${rule}<div id="step" data-pd-kind="Workflow step">Persist periodically.</div>
      <div id="scope" data-pd-kind="Scope item">No login.</div></section>`;
    // * ACT
    const result = extractCriteria(html, specPath, options);
    // * ASSERT
    expect(result.criteria.map(({ anchor }) => anchor)).toEqual(['spec/example.html#rule-a']);
    expect(result.context.map(({ anchor }) => anchor)).toEqual([
      'spec/example.html#screen',
      'spec/example.html#step',
      'spec/example.html#scope',
    ]);
    expect(result.context[0]).toMatchObject({
      slot: null,
      name: null,
      kind: null,
      screen: 'Main',
      detail: null,
    });
  });

  it('uses exact, configurable kind membership rather than an embedded normative taxonomy', () => {
    // * ARRANGE
    const html = `${rule}<div id="trigger" data-pd-kind="Trigger">Start.</div>
      <div id="branch" data-pd-kind="Branch">Pause when enabled.</div>
      <div id="lower" data-pd-kind="rule">Lowercase is a different kind.</div>`;
    // * ACT
    const result = extractCriteria(html, specPath, { acceptanceKinds: ['Trigger', 'Branch', 'Trigger'] });
    // * ASSERT
    expect(result.criteria.map(({ kind }) => kind)).toEqual(['Trigger', 'Branch']);
    expect(result.context.map(({ kind }) => kind)).toEqual(['Rule', 'rule']);
  });

  it('ignores unanchored annotations and ordinary IDs without inventing anchors', () => {
    // * ARRANGE
    const html = `${rule}<button data-pd-kind="Rule" data-pd-name="missing-id">Not anchored.</button>
      <div id="ordinary">Not annotated.</div><div data-pd-slot="rules">Container without ID.</div>`;
    // * ACT
    const result = extractCriteria(html, specPath, options);
    // * ASSERT
    expect(result.criteria.map(({ anchor }) => anchor)).toEqual(['spec/example.html#rule-a']);
    expect(result.context).toEqual([]);
  });

  it('handles single-quoted and unquoted attributes, entities, and empty metadata literally', () => {
    // * ARRANGE
    const html = `<p id=rule-entity data-pd-kind='Rule' data-pd-name=''
      data-pd-detail='A &amp; B &gt; 0'>A&nbsp;&amp; B &gt; 0</p>`;
    // * ACT
    const result = extractCriteria(html, specPath, options);
    // * ASSERT
    expect(result.criteria[0]).toEqual({
      anchor: 'spec/example.html#rule-entity',
      slot: null,
      name: '',
      kind: 'Rule',
      screen: null,
      detail: 'A & B > 0',
      text: 'A & B > 0',
    });
  });

  it('does not execute scripts or include script/style source as criteria or text', () => {
    // * ARRANGE
    const html = `<div id="safe" data-pd-kind="Rule">Safe.
      <script>document.getElementById('safe').remove();</script>
      <style>.irrelevant { color: red; }</style></div>
      <script id="code" data-pd-kind="Rule">throw Error('executed');</script>
      <style id="css" data-pd-kind="Rule">body { display: none; }</style>
      <script src="https://example.invalid/script.js"></script>
      <link rel="stylesheet" href="https://example.invalid/style.css">`;
    // * ACT
    const result = extractCriteria(html, specPath, options);
    // * ASSERT
    expect(result.criteria).toHaveLength(1);
    expect(result.criteria[0]).toMatchObject({ anchor: 'spec/example.html#safe', text: 'Safe.' });
    expect(result.context).toEqual([]);
  });

  it('keeps nested anchored records without replacing richer parent content with detail', () => {
    // * ARRANGE
    const html = `<div id="parent" data-pd-kind="Rule" data-pd-detail="Short.">
      Parent <span id="child" data-pd-kind="Rule">child details</span>.
    </div>`;
    // * ACT
    const result = extractCriteria(html, specPath, options);
    // * ASSERT
    expect(result.criteria.map(({ anchor, text }) => ({ anchor, text }))).toEqual([
      { anchor: 'spec/example.html#parent', text: 'Parent child details.' },
      { anchor: 'spec/example.html#child', text: 'child details' },
    ]);
  });

  it('does not merge words at block or line-break boundaries', () => {
    // * ARRANGE
    const html = '<div id="rule-a" data-pd-kind="Rule"><p>First</p><p>Second<br>Third</p></div>';
    // * ACT
    const result = extractCriteria(html, specPath, options);
    // * ASSERT
    expect(result.criteria[0].text).toBe('First Second Third');
  });

  it('ignores commented and template-only annotations that are not document anchors', () => {
    // * ARRANGE
    const html = `${rule}<!-- <p id="comment" data-pd-kind="Rule">Fake</p> -->
      <template><div id="future" data-pd-kind="Rule">Not in the document</div></template>`;
    // * ACT
    const result = extractCriteria(html, specPath, options);
    // * ASSERT
    expect(result.criteria.map(({ anchor }) => anchor)).toEqual(['spec/example.html#rule-a']);
  });

  it.each([
    ['duplicate annotated IDs', `${rule}${rule}`, /duplicate.*rule-a/i],
    ['collision with a plain ID', `${rule}<p id="rule-a">Plain</p>`, /duplicate.*rule-a/i],
    ['collision with a script ID', `${rule}<script id="rule-a"></script>`, /duplicate.*rule-a/i],
    ['empty ID', `${rule}<i id="" data-pd-kind="Rule"></i>`, /invalid.*anchor/i],
    ['whitespace ID', `${rule}<i id="bad id" data-pd-kind="Rule"></i>`, /invalid.*anchor/i],
  ])('rejects ambiguous document anchors: %s', (_name, html, error) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => extractCriteria(html, specPath, options)).toThrow(error);
  });

  it.each([undefined, null, '', '   ', 42, {}])('rejects invalid HTML input: %j', (html) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => extractCriteria(html, specPath, options)).toThrow(/html/i);
  });

  it.each([undefined, null, '', '   ', 42, {}, 'spec/x.html#old'])('rejects invalid spec paths: %j', (path) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => extractCriteria(rule, path, options)).toThrow(/specPath/i);
  });

  it.each([
    undefined,
    null,
    {},
    [],
    { acceptanceKinds: null },
    { acceptanceKinds: 'Rule' },
    { acceptanceKinds: [] },
    { acceptanceKinds: [''] },
    { acceptanceKinds: ['  '] },
    { acceptanceKinds: [42] },
  ])('requires an explicit nonempty kind selection: %j', (selection) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => extractCriteria(rule, specPath, selection)).toThrow(/acceptanceKinds/i);
  });

  it.each([
    '<div id="ordinary">No annotations.</div>',
    '<div data-pd-kind="Rule">Missing anchor.</div>',
    '<div id="screen" data-pd-screen="Main">Only context.</div>',
  ])('rejects packages with no anchored selected candidates: %s', (html) => {
    // * ARRANGE / ACT / ASSERT
    expect(() => extractCriteria(html, specPath, options)).toThrow(/no anchored.*criteria/i);
  });

  it('reports unknown kinds instead of silently dropping a misspelled part of the selection', () => {
    // * ARRANGE / ACT / ASSERT
    expect(() => extractCriteria(rule, specPath, { acceptanceKinds: ['Rule', 'Workflow stpe'] })).toThrow(
      /unknown.*Workflow stpe/i
    );
  });

  it('is deterministic and returns independent data on each call', () => {
    // * ARRANGE
    const first = extractCriteria(rule, specPath, options);
    const second = extractCriteria(rule, specPath, options);
    // * ACT
    first.criteria[0].text = 'Changed by caller';
    // * ASSERT
    expect(second.criteria[0].text).toBe('A rule.');
    expect(extractCriteria(rule, specPath, options)).toEqual(second);
    expect(options.acceptanceKinds).toEqual(['Rule']);
  });
});

describe('the real discovery package', () => {
  const sourcePath = 'spec/pomodoro-workday-timers-spec.html';
  const html = readFileSync(
    fileURLToPath(new URL('../../spec/pomodoro-workday-timers-spec.html', import.meta.url)),
    'utf8'
  );

  it('projects all 301 actual annotated anchors, separating 25 rules from 276 contextual records', () => {
    // * ARRANGE / ACT
    const result = extractCriteria(html, sourcePath, options);
    // * ASSERT
    expect(result.criteria).toHaveLength(25);
    expect(result.context).toHaveLength(276);
    expect(new Set([...result.criteria, ...result.context].map(({ anchor }) => anchor)).size).toBe(301);
    expect(result.criteria.find(({ anchor }) => anchor.endsWith('#rule-one-running'))).toMatchObject({
      kind: 'Rule',
      slot: 'rules',
      name: 'only-one-running',
      screen: 'Main',
      detail:
        'At most one Timer per day with isRunning: true. Enforced client (auto-pause-on-select) and API (409 on conflicting PATCH).',
      text: expect.stringContaining('patchTimer(id, { isRunning: true });'),
    });
    expect(result.context.find(({ anchor }) => anchor.endsWith('#wf-tick-s1'))).toMatchObject({
      kind: 'Workflow step',
      detail: 'Local interval every 1000 ms; increments a local elapsedSeconds counter.',
    });
    expect(result.context.find(({ anchor }) => anchor.endsWith('#scope-in-multi-timers'))).toMatchObject({
      kind: 'Scope item',
      screen: 'in-scope',
    });
    expect(result.context.find(({ anchor }) => anchor.endsWith('#scr-main'))).toMatchObject({
      screen: 'Main',
      kind: null,
      slot: null,
      name: null,
      detail: null,
    });
    expect([...result.criteria, ...result.context].some(({ anchor }) => anchor.includes('timerEditBtn-101'))).toBe(
      false
    );
  });

  it('preserves the semantic differences hidden by Workflow step and Scope item kinds', () => {
    // * ARRANGE / ACT
    const result = extractCriteria(html, sourcePath, { acceptanceKinds: ['Workflow step', 'Scope item'] });
    // * ASSERT
    expect(result.criteria).toHaveLength(53);
    expect(result.criteria.find(({ anchor }) => anchor.endsWith('#wf-tick-s2')).text).toContain('Every 10 seconds');
    expect(result.criteria.find(({ anchor }) => anchor.endsWith('#wf-tick-doesnot')).text).toContain(
      'What this deliberately does not do'
    );
    expect(result.criteria.filter(({ screen }) => screen === 'in-scope')).toHaveLength(18);
    expect(result.criteria.filter(({ screen }) => screen === 'out-of-scope')).toHaveLength(15);
  });
});
