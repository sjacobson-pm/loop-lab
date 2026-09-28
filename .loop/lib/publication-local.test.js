// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { assertCleanPublicationBaseline, createLocalPublication, publicationGroups } from './publication-local.mjs';

const roots = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loop-publish-'));
  roots.push(root);
  execFileSync('git', ['init', '--quiet', root]);
  const empty = execFileSync('git', ['-C', root, 'hash-object', '-t', 'tree', '-w', '--stdin'], { input: '' })
    .toString()
    .trim();
  const object = `tree ${empty}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nFixture\n`;
  const oid = execFileSync('git', ['-C', root, 'hash-object', '-t', 'commit', '-w', '--stdin'], { input: object })
    .toString()
    .trim();
  execFileSync('git', ['-C', root, 'update-ref', 'HEAD', oid]);
  await mkdir(path.join(root, '.loop/plans'), { recursive: true });
  await mkdir(path.join(root, 'spec'));
  await writeFile(path.join(root, '.loop/targets.json'), '{"targets":{"react-vitest":{"publication_base":"main"}}}');
  await writeFile(path.join(root, 'spec/x.html'), '<p id="rule-a">One timer</p>');
  await writeFile(path.join(root, '.loop/plans/42.plan.json'), '{"tasks":[]}');
  await writeFile(path.join(root, 'component.js'), 'reviewed');
  execFileSync('git', ['-C', root, 'add', '-A']);
  return root;
}
const plan = {
  tasks: [
    { id: 'A', depends_on: [], files_modified: ['A.js'] },
    { id: 'B', depends_on: [], files_modified: ['B.js'] },
  ],
};

it('creates one deterministic, trusted PR head per dependency component using the configured base', () => {
  expect(publicationGroups(plan, { number: 42, title: 'Title' }, 'main')).toEqual([
    { taskIds: ['A'], head: 'loop/42-1', base: 'main', title: 'Title' },
    { taskIds: ['B'], head: 'loop/42-2', base: 'main', title: 'Title' },
  ]);
});

it('rejects independent PR groups that declare ownership of the same file', () => {
  const overlapping = {
    tasks: [
      { id: 'A', depends_on: [], files_modified: ['shared.js'] },
      { id: 'B', depends_on: [], files_modified: ['shared.js'] },
    ],
  };
  expect(() => publicationGroups(overlapping, { number: 42, title: 'Title' }, 'main')).toThrow(/overlap/i);
});

it.each([
  [{ number: 0, title: 'Title' }, 'main'],
  [{ number: 42, title: '' }, 'main'],
  [{ number: 42, title: 'Title' }, '../main'],
])('rejects unsafe issue or base coordinates before constructing PR heads', (issue, base) => {
  expect(() => publicationGroups(plan, issue, base)).toThrow(/Invalid issue or configured publication base/);
});

it('rejects an invalid issue number before reading any target files', () => {
  expect(() =>
    createLocalPublication({
      root: 'fixture-root',
      specPath: 'spec/x.html',
      issue: { number: 0 },
      plan,
      waves: [],
      execution: { stageGroup: vi.fn() },
    })
  ).toThrow(/issue number/);
});

it('rejects missing reviewed deltas and unrecognized group tasks before staging', async () => {
  const stageGroup = vi.fn();
  const make = (waves) =>
    createLocalPublication({
      root: 'fixture-root',
      specPath: 'spec/x.html',
      issue: { number: 42 },
      plan,
      waves,
      execution: { stageGroup },
    });
  await expect(
    make([{ tasks: [{ taskId: 'A', status: 'parked', delta: { bytes: Buffer.alloc(0) } }] }]).prepareGroup({
      head: 'loop/42-1',
      taskIds: ['A'],
    })
  ).rejects.toThrow(/No reviewed delta/);
  await expect(make([]).prepareGroup({ head: 'loop/42-1', taskIds: ['A'] })).rejects.toThrow(/unknown task/);
  expect(stageGroup).not.toHaveBeenCalled();
});

it('rejects dirty reviewed worktrees even when the index still points to the approved tree', async () => {
  const root = await fixture();
  const ports = createLocalPublication({
    root,
    specPath: 'spec/x.html',
    issue: { number: 42 },
    plan,
    waves: [],
    execution: { stageGroup: vi.fn() },
  });
  await writeFile(path.join(root, 'component.js'), 'changed outside approval');
  await expect(ports.readStagedTree({ path: root })).rejects.toThrow(/unstaged or untracked/);
  await writeFile(path.join(root, 'component.js'), 'reviewed');
  await writeFile(path.join(root, 'untracked.js'), 'not reviewed');
  await expect(ports.readStagedTree({ path: root })).rejects.toThrow(/unstaged or untracked/);
});

it('rejects an uncommitted baseline before publication and accepts only a clean checkout', async () => {
  const root = await fixture();
  await expect(assertCleanPublicationBaseline(root)).rejects.toThrow(/clean|uncommitted/i);
  const tree = execFileSync('git', ['-C', root, 'write-tree'], { encoding: 'utf8' }).trim();
  const raw = `tree ${tree}\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nFixture\n`;
  const commit = execFileSync('git', ['-C', root, 'hash-object', '-t', 'commit', '-w', '--stdin'], {
    input: raw,
    encoding: 'utf8',
  }).trim();
  execFileSync('git', ['-C', root, 'update-ref', 'HEAD', commit]);
  await expect(assertCleanPublicationBaseline(root)).resolves.toBeUndefined();
  await writeFile(path.join(root, 'component.js'), 'other');
  await expect(assertCleanPublicationBaseline(root)).rejects.toThrow(/clean|uncommitted/i);
});

