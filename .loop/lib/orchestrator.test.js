// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { prepareLoop, reenterGate1 } from './orchestrator.mjs';

const html = '<p id="rule-a" data-pd-kind="Rule">Only one timer runs.</p>';
const task = {
  id: 'A',
  summary: 'Enforce one-running timer',
  criteria: ['spec/x.html#rule-a'],
  depends_on: [],
  files_modified: ['src/a.js'],
  public_surface: [],
};
const issue = {
  number: 42,
  title: 'Prevent parallel timers',
  body: 'Starting another timer should pause the first.',
  repository: 'owner/repo',
};
const targetConfig = {
  exercised: true,
  test_pathspecs: ['*.test.js'],
  test: ['npx', 'vitest', 'run'],
  results_format: 'vitest-json',
};
function setup(overrides = {}) {
  const artifacts = new Map();
  const outcome = {
    status: 'completed',
    reportedWrites: [],
    usage: { counters: [{ name: 'premiumRequests', unit: 'premium-requests', value: 2 }] },
  };
  const ports = {
    writeArtifact: async (file, value) => artifacts.set(file, structuredClone(value)),
    readPlan: async () => structuredClone(artifacts.get('.loop/plans/42.plan.json')),
    readContext: async () => ({ html, targetConfig, baselineDigest: 'same-tree' }),
    decompose: vi.fn(async () => ({
      plan: { issue: 42, target: 'react-vitest', tasks: [task], waves: [['wrong']] },
      outcome,
      violations: [],
    })),
    gate1: vi.fn(async () => ({ decision: 'approve', feedback: '' })),
    runAgent: vi.fn(),
    ...overrides,
  };
  return {
    ports,
    artifacts,
    input: { issue, html, specPath: 'spec/x.html', target: 'react-vitest', acceptanceKinds: ['Rule'], targetConfig },
  };
}
describe('prepareLoop', () => {
  it('extracts real criteria from prose-only issue input, computes waves/groups and stops after approval', async () => {
    // * ARRANGE
    const { input, ports, artifacts } = setup();
    // * ACT
    const result = await prepareLoop(input, ports);
    // * ASSERT
    expect(result).toMatchObject({ status: 'planned', plan: { waves: [['A']] }, prGroups: [['A']] });
    expect(artifacts.get('.loop/criteria/42.json').criteria[0].text).toBe('Only one timer runs.');
    expect(ports.gate1).toHaveBeenCalledWith(
      expect.objectContaining({
        prGroups: [['A']],
        usage: [{ name: 'premiumRequests', unit: 'premium-requests', value: 2 }],
        approvalDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      })
    );
    expect(ports.runAgent).not.toHaveBeenCalled();
  });
  it('bounds repeated human-requested decomposition without introducing another gate or charging task siblings', async () => {
    // * ARRANGE
    const { input, ports } = setup();
    ports.gate1.mockResolvedValue({ decision: 'revise', feedback: 'Please revise the plan' });
    // * ACT / ASSERT
    await expect(prepareLoop({ ...input, maxPreparationExecutions: 2 }, ports)).rejects.toThrow(
      /preparation.*(budget|limit)/i
    );
    expect(ports.decompose).toHaveBeenCalledTimes(2);
    expect(ports.gate1).toHaveBeenCalledTimes(2);
    expect(ports.runAgent).not.toHaveBeenCalled();
  });
  it('uses the target preparation cap and rejects invalid budgets before decomposition', async () => {
    // * ARRANGE
    const configured = { ...targetConfig, budgets: { cycle: 3, total: 1 } };
    const { input, ports } = setup({
      readContext: async () => ({ html, targetConfig: configured, baselineDigest: 'same-tree' }),
    });
    ports.gate1.mockResolvedValue({ decision: 'revise', feedback: 'Again' });
    // * ACT / ASSERT
    await expect(prepareLoop({ ...input, targetConfig: configured }, ports)).rejects.toThrow(
      /preparation agent budget exhausted/i
    );
    expect(ports.decompose).toHaveBeenCalledTimes(1);
    expect(ports.gate1).toHaveBeenCalledTimes(1);
    await expect(prepareLoop({ ...input, targetConfig: { ...targetConfig, budgets: null } }, ports)).rejects.toThrow(
      /budget/i
    );
    expect(ports.decompose).toHaveBeenCalledTimes(1);
  });

  describe('post-review Gate 1 re-entry', () => {
    const finding = {
      code: 'ownership_conflict',
      fault_domain: 'decompose',
      criteria: ['spec/x.html#rule-a'],
      files: ['src/other.js'],
      message: 'Another task must own src/other.js',
    };
    it('presents drained faults, invalidates prior approval, then revalidates a human-requested replan', async () => {
      // * ARRANGE
      const { input, ports } = setup();
      const prior = await prepareLoop(input, ports);
      const wave = {
        status: 'gate1',
        findings: [finding],
        tasks: [{ taskId: 'A', status: 'gate1', findings: [finding], delta: null }],
      };
      ports.gate1.mockClear();
      ports.decompose.mockClear();
      ports.gate1.mockResolvedValueOnce({ decision: 'revise', feedback: 'Give this file to A' });
      ports.decompose.mockResolvedValue({
        plan: {
          issue: 42,
          target: 'react-vitest',
          tasks: [{ ...task, files_modified: ['src/a.js', 'src/other.js'] }],
        },
        outcome: { status: 'completed', messages: [], usage: { counters: [] } },
        violations: [],
      });
      // * ACT
      const result = await reenterGate1({ ...input, approved: prior, wave }, ports);
      // * ASSERT
      expect(ports.gate1).toHaveBeenCalledTimes(2);
      expect(ports.gate1.mock.calls[0][0]).toMatchObject({
        findings: [finding],
        invalidatedApprovalDigest: prior.approvalDigest,
        affectedTaskIds: ['A'],
        plan: prior.plan,
      });
      expect(ports.decompose.mock.calls[0][0].feedback).toContain('Give this file to A');
      expect(result.status).toBe('planned');
      expect(result.plan.tasks[0].files_modified).toContain('src/other.js');
      expect(result.approvalDigest).not.toBe(prior.approvalDigest);
    });
    it('rejects silently reapproving an unresolved plan and refuses stale or invalid re-entry evidence', async () => {
      // * ARRANGE
      const { input, ports } = setup();
      const prior = await prepareLoop(input, ports);
      const wave = {
        status: 'gate1',
        findings: [finding],
        tasks: [{ taskId: 'A', status: 'gate1', findings: [finding], delta: null }],
      };
      ports.gate1.mockResolvedValueOnce({ decision: 'approve' });
      // * ACT / ASSERT
      await expect(reenterGate1({ ...input, approved: prior, wave }, ports)).rejects.toThrow(/revis/i);
      expect(ports.decompose).toHaveBeenCalledTimes(1);
      await expect(reenterGate1({ ...input, approved: prior, wave: { ...wave, findings: [] } }, ports)).rejects.toThrow(
        /findings/i
      );
      ports.readContext = async () => ({ html, targetConfig, baselineDigest: 'changed' });
      await expect(reenterGate1({ ...input, approved: prior, wave }, ports)).rejects.toThrow(/stale/i);
    });
    it('shows a wave-level ownership collision at Gate 1 even when every task passed its own review', async () => {
      // * ARRANGE
      const { input, ports } = setup();
      const prior = await prepareLoop(input, ports);
      const wave = {
        status: 'gate1',
        findings: [finding],
        tasks: [{ taskId: 'A', status: 'ready', findings: [], delta: { changes: [] } }],
      };
      ports.gate1.mockResolvedValueOnce({ decision: 'stop' });
      // * ACT
      const result = await reenterGate1({ ...input, approved: prior, wave }, ports);
      // * ASSERT
      expect(result.status).toBe('stopped');
      expect(result.findings).toEqual([finding]);
      expect(ports.gate1).toHaveBeenCalledWith(
        expect.objectContaining({ invalidatedApprovalDigest: prior.approvalDigest })
      );
      expect(ports.decompose).toHaveBeenCalledTimes(1);
    });
    it.each([
      ['missing approval', { approved: { status: 'stopped' } }, /approved plan/i],
      ['empty wave', { wave: { status: 'gate1', findings: [finding], tasks: [] } }, /wave or anchor/i],
      [
        'unknown wave task',
        { wave: { status: 'gate1', findings: [finding], tasks: [{ taskId: 'other', status: 'ready' }] } },
        /wave or anchor/i,
      ],
      [
        'no task findings',
        { wave: { status: 'gate1', findings: [finding], tasks: [{ taskId: 'A', status: 'gate1', findings: [] }] } },
        /task decomposition/i,
      ],
      [
        'dropped task finding',
        {
          wave: {
            status: 'gate1',
            findings: [finding],
            tasks: [
              {
                taskId: 'A',
                status: 'gate1',
                findings: [{ ...finding, code: 'unobservable_anchor', message: 'No observable behavior' }],
              },
            ],
          },
        },
        /missing task decomposition/i,
      ],
      [
        'all-ready nonownership fault',
        {
          wave: {
            status: 'gate1',
            findings: [{ ...finding, code: 'unobservable_anchor' }],
            tasks: [{ taskId: 'A', status: 'ready' }],
          },
        },
        /wave or anchor/i,
      ],
    ])('refuses unsafe Gate 1 re-entry for %s', async (_, overrides, reason) => {
      const { input, ports } = setup();
      const prior = await prepareLoop(input, ports);
      const wave = {
        status: 'gate1',
        findings: [finding],
        tasks: [{ taskId: 'A', status: 'gate1', findings: [finding] }],
      };
      await expect(reenterGate1({ ...input, approved: prior, wave, ...overrides }, ports)).rejects.toThrow(reason);
    });
    it('invalidates revision when context changes at the human gate and rejects an unchanged replan', async () => {
      const first = setup();
      const prior = await prepareLoop(first.input, first.ports);
      const wave = {
        status: 'gate1',
        findings: [finding],
        tasks: [{ taskId: 'A', status: 'gate1', findings: [finding] }],
      };
      const original = await first.ports.readContext();
      first.ports.gate1.mockImplementationOnce(async () => {
        first.ports.readContext = async () => ({ ...original, baselineDigest: 'modified during gate' });
        return { decision: 'revise', feedback: 'Replan' };
      });
      await expect(reenterGate1({ ...first.input, approved: prior, wave }, first.ports)).rejects.toThrow(/stale/i);
      expect(first.ports.decompose).toHaveBeenCalledTimes(1);

      const second = setup();
      const priorAgain = await prepareLoop(second.input, second.ports);
      second.ports.gate1.mockResolvedValueOnce({ decision: 'revise' });
      await expect(reenterGate1({ ...second.input, approved: priorAgain, wave }, second.ports)).rejects.toThrow(
        /did not address/i
      );
      expect(second.ports.decompose).toHaveBeenCalledTimes(2);
    });
    it('marks both the citing task and the task that owns the affected file as invalidated', async () => {
      const secondAnchor = 'spec/x.html#rule-b';
      const secondTask = { ...task, id: 'B', criteria: [secondAnchor], files_modified: ['src/other.js'] };
      const secondHtml = `${html}<p id="rule-b" data-pd-kind="Rule">B rule.</p>`;
      const { input, ports } = setup();
      ports.readContext = async () => ({ html: secondHtml, targetConfig, baselineDigest: 'same-tree' });
      ports.decompose.mockResolvedValue({
        plan: { issue: 42, target: 'react-vitest', tasks: [task, secondTask] },
        outcome: { status: 'completed', messages: [], usage: { counters: [] } },
        violations: [],
      });
      const changedInput = { ...input, html: secondHtml };
      const prior = await prepareLoop(changedInput, ports);
      const wave = {
        status: 'gate1',
        findings: [finding],
        tasks: [
          { taskId: 'A', status: 'gate1', findings: [finding] },
          { taskId: 'B', status: 'ready' },
        ],
      };
      ports.gate1.mockResolvedValueOnce({ decision: 'stop' });
      const result = await reenterGate1({ ...changedInput, approved: prior, wave }, ports);
      expect(result.affectedTaskIds).toEqual(['A', 'B']);
      expect(ports.gate1).toHaveBeenCalledWith(expect.objectContaining({ affectedTaskIds: ['A', 'B'] }));
    });
  });
  it.each(['stop', 'approve'])('never dispatches later legs on gate %s', async (decision) => {
    // * ARRANGE
    const { input, ports } = setup({ gate1: async () => ({ decision }) });
    // * ACT
    const result = await prepareLoop(input, ports);
    // * ASSERT
    expect(result.status).toBe(decision === 'stop' ? 'stopped' : 'planned');
    expect(ports.runAgent).not.toHaveBeenCalled();
  });
  it('re-decomposes with human feedback and recomputes waves and PR groups on revision', async () => {
    // * ARRANGE
    const { input, ports } = setup();
    ports.gate1.mockResolvedValueOnce({ decision: 'revise', feedback: 'Split independent task' });
    ports.decompose
      .mockResolvedValueOnce({
        plan: { issue: 42, target: 'react-vitest', tasks: [task], waves: [] },
        outcome: { status: 'completed', usage: { counters: [] } },
        violations: [],
      })
      .mockResolvedValueOnce({
        plan: {
          issue: 42,
          target: 'react-vitest',
          tasks: [task, { ...task, id: 'B', files_modified: [] }],
          waves: [['invented']],
        },
        outcome: { status: 'completed', usage: { counters: [] } },
        violations: [],
      });
    // * ACT
    const result = await prepareLoop(input, ports);
    // * ASSERT
    expect(result.plan.waves).toEqual([['A', 'B']]);
    expect(result.prGroups).toEqual([['A'], ['B']]);
    expect(result.warnings).toContain('Task B declares no files; overlap safety cannot be inferred.');
    expect(ports.decompose.mock.calls[1][0].feedback).toBe('Split independent task');
  });
  it.each([
    { violations: [{ code: 'undeclared', path: 'src/other.js' }] },
    { outcome: { status: 'failed', usage: { counters: [] } } },
    { violations: null },
    { plan: { issue: 42, target: 'react-vitest', tasks: [{ ...task, criteria: ['spec/x.html#fake'] }] } },
    { plan: { issue: 43, target: 'react-vitest', tasks: [task] } },
  ])('rejects unaudited, failed, or invalid decomposition before Gate 1: %j', async (override) => {
    // * ARRANGE
    const { input, ports } = setup();
    const valid = await ports.decompose();
    ports.decompose.mockResolvedValue({ ...valid, ...override });
    // * ACT / ASSERT
    await expect(prepareLoop(input, ports)).rejects.toThrow();
    expect(ports.gate1).not.toHaveBeenCalled();
  });
  it.each(['html', 'targetConfig', 'baselineDigest'])('refuses stale approval after %s changes', async (key) => {
    // * ARRANGE
    const { input, ports } = setup();
    const original = await ports.readContext();
    ports.gate1.mockImplementation(async () => {
      ports.readContext = async () => ({
        ...original,
        [key]: key === 'targetConfig' ? { ...targetConfig, exercised: false } : 'changed',
      });
      return { decision: 'approve' };
    });
    // * ACT / ASSERT
    expect((await prepareLoop(input, ports)).status).toBe('stale');
  });
  it('revalidates edited plans and asks Gate 1 again with recomputed waves rather than accepting the old digest', async () => {
    // * ARRANGE
    const { input, ports, artifacts } = setup();
    ports.gate1.mockImplementationOnce(async () => {
      artifacts.get('.loop/plans/42.plan.json').tasks.push({ ...task, id: 'B', depends_on: ['A'], files_modified: [] });
      return { decision: 'approve' };
    });
    // * ACT
    const result = await prepareLoop(input, ports);
    // * ASSERT
    expect(result.plan.waves).toEqual([['A'], ['B']]);
    expect(ports.gate1).toHaveBeenCalledTimes(2);
    expect(ports.gate1.mock.calls[0][0].approvalDigest).not.toBe(ports.gate1.mock.calls[1][0].approvalDigest);
  });
  it('rejects unexercised targets and malformed gate decisions', async () => {
    // * ARRANGE
    const { input, ports } = setup({ gate1: async () => ({ decision: 'yes' }) });
    // * ACT / ASSERT
    await expect(prepareLoop({ ...input, targetConfig: { ...targetConfig, exercised: false } }, ports)).rejects.toThrow(
      /target/i
    );
    await expect(prepareLoop(input, ports)).rejects.toThrow(/gate/i);
    await expect(prepareLoop({ ...input, issue: null }, ports)).rejects.toThrow(/issue/i);
  });
  it('rejects a baseline changed during decomposition before the human can approve a mismatched tree', async () => {
    // * ARRANGE
    const { input, ports } = setup();
    const original = await ports.readContext();
    const decomposed = await ports.decompose();
    ports.decompose.mockImplementation(async () => {
      ports.readContext = async () => ({ ...original, baselineDigest: 'concurrent-change' });
      return decomposed;
    });
    // * ACT
    const result = await prepareLoop(input, ports);
    // * ASSERT
    expect(result.status).toBe('stale');
    expect(ports.gate1).not.toHaveBeenCalled();
  });
  it('surfaces decomposition caveats and aggregates measured revision usage at Gate 1', async () => {
    // * ARRANGE
    const { input, ports } = setup();
    const decomposed = await ports.decompose();
    decomposed.outcome.messages = ['Observable ambiguity needs human review'];
    ports.decompose.mockResolvedValue(decomposed);
    ports.gate1.mockResolvedValueOnce({ decision: 'revise', feedback: 'Clarify' });
    // * ACT
    const result = await prepareLoop(input, ports);
    // * ASSERT
    expect(result.warnings).toContain('Decomposer: Observable ambiguity needs human review');
    expect(result.usage[0].value).toBe(4);
  });
});
