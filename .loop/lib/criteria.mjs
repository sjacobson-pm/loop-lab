import { JSDOM } from 'jsdom';

const metadataKeys = ['slot', 'name', 'kind', 'screen', 'detail'];
const textBoundaries = [
  'address',
  'article',
  'aside',
  'blockquote',
  'br',
  'caption',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'legend',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'td',
  'th',
  'tr',
  'ul',
].join(', ');

/**
 * @typedef {object} Criterion
 * @property {string} anchor
 * @property {string | null} slot
 * @property {string | null} name
 * @property {string | null} kind
 * @property {string | null} screen
 * @property {string | null} detail
 * @property {string} text
 */

/**
 * Projects source annotations; kind selection marks candidates, not semantic acceptance.
 * Scripts and resource loading remain disabled by JSDOM's defaults.
 * @param {string} html
 * @param {string} specPath Source citation path, without a fragment.
 * @param {{ acceptanceKinds: string[] }} options Explicit, case-sensitive selection.
 * @returns {{ spec_path: string, criteria: Criterion[], context: Criterion[] }}
 */
export function extractCriteria(html, specPath, options) {
  if (typeof html !== 'string' || !html.trim()) throw new TypeError('html must be a nonempty string');
  if (typeof specPath !== 'string' || !specPath.trim() || specPath.includes('#')) {
    throw new TypeError('specPath must be a nonempty path without a fragment');
  }
  const acceptanceKinds = options?.acceptanceKinds;
  if (!Array.isArray(acceptanceKinds) || acceptanceKinds.length === 0) {
    throw new TypeError('acceptanceKinds must be an explicit nonempty array of kinds');
  }
  for (const kind of acceptanceKinds) {
    if (typeof kind !== 'string' || !kind.trim()) {
      throw new TypeError('acceptanceKinds must contain nonempty strings');
    }
  }

  const selectedKinds = new Set(acceptanceKinds);
  const dom = new JSDOM(html);
  try {
    const document = dom.window.document;
    const ids = new Set();
    for (const element of document.querySelectorAll('[id]')) {
      const id = element.id;
      if (!id || /[\t\n\f\r ]/.test(id)) throw new Error(`Invalid anchor: ${id}`);
      if (ids.has(id)) throw new Error(`Duplicate anchor: ${id}`);
      ids.add(id);
    }

    document.querySelectorAll('script, style').forEach((node) => node.remove());
    const records = [...document.querySelectorAll('[id]')]
      .filter((element) => metadataKeys.some((key) => element.hasAttribute(`data-pd-${key}`)))
      .map((element) => {
        const copy = element.cloneNode(true);
        // textContent alone joins adjacent blocks and drops br boundaries.
        copy.querySelectorAll(textBoundaries).forEach((node) => {
          node.before(' ');
          node.after(' ');
        });
        return {
          anchor: `${specPath}#${element.id}`,
          slot: element.getAttribute('data-pd-slot'),
          name: element.getAttribute('data-pd-name'),
          kind: element.getAttribute('data-pd-kind'),
          screen: element.getAttribute('data-pd-screen'),
          detail: element.getAttribute('data-pd-detail'),
          text: copy.textContent.replace(/\s+/g, ' ').trim(),
        };
      });

    const criteria = records.filter(({ kind }) => selectedKinds.has(kind));
    if (criteria.length === 0) throw new Error('No anchored acceptance criteria for the selected kinds');
    const presentKinds = new Set(records.map(({ kind }) => kind));
    for (const kind of selectedKinds) {
      if (!presentKinds.has(kind)) throw new Error(`Unknown anchored acceptance kind: ${kind}`);
    }
    return {
      spec_path: specPath,
      criteria,
      context: records.filter(({ kind }) => !selectedKinds.has(kind)),
    };
  } finally {
    dom.window.close();
  }
}
