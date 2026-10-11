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
import { Suspense, type ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRepositoryRun } from '@/api/sdk.gen';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/logs/index';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: unknown) => ({
    options,
    useParams: () => ({
      orgId: '1',
      productId: '2',
      repoId: '3',
      runIndex: '4',
    }),
  }),
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getRepositoryRun: vi.fn(),
}));

vi.mock('@/hooks/use-user.ts', () => ({
  useUser: () => ({ user: { access_token: 'token' } }),
}));

const renderPage = () => {
  vi.mocked(getRepositoryRun).mockResolvedValue({
    data: {
      id: 44,
      index: 4,
      status: 'FINISHED',
      jobs: {
        analyzer: {
          status: 'FINISHED',
          createdAt: '2026-01-01T10:00:00Z',
          startedAt: '2026-01-01T10:00:00Z',
          finishedAt: '2026-01-01T10:06:52Z',
        },
        evaluator: {
          status: 'FAILED',
          createdAt: '2026-01-01T10:07:00Z',
          startedAt: '2026-01-01T10:07:00Z',
          finishedAt: '2026-01-01T10:07:41Z',
        },
      },
    },
  } as unknown as Awaited<ReturnType<typeof getRepositoryRun>>);
  const Component = Route.options.component as ComponentType;

  return renderInteractiveWithRouter(
    <Suspense>
      <TooltipProvider>
        <Component />
      </TooltipProvider>
    </Suspense>,
    { path: '/', routes: [{ path: '/' }], withQueryClient: true }
  );
};

const stepRow = async (step: string) => {
  const cell = await screen.findByRole('cell', { name: step });

  return within(cell.closest('tr')!);
};

describe('run logs page', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(new Blob(['zip']), {
        headers: { 'content-disposition': 'attachment; filename=logs.zip' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    window.URL.createObjectURL = () => 'blob:logs';
    window.URL.revokeObjectURL = () => {};
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the status and duration of each step in the archive', async () => {
    renderPage();

    expect(
      (await stepRow('Configuration')).getByText('Always included')
    ).toBeVisible();
    expect((await stepRow('Analyzer')).getByText('Finished')).toBeVisible();
    expect((await stepRow('Analyzer')).getByText('6m 52s')).toBeVisible();
    expect((await stepRow('Evaluator')).getByText('Failed')).toBeVisible();
    expect((await stepRow('Evaluator')).getByText('41s')).toBeVisible();
    expect(screen.queryByRole('cell', { name: 'Scanner' })).toBeNull();
    expect(screen.getByText('3 in the archive')).toBeVisible();
  });

  it('downloads the archive of a level for the steps of the run', async () => {
    const { user } = renderPage();

    for (const level of ['ERROR', 'WARN', 'INFO', 'DEBUG']) {
      expect(
        await screen.findByRole('button', {
          name: `Download ${level} level archive`,
        })
      ).toBeEnabled();
    }

    await user.click(
      screen.getByRole('button', { name: 'Download DEBUG level archive' })
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/runs/44/logs?level=DEBUG&steps=analyzer,evaluator,config'
        ),
        { headers: { Authorization: 'Bearer token' } }
      )
    );
    await waitFor(() =>
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    );
  });
});
