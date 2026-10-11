/*
 * Copyright (C) 2026 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

// @vitest-environment jsdom

import { screen, waitFor, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrtRunStatistics, OrtRunSummary } from '@/api';
import {
  CompareRunsButton,
  RunComparisonDialog,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/run-comparison-dialog';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  runs: vi.fn(),
  statistics: vi.fn(),
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getRepositoryRun: mocks.run,
  getRepositoryRuns: mocks.runs,
  getRunStatistics: mocks.statistics,
}));

const createRun = (index: number, revision = 'main'): OrtRunSummary => ({
  id: index + 100,
  index,
  organizationId: 1,
  productId: 2,
  repositoryId: 3,
  revision,
  createdAt: '2026-01-01T00:00:00Z',
  jobs: {},
  labels: {},
  status: 'FINISHED',
});

const statisticsByRunId: Record<number, OrtRunStatistics> = {
  101: {
    issuesCount: 0,
    vulnerabilitiesCount: 9,
    ruleViolationsCount: 0,
    packagesCount: 30,
  },
  102: {
    issuesCount: 2,
    vulnerabilitiesCount: 5,
    ruleViolationsCount: 1,
    packagesCount: 40,
  },
  103: {
    issuesCount: 4,
    vulnerabilitiesCount: 3,
    ruleViolationsCount: 1,
    packagesCount: 42,
  },
};

const configsByRunIndex: Record<number, unknown> = {
  1: { analyzer: { allowDynamicVersions: true } },
  2: { analyzer: { allowDynamicVersions: false } },
  3: { analyzer: { allowDynamicVersions: true } },
};

const renderDialog = (ui: React.ReactNode) =>
  renderInteractiveWithRouter(ui, {
    path: '/',
    routes: [{ path: '/' }],
    withQueryClient: true,
  });

// The cells of the statistics row of the given category.
const statisticsRow = async (label: string) => {
  const cell = await screen.findByRole('cell', { name: label });

  return within(cell.closest('tr')!)
    .getAllByRole('cell')
    .map((element) => element.textContent);
};

describe('RunComparisonDialog', () => {
  beforeAll(() => {
    // Radix Select relies on DOM APIs that jsdom does not implement.
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runs.mockResolvedValue({
      data: {
        data: [createRun(3), createRun(2, 'feature'), createRun(1)],
        pagination: { limit: 100, offset: 0, totalCount: 3 },
      },
    });
    mocks.statistics.mockImplementation(
      async ({ path }: { path: { runId: number } }) => ({
        data: statisticsByRunId[path.runId],
      })
    );
    mocks.run.mockImplementation(
      async ({ path }: { path: { ortRunIndex: number } }) => ({
        data: {
          ...createRun(path.ortRunIndex),
          resolvedJobConfigs: configsByRunIndex[path.ortRunIndex],
        },
      })
    );
  });

  it('is compiled by React Compiler', () => {
    expect(RunComparisonDialog.toString()).toContain(
      'react.memo_cache_sentinel'
    );
  });

  it('compares the counts and the configuration of two runs', async () => {
    renderDialog(
      <RunComparisonDialog
        repositoryId={3}
        open
        onOpenChange={() => {}}
        baseRunIndex={2}
        comparedRunIndex={3}
      />
    );

    expect(
      await screen.findByRole('columnheader', { name: 'Run 2' })
    ).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Run 3' })).toBeVisible();

    expect(await statisticsRow('Issues')).toEqual([
      'Issues',
      '2',
      '4',
      '+22 more than run 2',
    ]);
    expect(await statisticsRow('Vulnerabilities')).toEqual([
      'Vulnerabilities',
      '5',
      '3',
      '−22 fewer than run 2',
    ]);
    expect(await statisticsRow('Rule violations')).toEqual([
      'Rule violations',
      '1',
      '1',
      '±0Same as run 2',
    ]);
    expect(screen.getByText('+2', { selector: '.text-err' })).toBeVisible();
    expect(screen.getByText('−2', { selector: '.text-ok' })).toBeVisible();

    expect(
      await screen.findByText('0 added, 0 removed, 1 modified')
    ).toBeVisible();
    expect(screen.getByText('analyzer.allowDynamicVersions')).toBeVisible();
    expect(mocks.run).toHaveBeenCalledWith(
      expect.objectContaining({ path: { repositoryId: 3, ortRunIndex: 2 } })
    );
  });

  it('swaps the runs', async () => {
    const { user } = renderDialog(
      <RunComparisonDialog
        repositoryId={3}
        open
        onOpenChange={() => {}}
        baseRunIndex={2}
        comparedRunIndex={3}
      />
    );

    await statisticsRow('Issues');
    await user.click(screen.getByRole('button', { name: 'Swap runs' }));

    expect(await statisticsRow('Issues')).toEqual([
      'Issues',
      '4',
      '2',
      '−22 fewer than run 3',
    ]);
  });

  it('picks another run to compare against', async () => {
    const { user } = renderDialog(
      <RunComparisonDialog
        repositoryId={3}
        open
        onOpenChange={() => {}}
        baseRunIndex={2}
        comparedRunIndex={3}
      />
    );

    await statisticsRow('Issues');
    await user.click(screen.getByRole('combobox', { name: 'Before' }));
    await user.click(await screen.findByRole('option', { name: /Run 1/ }));

    expect(await statisticsRow('Vulnerabilities')).toEqual([
      'Vulnerabilities',
      '9',
      '3',
      '−66 fewer than run 1',
    ]);
    expect(
      await screen.findByText('The resolved job configurations are identical.')
    ).toBeVisible();
  });

  it('asks for a run before when there is none', async () => {
    renderDialog(
      <RunComparisonDialog
        repositoryId={3}
        open
        onOpenChange={() => {}}
        comparedRunIndex={1}
      />
    );

    expect(
      await screen.findByText(/Pick the run before and the run after/)
    ).toBeVisible();
    expect(mocks.statistics).not.toHaveBeenCalled();
  });

  it('asks for two different runs', async () => {
    renderDialog(
      <RunComparisonDialog
        repositoryId={3}
        open
        onOpenChange={() => {}}
        baseRunIndex={2}
        comparedRunIndex={2}
      />
    );

    expect(
      await screen.findByText('Pick two different runs to compare.')
    ).toBeVisible();
  });

  it('offers runs that are already loaded besides the newest runs', async () => {
    const { user } = renderDialog(
      <RunComparisonDialog
        repositoryId={3}
        open
        onOpenChange={() => {}}
        baseRunIndex={2}
        comparedRunIndex={3}
        knownRuns={[createRun(250, 'old')]}
      />
    );

    await statisticsRow('Issues');
    await user.click(screen.getByRole('combobox', { name: 'After' }));

    expect(
      (await screen.findAllByRole('option')).map((option) => option.textContent)
    ).toEqual(['Run 250old', 'Run 3main', 'Run 2feature', 'Run 1main']);
  });
});

describe('CompareRunsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runs.mockResolvedValue({
      data: {
        data: [createRun(3), createRun(2), createRun(1)],
        pagination: { limit: 100, offset: 0, totalCount: 3 },
      },
    });
    mocks.statistics.mockImplementation(
      async ({ path }: { path: { runId: number } }) => ({
        data: statisticsByRunId[path.runId],
      })
    );
    mocks.run.mockImplementation(
      async ({ path }: { path: { ortRunIndex: number } }) => ({
        data: {
          ...createRun(path.ortRunIndex),
          resolvedJobConfigs: configsByRunIndex[path.ortRunIndex],
        },
      })
    );
  });

  it('compares the newest two runs', async () => {
    const { user } = renderDialog(<CompareRunsButton repositoryId={3} />);

    const button = await screen.findByRole('button', { name: 'Compare runs' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.runs).not.toHaveBeenCalled();

    await user.click(button);

    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(
      await screen.findByRole('columnheader', { name: 'Run 2' })
    ).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Run 3' })).toBeVisible();
    expect(mocks.runs).toHaveBeenCalledWith(
      expect.objectContaining({ query: { limit: 100, sort: '-index' } })
    );

    await user.click(screen.getAllByRole('button', { name: 'Close' })[0]!);

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });
});
