import path from 'node:path';
import { validateRelativePath } from './plan.mjs';

const domains = Object.freeze({
  missing_test: 'test',
  unsupported_assertion: 'test',
  wrong_behavior: 'implement',
  standards: 'implement',
  undeclared_file: 'implement',
  contradictory_anchor: 'decompose',
  unobservable_anchor: 'decompose',
  ownership_conflict: 'decompose',
});
const categories = ['organization', 'local', 'repository', 'guidelines'];
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;

/** The model reports faults; only this contract can turn them into routing input. */
export function validateFindings(findings, task, index) {
  if (!Array.isArray(findings)) throw new Error('Review findings must be an array.');
  if ((task || index) && (!Array.isArray(task?.criteria) || !Array.isArray(index?.criteria)))
    throw new Error('Invalid review anchor context.');
  const allowed =
    task && new Set(task.criteria.filter((anchor) => index.criteria.some((entry) => entry.anchor === anchor)));
  return Object.freeze(
    findings.map((finding) => {
      if (
        !finding ||
        typeof finding !== 'object' ||
        Array.isArray(finding) ||
        Object.keys(finding).sort().join(',') !== 'code,criteria,fault_domain,files,message'
      )
        throw new Error('Invalid review finding fields.');
      if (!Object.hasOwn(domains, finding.code)) throw new Error('Unknown review finding code.');
      if (finding.fault_domain !== domains[finding.code]) throw new Error('Invalid review fault domain.');
      if (
        !Array.isArray(finding.criteria) ||
        !finding.criteria.length ||
        new Set(finding.criteria).size !== finding.criteria.length
      )
        throw new Error('Invalid review finding criteria.');
      if (
        finding.criteria.some(
          (anchor) => !nonempty(anchor) || !anchor.includes('#') || (allowed && !allowed.has(anchor))
        )
      )
        throw new Error('Unknown or invalid review anchor.');
      if (!Array.isArray(finding.files) || new Set(finding.files).size !== finding.files.length)
        throw new Error('Invalid review finding path list.');
      for (const file of finding.files) validateRelativePath(file);
      if (!nonempty(finding.message)) throw new Error('Invalid review finding message.');
      return Object.freeze({
        ...finding,
        criteria: Object.freeze([...finding.criteria]),
        files: Object.freeze([...finding.files]),
      });
    })
  );
}

/** Deterministic priority: approved task ownership can only change at Gate 1. */
export function routeFindings(findings) {
  const checked = validateFindings(findings);
  for (const domain of ['decompose', 'test', 'implement'])
    if (checked.some((finding) => finding.fault_domain === domain)) return domain;
  return 'done';
}

/** Missing optional standards are recorded; required ones explicitly block review. */
export function resolveStandards({ stack, configured, available }) {
  if (!['react-vitest', 'dotnet-xunit'].includes(stack)) throw new Error('Unsupported review stack.');
  for (const source of [configured, available]) {
    if (
      !source ||
      categories.some(
        (kind) =>
          !Array.isArray(source[kind]) ||
          source[kind].some((id) => !nonempty(id)) ||
          new Set(source[kind]).size !== source[kind].length
      )
    )
      throw new Error('Invalid review standards catalog.');
  }
  if (
    !Array.isArray(configured.required) ||
    configured.required.some((id) => !nonempty(id)) ||
    new Set(configured.required).size !== configured.required.length
  )
    throw new Error('Invalid required review standards.');
  const configuredIds = new Set(categories.flatMap((kind) => configured[kind].map((id) => `${kind}:${id}`)));
  if (configured.required.some((id) => !configuredIds.has(id)))
    throw new Error('Required review standard is not configured.');
  const records = [];
  const references = [];
  const missingRequired = [];
  for (const kind of categories) {
    for (const id of configured[kind]) {
      if (kind === 'repository') validateRelativePath(id);
      const key = `${kind}:${id}`;
      const incompatible =
        stack !== 'dotnet-xunit' && (id.startsWith('pa-review-dotnet') || id === 'github-process-docs');
      const status = incompatible ? 'incompatible' : available[kind].includes(id) ? 'resolved' : 'missing';
      records.push({ kind, id, status });
      if (status === 'resolved') references.push({ kind, id });
      else if (configured.required.includes(key)) missingRequired.push(key);
    }
  }
  return { references, records, missingRequired };
}

/** One independent read-only judgment, validated before any harness route is selected. */
export async function reviewTask({ task, index, evidence, delta, standards, worktree }, ports) {
  if (!standards || !Array.isArray(standards.references) || !Array.isArray(standards.missingRequired))
    throw new Error('Missing standards resolution.');
  if (standards.missingRequired.length)
    throw new Error(`Missing required review standards: ${standards.missingRequired.join(', ')}`);
  const result = await ports.review({ task, index, evidence, delta, standards });
  if (!Array.isArray(result?.violations) || result.violations.length) {
    const diagnostics = result?.outcome?.diagnostics;
    throw new Error(
      `Reviewer write audit rejected: ${JSON.stringify(result?.violations)}` +
        (Array.isArray(diagnostics) && diagnostics.length ? `; transport: ${JSON.stringify(diagnostics)}` : '')
    );
  }
  if (result.outcome?.status !== 'completed') throw new Error('Reviewer transport did not complete.');
  if (
    !Array.isArray(result.outcome.reportedWrites) ||
    result.outcome.reportedWrites.length ||
    !Array.isArray(result.outcome.toolRequests) ||
    result.outcome.toolRequests.some((request) => !request || !['view', 'glob', 'grep'].includes(request.name))
  )
    throw new Error('Reviewer attempted to write or returned incomplete read-only evidence.');
  const repository = standards.references.filter(({ kind }) => kind === 'repository');
  if (typeof worktree !== 'string' || !path.isAbsolute(worktree))
    throw new Error('Review worktree is required to verify repository standard and spec reads.');
  validateRelativePath(index.spec_path);
  const identity = (file) => {
    const absolute = path.resolve(worktree, file);
    return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
  };
  const reads = new Set(
    result.outcome.toolRequests
      .filter((request) => request.name === 'view' && typeof request.arguments?.path === 'string')
      .map((request) => identity(request.arguments.path))
  );
  const missing = repository.filter(({ id }) => !reads.has(identity(id)));
  if (missing.length)
    throw new Error(
      `Incomplete review evidence: resolved repository standards not opened: ${missing.map(({ id }) => id).join(', ')}.`
    );
  if (!reads.has(identity(index.spec_path)))
    throw new Error(`Incomplete review evidence: cited spec not opened: ${index.spec_path}.`);
  if (!Array.isArray(result.outcome.messages) || result.outcome.messages.length === 0)
    throw new Error('Reviewer must return a final JSON findings array.');
  let findings;
  try {
    findings = JSON.parse(result.outcome.messages.at(-1));
  } catch (error) {
    throw new Error(`Reviewer returned invalid JSON: ${error.message}`);
  }
  return validateFindings(findings, task, index);
}
