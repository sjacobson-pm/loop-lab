import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validRepository } from './plan.mjs';

const execute = promisify(execFile);
const query =
  'query($owner:String!,$name:String!,$ref:String!){ repository(owner:$owner,name:$name){ ref(qualifiedName:$ref){ target{ ... on Commit{ oid tree{oid} } } } } }';
const fields = 'url,headRefOid,baseRefName,headRefName,headRepositoryOwner';

function decode(response) {
  if (typeof response?.stdout !== 'string') throw new Error('Missing GitHub response.');
  return JSON.parse(response.stdout);
}

/** GitHub CLI is an authenticated transport only; the harness owns every publication decision. */
export function createGitHubPublication(repository, invoke = execute) {
  if (!validRepository(repository)) throw new Error('Invalid repository for publication.');
  const [owner, name] = repository.split('/');
  const call = (args) =>
    invoke('gh', args, { shell: false, windowsHide: true, timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
  const matches = (value, group) =>
    value?.headRefName === group.head && value.baseRefName === group.base && value.headRepositoryOwner?.login === owner;
  const receipt = (value) => ({ url: value.url, headOid: value.headRefOid, base: value.baseRefName });
  return {
    readPublishedTree: async (group) => {
      const result = decode(
        await call([
          'api',
          'graphql',
          '-f',
          `query=${query}`,
          '-F',
          `owner=${owner}`,
          '-F',
          `name=${name}`,
          '-F',
          `ref=refs/heads/${group.head}`,
        ])
      );
      if (result.errors?.length) throw new Error(`GitHub remote ref lookup failed: ${JSON.stringify(result.errors)}`);
      if (!result.data?.repository || !Object.hasOwn(result.data.repository, 'ref'))
        throw new Error('Invalid remote ref response.');
      const target = result.data.repository.ref?.target;
      if (result.data.repository.ref === null) return null;
      if (typeof target?.oid !== 'string' || typeof target.tree?.oid !== 'string')
        throw new Error('Invalid remote ref commit/tree identity.');
      return { tree: target.tree.oid, headOid: target.oid };
    },
    findPullRequest: async (group) => {
      const values = decode(
        await call([
          'pr',
          'list',
          '--repo',
          repository,
          '--head',
          group.head,
          '--base',
          group.base,
          '--state',
          'open',
          '--limit',
          '100',
          '--json',
          fields,
        ])
      );
      if (!Array.isArray(values) || values.length >= 100) throw new Error('Incomplete GitHub PR listing.');
      const found = values.filter((value) => matches(value, group));
      if (found.length > 1) throw new Error('Ambiguous existing PR head/base.');
      return found.length ? receipt(found[0]) : null;
    },
    openPullRequest: async (group, branch, { body }) => {
      if (typeof body !== 'string' || !body.trim() || typeof group.title !== 'string' || !group.title.trim())
        throw new Error('PR requires a title and anchored body.');
      const { stdout } = await call([
        'pr',
        'create',
        '--repo',
        repository,
        '--head',
        group.head,
        '--base',
        group.base,
        '--title',
        group.title,
        '--body',
        body,
      ]);
      const url = stdout.trim();
      if (!url) throw new Error('GitHub did not return a PR URL.');
      const value = decode(await call(['pr', 'view', url, '--repo', repository, '--json', fields]));
      if (!matches(value, group) || value.url !== url || value.headRefOid !== branch.headOid)
        throw new Error('Created PR head commit/base does not match the reviewed branch.');
      return receipt(value);
    },
  };
}
