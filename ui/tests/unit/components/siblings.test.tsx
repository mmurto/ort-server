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

import { screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrtRunSummary } from '@/api';
import { getRepositoryRuns } from '@/api/sdk.gen';
import { Siblings } from '@/components/siblings';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

// The breadcrumbs come from the context of the app's router, which the test
// router does not have.
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({
    options: { context: { breadcrumbs: { run: 'Run 5' } } },
  }),
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getRepositoryRuns: vi.fn(),
}));

const repoPath = '/organizations/1/products/2/repositories/3';

const createRun = (index: number): OrtRunSummary => ({
  id: index + 100,
  index,
  organizationId: 1,
  productId: 2,
  repositoryId: 3,
  revision: `rev-${index}`,
  createdAt: '2026-01-01T00:00:00Z',
  jobs: {},
  labels: {},
  status: 'FINISHED',
});

const renderRunSiblings = (path: string) =>
  renderInteractiveWithRouter(<Siblings entity='run' />, {
    path,
    routes: [
      {
        path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex',
        children: [{ path: 'vulnerabilities' }],
      },
    ],
    withQueryClient: true,
  });

describe('Siblings of a run', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
    // jsdom implements neither, and the list loads more entries on scroll.
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });

  beforeEach(() => {
    vi.mocked(getRepositoryRuns).mockResolvedValue({
      data: {
        data: [createRun(5), createRun(4)],
        pagination: { limit: 1, offset: 0, totalCount: 2 },
      },
    } as unknown as Awaited<ReturnType<typeof getRepositoryRuns>>);
  });

  it('keeps the page of the run and drops the opened item', async () => {
    const { container, user } = renderRunSiblings(
      `${repoPath}/runs/5/vulnerabilities?marked=abc&page=2&tab=x`
    );

    const trigger = await vi.waitFor(() => {
      const element = container.querySelector('svg.lucide-chevron-down');
      if (!element) throw new Error('No dropdown trigger yet');
      return element;
    });
    await user.click(trigger);

    const other = await screen.findByRole('option', { name: /Run 4/ });
    expect(other).toHaveTextContent('rev-4');
    expect(other.closest('a') ?? other).toHaveAttribute(
      'href',
      `${repoPath}/runs/4/vulnerabilities?tab=x`
    );
  });

  it('links to the overview of the other run from the overview', async () => {
    const { container, user } = renderRunSiblings(`${repoPath}/runs/5`);

    const trigger = await vi.waitFor(() => {
      const element = container.querySelector('svg.lucide-chevron-down');
      if (!element) throw new Error('No dropdown trigger yet');
      return element;
    });
    await user.click(trigger);

    const other = await screen.findByRole('option', { name: /Run 4/ });
    expect(other.closest('a') ?? other).toHaveAttribute(
      'href',
      `${repoPath}/runs/4`
    );
  });
});
