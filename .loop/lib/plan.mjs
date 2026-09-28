import { computeWaves } from './waves.mjs';

const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;

export function validRepository(value) {
  return (
    typeof value === 'string' &&
    /^[\w.-]+\/[\w.-]+$/.test(value) &&
    value.split('/').every((part) => part !== '.' && part !== '..')
  );
}

/** Validate portable literal declarations; permission-pattern metacharacters are unsupported. */
export function validateRelativePath(path) {
  if (
    !nonempty(path) ||
    path !== path.trim() ||
    /[\\:*?"<>|()[\]]/.test(path) ||
    [...path].some((character) => character.codePointAt(0) < 32)
  ) {
    throw new Error(`Invalid declared path: ${path}`);
  }
  for (const part of path.split('/')) {
    if (
      !part ||
      part === '.' ||
      part === '..' ||
      part.toLowerCase() === '.git' ||
      /[. ]$/.test(part) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
    ) {
      throw new Error(`Invalid declared path: ${path}`);
    }
  }
  return path;
}

function fields(value, required, label, optional = []) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some((key) => !required.includes(key) && !optional.includes(key))
  ) {
    throw new Error(`Invalid ${label} fields`);
  }
}

/** Returns a validated independent plan with machine-computed waves. */
export function validatePlan(plan, index, targetIds) {
  fields(plan, ['issue', 'target', 'tasks'], 'plan', ['waves']);
  if (!Number.isSafeInteger(plan.issue) || plan.issue <= 0) throw new Error('Invalid issue number');
  if (!targetIds.includes(plan.target)) throw new Error(`Unsupported target: ${plan.target}`);
  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) throw new Error('Plan requires tasks');
  const anchors = new Set(index.criteria.map(({ anchor }) => anchor));
  const paths = new Map();
  for (const task of plan.tasks) {
    fields(task, ['id', 'summary', 'criteria', 'depends_on', 'files_modified', 'public_surface'], 'task');
    if (!nonempty(task.summary)) throw new Error('Task requires a summary');
    if (
      !Array.isArray(task.criteria) ||
      task.criteria.length === 0 ||
      new Set(task.criteria).size !== task.criteria.length ||
      task.criteria.some((anchor) => !anchors.has(anchor))
    ) {
      throw new Error(`Task ${task.id}: invalid criterion anchors`);
    }
    if (!Array.isArray(task.files_modified)) throw new Error('Invalid files_modified');
    if (new Set(task.files_modified).size !== task.files_modified.length) throw new Error('Duplicate file path');
    for (const file of task.files_modified) {
      validateRelativePath(file);
      const key = file.toLowerCase();
      if (paths.has(key) && paths.get(key) !== file) throw new Error(`Conflicting path aliases: ${file}`);
      paths.set(key, file);
    }
    if (!Array.isArray(task.public_surface)) throw new Error('Invalid public_surface');
    for (const surface of task.public_surface) {
      fields(
        surface,
        ['path', 'language', 'namespace', 'type', 'member', 'return_type', 'parameters'],
        'public surface'
      );
      if (!task.files_modified.includes(surface.path)) throw new Error('Public surface path is not owned by task');
      if (
        ['language', 'type', 'member', 'return_type'].some((key) => !nonempty(surface[key])) ||
        (surface.namespace !== null && !nonempty(surface.namespace))
      )
        throw new Error('Invalid public surface');
      if (!Array.isArray(surface.parameters)) throw new Error('Invalid public surface parameters');
      const names = new Set();
      for (const parameter of surface.parameters) {
        fields(parameter, ['name', 'type'], 'parameter');
        if (!nonempty(parameter.name) || !nonempty(parameter.type) || names.has(parameter.name)) {
          throw new Error('Invalid or duplicate parameter');
        }
        names.add(parameter.name);
      }
    }
  }
  return { ...structuredClone(plan), waves: computeWaves(plan.tasks) };
}

/** Weakly connected dependency components, in original task order; no agent judgment. */
export function groupPullRequests(tasks) {
  computeWaves(tasks);
  const neighbors = new Map(tasks.map(({ id }) => [id, []]));
  for (const task of tasks) {
    for (const dependency of task.depends_on) {
      neighbors.get(task.id).push(dependency);
      neighbors.get(dependency).push(task.id);
    }
  }
  const visited = new Set();
  const groups = [];
  for (const task of tasks) {
    if (visited.has(task.id)) continue;
    const component = new Set([task.id]);
    const queue = [task.id];
    visited.add(task.id);
    for (let head = 0; head < queue.length; head += 1) {
      for (const next of neighbors.get(queue[head])) {
        if (visited.has(next)) continue;
        visited.add(next);
        component.add(next);
        queue.push(next);
      }
    }
    groups.push(tasks.filter(({ id }) => component.has(id)).map(({ id }) => id));
  }
  return groups;
}