it('stages only audited deltas from the selected group and detects spec/config/plan edits before Gate 2', async () => {
  const root = await fixture();
  const a = { taskId: 'A', status: 'ready', delta: { changes: [{ path: 'A.js' }], bytes: Buffer.from('a') } };
  const b = { taskId: 'B', status: 'ready', delta: { changes: [{ path: 'B.js' }], bytes: Buffer.from('b') } };
  const execution = { stageGroup: vi.fn(async ({ head }) => ({ head, tree: 'tree', suite: {}, path: root })) };
  const ports = createLocalPublication({
    root,
    specPath: 'spec/x.html',
    issue: { number: 42 },
    plan,
    waves: [{ tasks: [a, b] }],
    execution,
    gate2: async () => ({ decision: 'stop' }),
  });

  const first = await ports.readInputs();
  const group = { taskIds: ['B'], head: 'loop/42-2', base: 'main' };
  expect(await ports.prepareGroup(group)).toMatchObject({ ...group, tree: 'tree' });
  expect(execution.stageGroup).toHaveBeenCalledWith({
    head: group.head,
    tasks: [{ task: plan.tasks[1], delta: b.delta }],
  });
  await writeFile(path.join(root, 'spec/x.html'), 'changed');
  expect((await ports.readInputs()).spec).not.toBe(first.spec);
  await writeFile(path.join(root, '.loop/targets.json'), '{"targets":{"react-vitest":{"publication_base":"other"}}}');
  expect((await ports.readInputs()).target).not.toBe(first.target);
  await writeFile(path.join(root, '.loop/plans/42.plan.json'), '{"tasks":[{"id":"A"}]}');
  expect((await ports.readInputs()).plan).not.toBe(first.plan);
});

it('consumes the reviewed wave outcomes produced after the publication adapter was created', async () => {
  const root = await fixture();
  const waves = [];
  const execution = { stageGroup: vi.fn(async ({ head }) => ({ head, tree: 'tree', suite: {}, path: root })) };
  const ports = createLocalPublication({
    root,
    specPath: 'spec/x.html',
    issue: { number: 42 },
    plan,
    waves,
    execution,
    gate2: async () => ({ decision: 'stop' }),
  });
  const delta = { changes: [{ path: 'A.js' }], bytes: Buffer.from('a') };
  waves.push({ tasks: [{ taskId: 'A', status: 'ready', delta }] });
  await ports.prepareGroup({ taskIds: ['A'], head: 'loop/42-1', base: 'main' });
  expect(execution.stageGroup).toHaveBeenCalledWith({ head: 'loop/42-1', tasks: [{ task: plan.tasks[0], delta }] });
});

it('replays a dependent group in approved wave order rather than task declaration order', async () => {
  const root = await fixture();
  const dependencyPlan = {
    tasks: [
      { id: 'B', depends_on: ['A'], files_modified: ['shared.js'] },
      { id: 'A', depends_on: [], files_modified: ['shared.js'] },
    ],
  };
  const waves = [
    { tasks: [{ taskId: 'A', status: 'ready', delta: { changes: [], bytes: Buffer.alloc(0) } }] },
    { tasks: [{ taskId: 'B', status: 'ready', delta: { changes: [], bytes: Buffer.alloc(0) } }] },
  ];
  const execution = { stageGroup: vi.fn(async () => ({ tree: 'tree', suite: {}, path: root })) };
  const ports = createLocalPublication({
    root,
    specPath: 'spec/x.html',
    issue: { number: 42 },
    plan: dependencyPlan,
    waves,
    execution,
    gate2: async () => ({ decision: 'stop' }),
  });
  await ports.prepareGroup({ taskIds: ['B', 'A'], head: 'loop/42-1', base: 'main' });
  expect(execution.stageGroup.mock.calls[0][0].tasks.map(({ task }) => task.id)).toEqual(['A', 'B']);
});

it('reads the staged tree and local HEAD identity without creating a commit', async () => {
  const root = await fixture();
  const execution = { stageGroup: vi.fn() };
  const ports = createLocalPublication({
    root,
    specPath: 'spec/x.html',
    issue: { number: 42 },
    plan,
    waves: [],
    execution,
    gate2: async () => ({ decision: 'stop' }),
  });
  const staged = execFileSync('git', ['-C', root, 'write-tree'], { encoding: 'utf8' }).trim();
  expect(await ports.readStagedTree({ path: root })).toBe(staged);
  const committed = await ports.readCommittedTree({ path: root });
  expect(committed).toEqual({
    tree: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
    headOid: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    head: execFileSync('git', ['-C', root, 'branch', '--show-current'], { encoding: 'utf8' }).trim(),
  });
  expect(await readFile(path.join(root, 'component.js'), 'utf8')).toBe('reviewed');
});
