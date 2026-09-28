// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { prepareAttended } from './attended.mjs';

const plan = { issue: 42, target: 'react-vitest', tasks: [], waves: [] };
vi.mock('./lib/orchestrator.mjs', () => ({
  prepareLoop: async () => ({ status: 'planned', plan }),
  reenterGate1: async () => {
    throw new Error('Unexpected Gate 1 re-entry.');
  },
}));

it('binds the approved plan to the original spec/config bytes and the exact plan artifact', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loop-hashes-'));
  try {
    execFileSync('git', ['init', '--quiet', root]);
    await mkdir(path.join(root, '.loop/plans'), { recursive: true });
    await mkdir(path.join(root, 'spec'));
    await writeFile(
      path.join(root, '.loop/targets.json'),
      JSON.stringify({
        targets: { 'react-vitest': { exercised: true, publication_base: 'main', test_pathspecs: [] } },
      })
    );
    await writeFile(path.join(root, 'spec/x.html'), '<p id="rule-a">One timer</p>');
    await writeFile(path.join(root, '.loop/plans/42.plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
    const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
    const expected = {
      spec: digest(await readFile(path.join(root, 'spec/x.html'))),
      target: digest(await readFile(path.join(root, '.loop/targets.json'))),
      plan: digest(await readFile(path.join(root, '.loop/plans/42.plan.json'))),
    };
    const result = await prepareAttended({
      root,
      issue: { number: 42 },
      specPath: 'spec/x.html',
      target: 'react-vitest',
      acceptanceKinds: ['Rule'],
    });
    expect(result.hashes).toEqual(expected);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
