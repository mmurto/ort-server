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

import { screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrtRunSummary } from '@/api';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RepositoryRunsTable } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/repository-runs-table';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

type ComparisonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseRunIndex?: number;
  comparedRunIndex?: number;
  knownRuns?: OrtRunSummary[];
};

const mocks = vi.hoisted(() => ({
  organization: vi.fn(),
  product: vi.fn(),
  repository: vi.fn(),
  run: vi.fn(),
  runs: vi.fn(),
  superuser: vi.fn(),
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getOrganization: mocks.organization,
  getProduct: mocks.product,
  getRepository: mocks.repository,
  getRepositoryRun: mocks.run,
  getRepositoryRuns: mocks.runs,
  getSuperuser: mocks.superuser,
}));

// The rerun button reads the user to decide which job options to keep.
vi.mock('react-oidc-context', () => ({ useAuth: () => ({ user: null }) }));

// Poll the runs often, so that the tests do not have to wait for refreshed data.
vi.mock('@/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/config')>();

  return { config: { ...original.config, pollInterval: 50 } };
});

vi.mock('@/hooks/use-authorization', () => ({
  useRepositoryPermission: () => ({
    isAllowed: true,
    isPending: false,
    error: null,
  }),
}));

vi.mock('@/components/favorite-button', () => ({
  FavoriteButton: () => null,
}));

vi.mock('@/components/delete-dialog', () => ({
  DeleteDialog: () => null,
}));

vi.mock('@/components/ort-run-job-status', () => ({
  OrtRunJobStatus: () => null,
}));

vi.mock(
  '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/run-item-counts',
  () => ({
    RunItemCounts: ({
      summary,
      previous,
    }: {
      summary: OrtRunSummary;
      previous?: OrtRunSummary;
    }) => (
      <span>
        Counts of run {summary.index} since run {previous?.index ?? 'none'}
      </span>
    ),
  })
);

vi.mock(
  '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/run-comparison-dialog',
  () => ({
    RunComparisonDialog: ({
      open,
      onOpenChange,
      baseRunIndex,
      comparedRunIndex,
      knownRuns,
    }: ComparisonDialogProps) =>
      open ? (
        <div role='dialog'>
          Comparing run {baseRunIndex ?? 'none'} with run {comparedRunIndex} of{' '}
          {knownRuns?.map((run) => run.index).join(',')}
          <button type='button' onClick={() => onOpenChange(false)}>
            Close
          </button>
        </div>
      ) : null,
  })
);

const createRun = (
  index: number,
  status: OrtRunSummary['status']
): OrtRunSummary => ({
  id: index + 100,
  index,
  organizationId: 1,
  productId: 2,
  repositoryId: 3,
  revision: 'main',
  createdAt: '2026-01-01T00:00:00Z',
  jobs: {},
  labels: {},
  status,
});

const runs = (...summaries: OrtRunSummary[]) => ({
  data: {
    data: summaries,
    pagination: { limit: 10, offset: 0, totalCount: summaries.length },
  },
});

const renderTable = (pageSize = 10) =>
  renderInteractiveWithRouter(
    <Suspense>
      <TooltipProvider>
        <RepositoryRunsTable
          orgId='1'
          productId='2'
          repoId='3'
          pageIndex={0}
          pageSize={pageSize}
          search={{}}
        />
      </TooltipProvider>
    </Suspense>,
    {
      path: '/runs',
      routes: [{ path: '/runs' }],
      withQueryClient: true,
    }
  );

describe('RepositoryRunsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.organization.mockResolvedValue({ data: { id: 1, name: 'org' } });
    mocks.product.mockResolvedValue({
      data: { id: 2, organizationId: 1, name: 'product' },
    });
    mocks.repository.mockResolvedValue({
      data: {
        id: 3,
        organizationId: 1,
        productId: 2,
        type: 'GIT',
        url: 'https://example.com/repository.git',
      },
    });
    mocks.run.mockResolvedValue({ data: {} });
    mocks.superuser.mockResolvedValue({ data: false });
    mocks.runs.mockResolvedValue(
      runs(
        createRun(3, 'ACTIVE'),
        createRun(2, 'FINISHED'),
        createRun(1, 'FINISHED')
      )
    );
  });

  it('is compiled by React Compiler', () => {
    expect(RepositoryRunsTable.toString()).toContain(
      'react.memo_cache_sentinel'
    );
  });

  it('loads one run more than the page shows to show the change of the last row', async () => {
    renderTable(2);

    expect(
      await screen.findByText('Counts of run 3 since run 2')
    ).toBeVisible();
    expect(screen.getByText('Counts of run 2 since run 1')).toBeVisible();
    expect(screen.queryByRole('link', { name: '1' })).not.toBeInTheDocument();
    expect(mocks.runs).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { limit: 3, offset: 0, sort: '-index' },
      })
    );
  });

  it('has no change for the oldest run', async () => {
    renderTable();

    expect(
      await screen.findByText('Counts of run 1 since run none')
    ).toBeVisible();
  });

  it('compares a run with the run before it', async () => {
    const { user } = renderTable();

    await user.click(
      await screen.findByRole('button', { name: 'Compare run 2…' })
    );

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Comparing run 1 with run 2 of 3,2,1'
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('leaves the run before open for the oldest run', async () => {
    const { user } = renderTable();

    await user.click(
      await screen.findByRole('button', { name: 'Compare run 1…' })
    );

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Comparing run none with run 1'
    );
  });

  it('shows polled data', async () => {
    renderTable();

    expect(await screen.findByText('Running')).toBeVisible();

    mocks.runs.mockResolvedValue(
      runs(
        createRun(3, 'FAILED'),
        createRun(2, 'FINISHED'),
        createRun(1, 'FINISHED')
      )
    );

    expect(await screen.findByText('Failed')).toBeVisible();
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });

  it('offers to rerun each run', async () => {
    const { user } = renderTable();

    for (const runIndex of [1, 2, 3]) {
      expect(
        await screen.findByRole('button', { name: `Rerun run ${runIndex}` })
      ).toBeEnabled();
    }

    await user.click(screen.getByRole('button', { name: 'Rerun run 2' }));

    expect(
      await screen.findByRole('link', { name: 'Change configuration…' })
    ).toHaveAttribute(
      'href',
      '/organizations/1/products/2/repositories/3/create-run?rerunIndex=2'
    );
    expect(screen.getByRole('button', { name: 'Start run' })).toBeVisible();
  });
});
