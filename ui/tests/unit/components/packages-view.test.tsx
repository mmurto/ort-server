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

import { defaultParseSearch } from '@tanstack/react-router';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GetRunPackagesData, Package } from '@/api';
import { TooltipProvider } from '@/components/ui/tooltip';
import { formatTimestamp } from '@/lib/utils';
import { Route } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages';
import { packageIdTypeSchema } from '@/schemas';
import { useUserSettingsStore } from '@/store/user-settings.store';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

const mocks = vi.hoisted(() => ({
  packages: [] as Package[],
  packageQueries: [] as GetRunPackagesData['query'][],
  // The queries for the findings of a package, by the id of their operation.
  findingQueries: {} as Record<string, unknown>,
}));

// The findings of a package in the details: four vulnerabilities, of which one
// is on the first page, no rule violations and one issue.
const findingsResponses: Record<string, unknown> = {
  getRunVulnerabilities: {
    data: [
      {
        advisor: { name: 'Advisor' },
        identifier: {
          type: 'Maven',
          namespace: 'org.example',
          name: 'example',
          version: '1.0',
        },
        purl: '',
        rating: 'HIGH',
        resolutions: [],
        unappliedResolutions: [],
        vulnerability: { externalId: 'CVE-2026-1234', references: [] },
      },
    ],
    pagination: { limit: 3, offset: 0, totalCount: 4 },
  },
  getRunRuleViolations: {
    data: [],
    pagination: { limit: 3, offset: 0, totalCount: 0 },
  },
  getRunIssues: {
    data: [
      {
        message: 'Could not resolve\nmore details',
        severity: 'ERROR',
        source: 'Analyzer',
        timestamp: '2026-01-01T00:00:00Z',
      },
    ],
    pagination: { limit: 3, offset: 0, totalCount: 1 },
  },
};

vi.mock('@/components/licenses', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/licenses')>()),
  LicensesList: () => null,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@tanstack/react-query')>();

  return {
    ...original,
    useQuery: ({
      queryKey: [{ _id, query }],
    }: {
      queryKey: [{ _id: string; query?: unknown }];
    }) => {
      mocks.findingQueries[_id] = query;
      const data = findingsResponses[_id];
      if (data === undefined) throw new Error(`Unexpected query '${_id}'.`);

      return { data, isPending: false, isError: false };
    },
    useSuspenseQuery: ({
      queryKey: [{ _id, query }],
    }: {
      queryKey: [{ _id: string; query?: GetRunPackagesData['query'] }];
    }) => {
      switch (_id) {
        case 'getRepositoryRun':
          return { data: { id: 1 } };
        case 'getRunPackageLicenses':
          return {
            data: {
              processedDeclaredLicenses: [],
              unmappedDeclaredLicenses: [],
            },
          };
        case 'getRunPackages':
          mocks.packageQueries.push(query);
          return {
            data: {
              data: mocks.packages,
              pagination: {
                limit: query?.limit,
                offset: query?.offset,
                totalCount: 30,
              },
            },
            error: null,
            isError: false,
          };
        default:
          throw new Error(`Unexpected query '${_id}'.`);
      }
    },
  };
});

const createPackage = (name: string, publishedAt?: string | null): Package => ({
  authors: [],
  binaryArtifact: { url: '', hashValue: '', hashAlgorithm: '' },
  curations: [],
  declaredLicenses: [],
  description: '',
  homepageUrl: `https://example.com/${name}`,
  identifier: {
    type: 'Maven',
    namespace: 'org.example',
    name,
    version: '1.0',
  },
  processedDeclaredLicense: { mappedLicenses: {}, unmappedLicenses: [] },
  purl: `pkg:maven/org.example/${name}@1.0`,
  shortestDependencyPaths: [],
  sourceArtifact: { url: '', hashValue: '', hashAlgorithm: '' },
  vcs: { type: '', url: '', revision: '', path: '' },
  vcsProcessed: { type: '', url: '', revision: '', path: '' },
  ...(publishedAt === undefined ? {} : { publishedAt }),
});

const PackagesComponent = Route.options.component!;

const renderPackages = (search = '') =>
  renderInteractiveWithRouter(<PackagesComponent />, {
    path: `/organizations/1/products/2/repositories/3/runs/4/packages/${search}`,
    routes: [
      {
        path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages/',
      },
    ],
  });

