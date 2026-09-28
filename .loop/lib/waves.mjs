/**
 * @typedef {object} WaveTask
 * @property {string} id
 * @property {string[]} depends_on
 * @property {string[]} files_modified Literal paths, compared without normalization.
 */

/**
 * Kahn dependency levels, then stable greedy first-fit within each level.
 * Empty file declarations overlap nothing; this cannot detect undeclared writes.
 * @param {WaveTask[]} tasks
 * @returns {string[][]}
 */
export function computeWaves(tasks) {
  if (!Array.isArray(tasks)) throw new TypeError('tasks must be an array');
  const byId = new Map();
  for (const task of tasks) {
    if (!task || typeof task.id !== 'string' || !task.id.trim()) {
      throw new TypeError('Each task must have a nonempty string id');
    }
    if (byId.has(task.id)) throw new Error(`Duplicate task id: ${task.id}`);
    for (const field of ['depends_on', 'files_modified']) {
      if (!Array.isArray(task[field])) throw new TypeError(`Task ${task.id}: ${field} must be an array`);
      for (const value of task[field]) {
        if (typeof value !== 'string' || !value.trim()) {
          throw new TypeError(`Task ${task.id}: ${field} must contain nonempty strings`);
        }
      }
    }
    if (new Set(task.depends_on).size !== task.depends_on.length) {
      throw new Error(`Duplicate dependency in task ${task.id}`);
    }
    byId.set(task.id, task);
  }

  const remaining = new Map(tasks.map(({ id, depends_on }) => [id, depends_on.length]));
  const dependents = new Map(tasks.map(({ id }) => [id, []]));
  const depths = new Map(tasks.map(({ id }) => [id, 0]));
  for (const task of tasks) {
    for (const dependency of task.depends_on) {
      if (dependency === task.id) throw new Error(`Self dependency: ${task.id}`);
      if (!byId.has(dependency)) throw new Error(`Task ${task.id}: unknown dependency ${dependency}`);
      dependents.get(dependency).push(task.id);
    }
  }

  const queue = tasks.filter(({ id }) => remaining.get(id) === 0).map(({ id }) => id);
  for (let head = 0; head < queue.length; head += 1) {
    const id = queue[head];
    for (const dependent of dependents.get(id)) {
      depths.set(dependent, Math.max(depths.get(dependent), depths.get(id) + 1));
      remaining.set(dependent, remaining.get(dependent) - 1);
      if (remaining.get(dependent) === 0) queue.push(dependent);
    }
  }
  if (queue.length !== tasks.length) {
    const blocked = tasks.filter(({ id }) => remaining.get(id) > 0).map(({ id }) => id);
    throw new Error(`Dependency cycle blocks tasks: ${blocked.join(', ')}`);
  }

  // Kahn release order can differ from input order within the same depth.
  const levels = [];
  for (const task of tasks) {
    (levels[depths.get(task.id)] ??= []).push(task);
  }
  return levels.flatMap((level) => {
    const stages = [];
    for (const task of level) {
      let stage = stages.find(({ files }) => !task.files_modified.some((file) => files.has(file)));
      if (!stage) {
        stage = { ids: [], files: new Set() };
        stages.push(stage);
      }
      stage.ids.push(task.id);
      for (const file of task.files_modified) stage.files.add(file);
    }
    return stages.map(({ ids }) => ids);
  });
}
