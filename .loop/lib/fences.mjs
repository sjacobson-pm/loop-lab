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
