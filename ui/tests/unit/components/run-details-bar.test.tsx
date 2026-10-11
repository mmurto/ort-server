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
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrtRun } from '@/api';
import { getSuperuser, postRepositoryRun } from '@/api/sdk.gen';
import { RunDetailsBar } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/-components/run-details-bar';
import { createOrtRun } from '../fixtures/create-run';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

const mocks = vi.hoisted(() => ({
  allRunIndexes: [1, 3, 5],
  canTriggerRun: true,
  ortRun: undefined as OrtRun | undefined,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();

  return {
    ...actual,
    useSuspenseQuery: (options: { queryKey: string[] }) => ({
      data:
        options.queryKey[0] === 'repository-runs'
          ? mocks.allRunIndexes
          : mocks.ortRun,
    }),
  };
});

vi.mock('@/api/@tanstack/react-query.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/@tanstack/react-query.gen')>()),
  getRepositoryRunsOptions: () => ({ queryKey: ['repository-runs'] }),
  getRepositoryRunOptions: () => ({
    queryKey: ['repository-run'],
    queryFn: async () => mocks.ortRun,
  }),
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getOrganization: vi.fn(() => new Promise(() => {})),
  getProduct: vi.fn(() => new Promise(() => {})),
  getRepository: vi.fn(() => new Promise(() => {})),
  getSuperuser: vi.fn(),
  postRepositoryRun: vi.fn(),
}));

vi.mock('react-oidc-context', () => ({ useAuth: () => ({ user: null }) }));

vi.mock('@/hooks/use-authorization', () => ({
  useRepositoryPermission: () => ({ isAllowed: mocks.canTriggerRun }),
}));

vi.mock('@/components/favorite-button', () => ({
  RunFavoriteButton: () => null,
}));

vi.mock('@/components/ort-run-job-status', () => ({
  OrtRunJobStatus: () => null,
}));

vi.mock('@/components/run-duration', () => ({
  RunDuration: () => null,
}));

vi.mock('@/components/sha1-component', () => ({
  Sha1Component: () => null,
}));

vi.mock('@/components/timestamp-with-utc', () => ({
  TimestampWithUTC: () => null,
}));

const runsRoute =
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs';
const runRoute = `${runsRoute}/$runIndex`;
const runPath = '/organizations/1/products/2/repositories/3/runs';

const renderBar = (runIndex: number, suffix = '/config?tab=jobs') => {
  mocks.ortRun = createOrtRun({
    createdAt: '2026-01-01T00:00:00Z',
    id: 42,
    index: runIndex,
    jobs: {},
    status: 'FINISHED',
    revision: 'main',
    path: 'sub',
    jobConfigs: { analyzer: { allowDynamicVersions: true } },
    labels: { team: 'a' },
  });

  return renderInteractiveWithRouter(<RunDetailsBar />, {
    path: `${runPath}/${runIndex}${suffix}`,
    routes: [
      { path: runsRoute },
      {
        path: runRoute,
        children: [{ path: 'config' }],
      },
      {
        path: '/organizations/$orgId/products/$productId/repositories/$repoId/create-run',
      },
    ],
    withQueryClient: true,
  });
};

describe('RunDetailsBar', () => {
  beforeEach(() => {
    mocks.allRunIndexes = [1, 3, 5];
    mocks.canTriggerRun = true;
    vi.mocked(getSuperuser).mockResolvedValue({
      data: false,
    } as Awaited<ReturnType<typeof getSuperuser>>);
    vi.mocked(postRepositoryRun).mockReset();
  });

  it('keeps the current page and search in previous and next links', async () => {
    const { container } = renderBar(3);

    expect(
      await screen.findByRole('link', { name: 'Previous run' })
    ).toHaveAttribute('href', `${runPath}/1/config?tab=jobs`);
    expect(screen.getByRole('link', { name: 'All runs' })).toHaveAttribute(
      'href',
      runPath
    );
    expect(screen.getByRole('link', { name: 'Next run' })).toHaveAttribute(
      'href',
      `${runPath}/5/config?tab=jobs`
    );
    expect(screen.getByRole('button', { name: 'Rerun' })).toBeEnabled();
    expect(container.querySelector('a button')).not.toBeInTheDocument();
  });

  it.each([
    { runIndex: 1, name: 'Previous' },
    { runIndex: 5, name: 'Next' },
  ])(
    'disables the $name link at the run boundary',
    async ({ runIndex, name }) => {
      renderBar(runIndex, '');

      expect(
        await screen.findByRole('link', { name: `${name} run` })
      ).toHaveAttribute('aria-disabled', 'true');
    }
  );

  it('disables rerun without permission', async () => {
    mocks.canTriggerRun = false;

    renderBar(3, '');

    expect(await screen.findByRole('button', { name: 'Rerun' })).toBeDisabled();
  });

  it('starts a run with the configuration of the run', async () => {
    vi.mocked(postRepositoryRun).mockResolvedValue({
      data: { id: 43, index: 6, repositoryId: 3 },
    } as Awaited<ReturnType<typeof postRepositoryRun>>);
    const { router, user } = renderBar(3, '');

    await user.click(await screen.findByRole('button', { name: 'Rerun' }));

    expect(
      await screen.findByRole('link', { name: 'Change configuration…' })
    ).toHaveAttribute(
      'href',
      '/organizations/1/products/2/repositories/3/create-run?rerunIndex=3'
    );
    expect(await screen.findByText('Latest of')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start run' }));

    await waitFor(() =>
      expect(postRepositoryRun).toHaveBeenCalledWith(
        expect.objectContaining({
          path: { repositoryId: 3 },
          body: {
            revision: 'main',
            path: 'sub',
            jobConfigs: { analyzer: { allowDynamicVersions: true } },
            jobConfigContext: undefined,
            environmentConfigPath: undefined,
            labels: { team: 'a' },
          },
        })
      )
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`${runPath}/6`)
    );
  });
});
