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

import { defaultStringifySearch } from '@tanstack/react-router';
import { screen, waitFor, within } from '@testing-library/react';
import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SnippetFinding, SnippetFindingProvenance } from '@/api';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/snippet-findings/index';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  provenances: vi.fn(),
  findings: vi.fn(),
  snippets: vi.fn(),
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getRepositoryRun: mocks.run,
  getRunSnippetFindingProvenances: mocks.provenances,
  getRunProvenanceSnippetFindings: mocks.findings,
  getRunSnippetFindingSnippets: mocks.snippets,
}));

const SnippetFindingsComponent = Route.options.component!;
const routePath =
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/snippet-findings/';

const provenances: SnippetFindingProvenance[] = [1, 2].map((id) => ({
  id,
  identifier: {
    type: 'Maven',
    namespace: 'com.example',
    name: `library-${id}`,
    version: '1.0',
  },
  provenanceType: 'ARTIFACT',
  artifactUrl: `https://example.com/library-${id}.jar`,
  snippetFindingCount: 25,
}));

const page = <T,>(data: T[], query?: { limit?: number; offset?: number }) => ({
  data: {
    data: data.slice(
      query?.offset ?? 0,
      (query?.offset ?? 0) + (query?.limit ?? 10)
    ),
    pagination: {
      totalCount: data.length,
      limit: query?.limit ?? 10,
      offset: query?.offset ?? 0,
    },
  },
});

const renderView = (search = '') =>
  renderInteractiveWithRouter(
    <Suspense fallback='Loading'>
      <TooltipProvider>
        <SnippetFindingsComponent />
      </TooltipProvider>
    </Suspense>,
    {
      path: `/organizations/1/products/2/repositories/3/runs/4/snippet-findings${search}`,
      routes: [{ path: routePath }],
      withQueryClient: true,
    }
  );

const detailsRegion = () =>
  screen.getByRole('complementary', { name: 'Details' });

beforeEach(() => {
  vi.clearAllMocks();
  // Show the details next to the grid, as on wide screens.
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (media: string) =>
      ({
        media,
        matches: true,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  );
  mocks.run.mockResolvedValue({ data: { id: 42, jobs: { scanner: {} } } });
  mocks.provenances.mockImplementation(({ query }) =>
    Promise.resolve(page(provenances, query))
  );
  mocks.findings.mockImplementation(({ path, query }) =>
    Promise.resolve(
      page<SnippetFinding>(
        Array.from({ length: 25 }, (_, index) => ({
          id: index,
          path: `provenance-${path.provenanceId}/file-${index}.c`,
          startLine: 1,
          endLine: 5,
          snippetCount: 1,
        })),
        query
      )
    )
  );
  mocks.snippets.mockResolvedValue(page([]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('snippet findings', () => {
  it('shows the findings of a provenance in the details', async () => {
    const { router, user } = renderView();
    const name = await screen.findByText('Maven:com.example:library-1:1.0');

    await user.click(
      within(name.closest<HTMLElement>('[role="row"]')!).getAllByRole(
        'gridcell'
      )[2]!
    );

    expect(
      await within(detailsRegion()).findByText('provenance-1/file-0.c')
    ).toBeVisible();
    expect(
      within(detailsRegion()).getByRole('heading', { name: 'Provenance' })
    ).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ marked: '0' })
    );

    // Paging the findings keeps the details open.
    await user.click(
      within(detailsRegion()).getByRole('link', { name: 'Go to next page' })
    );
    expect(
      await within(detailsRegion()).findByText('provenance-1/file-10.c')
    ).toBeVisible();
    expect(router.state.location.search).toEqual({
      marked: '0',
      findingsPage: 2,
    });

    // Another provenance starts on the first page of its findings.
    await user.click(
      within(detailsRegion()).getByRole('button', { name: 'Next item' })
    );
    expect(
      await within(detailsRegion()).findByText('provenance-2/file-0.c')
    ).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ marked: '1' })
    );
  });

  it('opens the details of the provenance marked in the URL', async () => {
    renderView(defaultStringifySearch({ marked: '1' }));

    expect(
      await within(
        await screen.findByRole('complementary', { name: 'Details' })
      ).findByText('provenance-2/file-0.c')
    ).toBeVisible();
  });
});
