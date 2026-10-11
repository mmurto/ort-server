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

import { act, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { getRepository, getRepositoryRuns } from '@/api/sdk.gen';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/runs/index';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: unknown) => ({
    options,
    useParams: () => ({ orgId: '1', productId: '2', repoId: '3' }),
    useSearch: () => ({}),
  }),
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getRepository: vi.fn(),
  getRepositoryRuns: vi.fn(),
}));

vi.mock('@/hooks/use-authorization', () => ({
  useRepositoryPermission: () => ({ isAllowed: true }),
}));

vi.mock('@/components/charts/job-durations', () => ({
  JobDurations: () => null,
}));

vi.mock('@/components/favorite-button', () => ({
  RepositoryFavoriteButton: () => null,
}));

vi.mock(
  '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components',
  () => ({ RepositoryRunsTable: () => null })
);

const repoPath = '/organizations/1/products/2/repositories/3';

const renderPage = (runIndexes: number[]) => {
  vi.mocked(getRepository).mockResolvedValue({
    data: {
      id: 3,
      organizationId: 1,
      productId: 2,
      type: 'GIT',
      url: 'https://example.com/repository.git',
    },
  } as Awaited<ReturnType<typeof getRepository>>);
  vi.mocked(getRepositoryRuns).mockResolvedValue({
    data: {
      data: runIndexes.map((index) => ({ id: index + 100, index })),
      pagination: { limit: 1, offset: 0, totalCount: runIndexes.length },
    },
  } as unknown as Awaited<ReturnType<typeof getRepositoryRuns>>);
  const Component = Route.options.component as ComponentType;

  return renderInteractiveWithRouter(
    <TooltipProvider>
      <Component />
    </TooltipProvider>,
    {
      path: `${repoPath}/runs`,
      routes: [
        {
          path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs',
        },
        {
          path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex',
        },
      ],
      withQueryClient: true,
    }
  );
};

describe('repository runs page', () => {
  it('opens the latest run', async () => {
    renderPage([9]);

    expect(
      await screen.findByRole('link', { name: /Latest run/ })
    ).toHaveAttribute('href', `${repoPath}/runs/9`);
    expect(screen.getByRole('link', { name: /New run/ })).toBeInTheDocument();
  });

  it('offers no latest run without runs', async () => {
    renderPage([]);

    expect(
      await screen.findByRole('link', { name: /New run/ })
    ).toBeInTheDocument();
    await waitFor(() => expect(getRepositoryRuns).toHaveBeenCalled());
    await act(() => Promise.resolve());
    expect(
      screen.queryByRole('link', { name: /Latest run/ })
    ).not.toBeInTheDocument();
  });

  it('offers to compare runs once there are two', async () => {
    renderPage([9, 8]);

    expect(
      await screen.findByRole('button', { name: 'Compare runs' })
    ).toBeVisible();
  });

  it('offers no comparison with a single run', async () => {
    renderPage([9]);

    expect(
      await screen.findByRole('link', { name: /Latest run/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Compare runs' })
    ).not.toBeInTheDocument();
  });

  it('loads one run more than a page in the loader', async () => {
    const queryClient = { prefetchQuery: vi.fn() };
    const loader = Route.options.loader as (context: unknown) => Promise<void>;

    await loader({
      context: { queryClient },
      params: { repoId: '3' },
      deps: { page: 2, pageSize: 20 },
    });

    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          expect.objectContaining({
            query: { limit: 21, offset: 20, sort: '-index' },
          }),
        ],
      })
    );
  });
});
