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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRepositoryRuns } from '@/api/sdk.gen';
import { Route } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/index';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: unknown) => ({
    options,
    useParams: () => ({ orgId: '1', productId: '2', repoId: '3' }),
  }),
  useNavigate: () => navigate,
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getRepositoryRuns: vi.fn(),
}));

const params = { orgId: '1', productId: '2', repoId: '3' };

const renderRedirect = (runIndexes: number[]) => {
  vi.mocked(getRepositoryRuns).mockResolvedValue({
    data: {
      data: runIndexes.map((index) => ({ id: index + 100, index })),
      pagination: { limit: 1, offset: 0, totalCount: runIndexes.length },
    },
  } as unknown as Awaited<ReturnType<typeof getRepositoryRuns>>);
  const Component = Route.options.component as ComponentType;

  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Component />
    </QueryClientProvider>
  );
};

describe('repository index', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('opens the runs of a repository that has runs', async () => {
    renderRedirect([7]);

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs',
        replace: true,
        params,
      })
    );
  });

  it('opens the form for the first run of a repository without runs', async () => {
    renderRedirect([]);

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/organizations/$orgId/products/$productId/repositories/$repoId/create-run',
        replace: true,
        params,
      })
    );
  });
});
