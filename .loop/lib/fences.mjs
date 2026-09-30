import path from 'node:path';

const prefixProtected = (file) => /^(\.loop\/|\.github\/|spec\/|docs\/design\/)/.test(file);
const basenameProtected = (file, declaredFiles) =>
  (!file.includes('/') && !declaredFiles.includes(file)) ||
  /(^|\/)(package(-lock)?\.json|[^/]*config\.[cm]?[jt]s)$/.test(file);

export const protectedTaskPath = (file, declaredFiles) =>
  prefixProtected(file) || basenameProtected(file, declaredFiles);

/** Collapse exact protected paths only where a relative basename rule is broader. */
export function collapseTaskDenyPaths({ root, protectedFiles, deniedPaths, declaredFiles, contextPath, specPath }) {
  const basenames = new Set(
    protectedFiles.filter((file) => basenameProtected(file, declaredFiles)).map((file) => path.posix.basename(file))
  );
  for (const file of declaredFiles) {
    const basename = path.posix.basename(file);
    if (basenames.has(basename))
      throw new Error(
        `Protected basename rule write(${basename}) blocks declared file ${file}; revise task ownership.`
      );
  }
  const collapsed = new Set(
    protectedFiles
      .filter(
        (file) =>
          basenameProtected(file, declaredFiles) && !prefixProtected(file) && file !== contextPath && file !== specPath
      )
      .map((file) => path.resolve(root, file))
  );
  return [...new Set([...deniedPaths.filter((file) => !collapsed.has(file)), ...basenames])];
}

/** Classify with one externally supplied Git-pathspec matcher. */
export function classifyPaths(paths, testPathspecs, match) {
  const result = { test: [], source: [] };
  for (const file of paths) result[match(file, testPathspecs) ? 'test' : 'source'].push(file);
  return result;
}

/** Pure acceptance audit; changes include both endpoints of every rename. */
export function auditWrites({ leg, changes, declaredFiles, testFiles, protectedFiles }) {
  if (!['decompose', 'test', 'implement', 'review'].includes(leg)) throw new Error(`Unknown leg: ${leg}`);
  if (!Array.isArray(changes)) return [{ code: 'incomplete_evidence', path: null }];
  const paths = new Set(changes.flatMap(({ path, oldPath }) => (oldPath ? [oldPath, path] : [path])));
  const violations = [];
  for (const path of paths) {
    let code;
    if (leg === 'decompose' && declaredFiles.length === 1 && declaredFiles.includes(path)) continue;
    if (protectedFiles.includes(path)) code = 'protected';
    else if (leg === 'review') code = 'review_write';
    else if (!declaredFiles.includes(path)) code = 'undeclared';
    else if (leg === 'test' && !testFiles.includes(path)) code = 'source_fence';
    else if (leg === 'implement' && testFiles.includes(path)) code = 'test_fence';
    if (code) violations.push({ code, path });
  }
  return violations;
}