describe('packages view', () => {
  beforeEach(() => {
    mocks.packages = [];
    mocks.packageQueries = [];
  });

  afterEach(() => {
    useUserSettingsStore.setState({
      packageIdType: packageIdTypeSchema.enum.ORT_ID,
    });
  });

  it.each(packageIdTypeSchema.options)(
    'shows the publication date above the homepage in %s mode',
    async (packageIdType) => {
      useUserSettingsStore.setState({ packageIdType });
      mocks.packages = [
        createPackage('dated', '2024-05-06T07:08:09Z'),
        createPackage('null-date', null),
        createPackage('no-date'),
      ];

      renderPackages();

      const date = await screen.findByText(
        formatTimestamp('2024-05-06T07:08:09Z')
      );
      const homepage = screen.getByRole('link', {
        name: 'https://example.com/dated',
      });

      expect(homepage).toHaveAttribute('href', 'https://example.com/dated');
      expect(
        date.compareDocumentPosition(homepage) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        screen.getAllByText(formatTimestamp('2024-05-06T07:08:09Z'))
      ).toHaveLength(1);
      expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
    }
  );

  it('labels the publication date in its tooltip', async () => {
    mocks.packages = [createPackage('dated', '2024-05-06T07:08:09Z')];

    const { user } = renderPackages();

    await user.hover(
      await screen.findByText(formatTimestamp('2024-05-06T07:08:09Z'))
    );

    expect(
      (await screen.findAllByText('Publishing timestamp')).length
    ).toBeGreaterThan(0);
  });

  it('sorts by publication date in both directions after the other sort fields, starting from the first page', async () => {
    mocks.packages = [createPackage('example', '2024-05-06T07:08:09Z')];
    const sortBy = encodeURIComponent(
      JSON.stringify([{ id: 'identifier', desc: false }])
    );

    const { router, user } = renderPackages(`?page=3&sortBy=${sortBy}`);

    const chooseSortByPublicationDate = async () => {
      await user.click(await screen.findByRole('button', { name: 'Sort' }));
      await user.click(screen.getByRole('menuitem', { name: 'Published' }));
    };

    await chooseSortByPublicationDate();

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        page: 1,
        sortBy: [
          { id: 'identifier', desc: false },
          { id: 'publishedAt', desc: false },
        ],
      })
    );
    expect(mocks.packageQueries.at(-1)).toMatchObject({
      offset: 0,
      sort: 'identifier,publishedAt',
    });

    await chooseSortByPublicationDate();

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        sortBy: [
          { id: 'identifier', desc: false },
          { id: 'publishedAt', desc: true },
        ],
      })
    );
    expect(mocks.packageQueries.at(-1)).toMatchObject({
      offset: 0,
      sort: 'identifier,-publishedAt',
    });
  });

  it('lists the findings of a package in its details, linked to their pages', async () => {
    useUserSettingsStore.setState({
      packageIdType: packageIdTypeSchema.enum.ORT_ID,
    });
    mocks.packages = [createPackage('example')];
    const id = 'Maven:org.example:example:1.0';
    const runPath = '/organizations/1/products/2/repositories/3/runs/4';

    const { user } = renderInteractiveWithRouter(
      <TooltipProvider>
        <PackagesComponent />
      </TooltipProvider>,
      {
        path: `${runPath}/packages/`,
        routes: [
          {
            path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages/',
          },
        ],
      }
    );

    // The declared license cell of the package, which holds no link.
    const homepage = await screen.findByRole('link', {
      name: 'https://example.com/example',
    });
    await user.click(
      within(homepage.closest<HTMLElement>('[role="row"]')!).getAllByRole(
        'gridcell'
      )[1]!
    );

    const details = await screen.findByRole('dialog');
    expect(
      within(details).getByRole('heading', { name: 'Findings' })
    ).toBeVisible();
    for (const operation of [
      'getRunVulnerabilities',
      'getRunRuleViolations',
      'getRunIssues',
    ]) {
      expect(mocks.findingQueries[operation]).toMatchObject({
        identifier: id,
        limit: 3,
      });
    }

    const linkTo = (name: string) => {
      const link = within(details).getByRole('link', { name });
      const target = new URL(link.getAttribute('href')!, 'http://localhost');

      return {
        pathname: target.pathname,
        search: defaultParseSearch(target.search),
      };
    };

    expect(linkTo('All 4 vulnerabilities of this package')).toEqual({
      pathname: `${runPath}/vulnerabilities`,
      search: { pkgId: id, sortBy: [{ id: 'rating', desc: true }] },
    });
    expect(linkTo('HIGH CVE-2026-1234')).toEqual({
      pathname: `${runPath}/vulnerabilities`,
      search: {
        pkgId: id,
        sortBy: [{ id: 'rating', desc: true }],
        marked: '0',
      },
    });
    expect(linkTo('All 1 issues of this package').pathname).toBe(
      `${runPath}/issues`
    );
    expect(linkTo('ERROR Could not resolve')).toMatchObject({
      pathname: `${runPath}/issues`,
      search: { pkgId: id, marked: '0' },
    });
    // Without rule violations, there is nothing to link to.
    expect(
      within(details).queryByRole('link', { name: /rule violations/ })
    ).not.toBeInTheDocument();

    expect(linkTo('Show in dependency graph')).toEqual({
      pathname: `${runPath}/dependencies`,
      search: { search: id },
    });
  });
});
