// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createGitHubPublication } from './github-publication.mjs';

const group = { head: 'loop/42-A', base: 'develop', title: 'Only one running timer', taskIds: ['A'] };
const branch = { tree: 'tree-123', headOid: 'commit-123' };
const receipt = {
  url: 'https://github.com/owner/repo/pull/7',
  headRefName: 'loop/42-A',
  headRefOid: 'commit-123',
  baseRefName: 'develop',
  headRepositoryOwner: { login: 'owner' },
};
const respond = (data) => ({ stdout: JSON.stringify(data) });

describe('authenticated GitHub publication port', () => {
  it('returns null for an unpublished head but surfaces authentication errors', async () => {
    // * ARRANGE
    const invoke = vi.fn(async (_file, args) =>
      respond({ data: { repository: { ref: args.includes('ref=refs/heads/loop/42-A') ? null : undefined } } })
    );
    const github = createGitHubPublication('owner/repo', invoke);
    // * ACT / ASSERT
    expect(await github.readPublishedTree(group)).toBeNull();
    expect(invoke.mock.calls[0][0]).toBe('gh');
    expect(invoke.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['api', 'graphql', '-F', 'ref=refs/heads/loop/42-A'])
    );
    invoke.mockRejectedValueOnce(new Error('GH_AUTH_REQUIRED'));
    await expect(github.readPublishedTree(group)).rejects.toThrow(/GH_AUTH_REQUIRED/);
  });

  it('reads the remote commit and tree OIDs and rejects malformed GraphQL results', async () => {
    // * ARRANGE
    const invoke = vi.fn(async () =>
      respond({ data: { repository: { ref: { target: { oid: 'commit-123', tree: { oid: 'tree-123' } } } } } })
    );
    const github = createGitHubPublication('owner/repo', invoke);
    // * ACT / ASSERT
    expect(await github.readPublishedTree(group)).toEqual(branch);
    invoke.mockResolvedValueOnce(respond({ data: { repository: {} } }));
    await expect(github.readPublishedTree(group)).rejects.toThrow(/remote ref|response/i);
  });

  it('recovers only a PR from the requested repository, branch, and base', async () => {
    // * ARRANGE
    const invoke = vi.fn(async () => respond([{ ...receipt, headRefName: 'other' }, receipt]));
    const github = createGitHubPublication('owner/repo', invoke);
    // * ACT
    const found = await github.findPullRequest(group, branch);
    // * ASSERT
    expect(found).toEqual({ url: receipt.url, headOid: branch.headOid, base: group.base });
    expect(invoke.mock.calls[0][1]).toEqual(
      expect.arrayContaining([
        'pr',
        'list',
        '--repo',
        'owner/repo',
        '--head',
        group.head,
        '--base',
        group.base,
        '--state',
        'open',
      ])
    );
  });

  it('creates a PR using literal argv, then confirms its actual head and base instead of trusting the URL', async () => {
    // * ARRANGE
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ stdout: `${receipt.url}\n` })
      .mockResolvedValueOnce(respond(receipt));
    const github = createGitHubPublication('owner/repo', invoke);
    // * ACT
    const opened = await github.openPullRequest(group, branch, { body: 'Issue: owner/repo#42' });
    // * ASSERT
    expect(opened).toEqual({ url: receipt.url, headOid: branch.headOid, base: group.base });
    expect(invoke.mock.calls[0][1]).toEqual(
      expect.arrayContaining([
        'pr',
        'create',
        '--repo',
        'owner/repo',
        '--head',
        group.head,
        '--base',
        group.base,
        '--title',
        group.title,
        '--body',
        'Issue: owner/repo#42',
      ])
    );
    expect(invoke.mock.calls[0][2]).toMatchObject({ shell: false });
    expect(invoke.mock.calls[0][2]).toMatchObject({ timeout: 60_000 });
    expect(invoke.mock.calls[1][1]).toContain('view');
  });

  it('rejects a confirmed PR whose head commit differs from the verified published branch', async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ stdout: `${receipt.url}\n` })
      .mockResolvedValueOnce(respond({ ...receipt, headRefOid: 'unreviewed-commit' }));
    const github = createGitHubPublication('owner/repo', invoke);
    await expect(github.openPullRequest(group, branch, { body: 'Issue: owner/repo#42' })).rejects.toThrow(
      /commit|head/i
    );
  });

  it('rejects malformed or failed remote-ref responses rather than treating them as unpublished', async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ stdout: null })
      .mockResolvedValueOnce(respond({ errors: [{ message: 'Denied' }] }))
      .mockResolvedValueOnce(respond({ data: { repository: { ref: { target: { oid: 'commit-123' } } } } }));
    const github = createGitHubPublication('owner/repo', invoke);
    await expect(github.readPublishedTree(group)).rejects.toThrow(/response/i);
    await expect(github.readPublishedTree(group)).rejects.toThrow(/remote ref lookup/i);
    await expect(github.readPublishedTree(group)).rejects.toThrow(/commit\/tree identity/i);
  });

  it('rejects incomplete or ambiguous existing-PR queries and authentication failures', async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(respond({ data: 'not-an-array' }))
      .mockResolvedValueOnce(respond(Array(100).fill(receipt)))
      .mockResolvedValueOnce(respond([receipt, receipt]))
      .mockRejectedValueOnce(new Error('GH_AUTH_REQUIRED'));
    const github = createGitHubPublication('owner/repo', invoke);
    await expect(github.findPullRequest(group, branch)).rejects.toThrow(/incomplete/i);
    await expect(github.findPullRequest(group, branch)).rejects.toThrow(/incomplete/i);
    await expect(github.findPullRequest(group, branch)).rejects.toThrow(/ambiguous/i);
    await expect(github.findPullRequest(group, branch)).rejects.toThrow(/GH_AUTH_REQUIRED/);
  });

  it('refuses malformed repository coordinates, missing PR description, or unconfirmed creation URL', async () => {
    expect(() => createGitHubPublication('../repo', vi.fn())).toThrow(/repository/i);
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ stdout: '\n' })
      .mockResolvedValueOnce({ stdout: `${receipt.url}\n` })
      .mockResolvedValueOnce(respond({ ...receipt, baseRefName: 'unreviewed' }));
    const github = createGitHubPublication('owner/repo', invoke);
    await expect(github.openPullRequest(group, branch, { body: '' })).rejects.toThrow(/title and anchored body/i);
    await expect(github.openPullRequest(group, branch, { body: 'Issue: owner/repo#42' })).rejects.toThrow(/PR URL/i);
    await expect(github.openPullRequest(group, branch, { body: 'Issue: owner/repo#42' })).rejects.toThrow(
      /head commit\/base/i
    );
  });

  it('ignores unrelated PRs and fails on a missing PR title before creating anything', async () => {
    const invoke = vi.fn(async () => respond([{ ...receipt, headRepositoryOwner: { login: 'unrelated' } }]));
    const github = createGitHubPublication('owner/repo', invoke);
    expect(await github.findPullRequest(group, branch)).toBeNull();
    await expect(
      github.openPullRequest({ ...group, title: '' }, branch, { body: 'Issue: owner/repo#42' })
    ).rejects.toThrow(/title and anchored body/);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
