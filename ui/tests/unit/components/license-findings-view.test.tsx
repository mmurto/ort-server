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

import {
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router';
import { act, screen, waitFor, within } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  GetRunDetectedLicenseFindingsData,
  GetRunDetectedLicensesData,
  GetRunPackagesWithDetectedLicenseData,
  PackageIdentifier,
} from '@/api';
import { TooltipProvider } from '@/components/ui/tooltip';
import { identifierToString } from '@/helpers/identifier-conversion';
import { LicenseFindingsView } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/license-findings/-components/license-findings-view';
import {
  licenseFindingsSearchParameterSchema,
  packageIdTypeSchema,
} from '@/schemas';
import { useUserSettingsStore } from '@/store/user-settings.store';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

// Each scenario drives many panels through real router navigations and queries.
vi.setConfig({ testTimeout: 20000 });

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  licenses: vi.fn(),
  packages: vi.fn(),
  findings: vi.fn(),
}));

// Keep the real generated query options and query cache; mock only the SDK boundary.
vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getRepositoryRun: mocks.run,
  getRunDetectedLicenses: mocks.licenses,
  getRunPackagesWithDetectedLicense: mocks.packages,
  getRunDetectedLicenseFindings: mocks.findings,
}));

const routePath =
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/license-findings/';
const runPath =
  '/organizations/1/products/2/repositories/3/runs/4/license-findings';
const packages: PackageIdentifier[] = Array.from(
  { length: 35 },
  (_, index) => ({
    identifier: {
      type: 'Maven',
      namespace: 'com.example',
      name: `library-${index}`,
      version: '1.0/rc%1',
    },
    purl: `pkg:maven/com.example/library-${index}@1.0`,
  })
);
const firstId = identifierToString(packages[0]!.identifier);
const secondId = identifierToString(packages[1]!.identifier);
const licenses = [
  'MIT',
  'Apache-2.0',
  ...Array.from({ length: 10 }, (_, index) => `LicenseRef-extra-${index}`),
].map((license) => ({ license, packageCount: packages.length }));
const pageResponse = <T,>(
  data: T[],
  query?: { limit?: number; offset?: number }
) => ({
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

const renderView = (search: Record<string, unknown> = {}) =>
  renderInteractiveWithRouter(
    <TooltipProvider>
      <LicenseFindingsView />
    </TooltipProvider>,
    {
      path: runPath + defaultStringifySearch(search),
      routes: [
        {
          path: routePath,
          validateSearch: licenseFindingsSearchParameterSchema.parse,
        },
      ],
      withQueryClient: true,
    }
  );
const packageRegion = (license: string) =>
  screen.getByRole('region', { name: `Packages for ${license}` });
const findingsName = (license: string, id = firstId) =>
  `License findings for ${id} under ${license}`;
const findingsRegion = (license: string, id = firstId) =>
  screen.getByRole('region', { name: findingsName(license, id) });
const currentSearch = (router: ReturnType<typeof renderView>['router']) =>
  licenseFindingsSearchParameterSchema.parse(router.state.location.search);
const packageRequests = (license: string) =>
  mocks.packages.mock.calls.filter(
    ([options]) => options.path.license === license
  );
const findingsRequests = (license: string, id = firstId) =>
  mocks.findings.mock.calls.filter(
    ([options]) =>
      options.path.license === license && options.path.identifier === id
  );
// The row of a license in the grid of detected licenses.
const licenseRow = (license: string) =>
  within(screen.getByRole('grid', { name: 'Detected licenses' }))
    .getAllByRole('row')
    .find(
      (row) =>
        within(row).queryAllByRole('gridcell')[0]?.textContent === license
    )!;
// Clicking the package count of a license opens its packages in the details.
const openLicense = async (
  user: ReturnType<typeof renderView>['user'],
  license: string
) => {
  await screen.findByRole('grid', { name: 'Detected licenses' });
  await user.click(within(licenseRow(license)).getAllByRole('gridcell')[1]!);
  return screen.findByRole('region', { name: `Packages for ${license}` });
};
// The button that shows or hides the findings of a package.
const packageToggle = (license: string, id = firstId) =>
  within(
    within(packageRegion(license))
      .getByRole('link', { name: id })
      .closest<HTMLElement>('[role="row"]')!
  ).getByRole('button', { name: /^(Expand|Collapse) row$/ });

beforeAll(() => {
  // The page size selector relies on DOM APIs that jsdom does not implement.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  vi.restoreAllMocks();
});

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
  packages[0]!.purl = 'pkg:maven/com.example/library-0@1.0';
  useUserSettingsStore.setState({
    packageIdType: packageIdTypeSchema.enum.ORT_ID,
  });
  mocks.run.mockResolvedValue({ data: { id: 42, jobs: { scanner: {} } } });
  mocks.licenses.mockImplementation(
    ({ query }: Pick<GetRunDetectedLicensesData, 'query'>) =>
      Promise.resolve(
        pageResponse(
          query?.license
            ? licenses.filter(({ license }) =>
                query.license!.split(',').includes(license)
              )
            : licenses,
          query
        )
      )
  );
  mocks.packages.mockImplementation(
    ({ query }: Pick<GetRunPackagesWithDetectedLicenseData, 'query'>) => {
      const filtered = packages.filter((pkg) => {
        const id = identifierToString(pkg.identifier);
        if (query?.identifierMatchType === 'exact')
          return id === query.identifier;
        if (query?.identifier) return id.includes(query.identifier);
        if (query?.purl) return pkg.purl?.includes(query.purl);
        return true;
      });
      if (query?.sort?.startsWith('-')) filtered.reverse();
      return Promise.resolve(pageResponse(filtered, query));
    }
  );
  mocks.findings.mockImplementation(
    ({
      path,
      query,
    }: Pick<GetRunDetectedLicenseFindingsData, 'path' | 'query'>) =>
      Promise.resolve(
        pageResponse(
          Array.from({ length: 35 }, (_, index) => ({
            path: `${path.license}/${path.identifier}/file-${index}.txt`,
            startLine: 1,
            endLine: 2,
            score: 100,
            scanner: 'ScanCode',
          })),
          query
        )
      )
  );
});

describe('detected-license details', () => {
  it('shows the packages of one license and the findings of its packages', async () => {
    const { user, router } = renderView();
    await openLicense(user, 'MIT');
    expect(currentSearch(router)).toEqual({ licenseTables: { MIT: {} } });

    await user.click(packageToggle('MIT'));
    await user.click(packageToggle('MIT', secondId));
    await screen.findByRole('region', { name: findingsName('MIT', secondId) });
    expect(findingsRegion('MIT')).toBeVisible();
    expect(currentSearch(router)).toEqual({
      licenseTables: { MIT: { packages: { [firstId]: {}, [secondId]: {} } } },
    });

    // Hiding the findings of a package discards their controls.
    await user.click(
      within(findingsRegion('MIT')).getByRole('link', {
        name: 'Go to next page',
      })
    );
    await waitFor(() =>
      expect(
        currentSearch(router).licenseTables?.MIT?.packages?.[firstId]
      ).toEqual({ page: 2 })
    );
    await user.click(packageToggle('MIT'));
    expect(currentSearch(router).licenseTables?.MIT?.packages).toEqual({
      [secondId]: {},
    });
    expect(
      screen.queryByRole('region', { name: findingsName('MIT') })
    ).not.toBeInTheDocument();
  });

  it('shows one license at a time and closes the details', async () => {
    const { user, router } = renderView({
      licenseTables: { MIT: { packages: { [firstId]: {} } } },
    });
    await screen.findByRole('region', { name: findingsName('MIT') });

    await user.click(
      within(licenseRow('Apache-2.0')).getAllByRole('gridcell')[1]!
    );
    await screen.findByRole('region', { name: 'Packages for Apache-2.0' });
    expect(
      screen.queryByRole('region', { name: 'Packages for MIT' })
    ).not.toBeInTheDocument();
    expect(currentSearch(router)).toEqual({
      licenseTables: { 'Apache-2.0': {} },
    });

    await user.click(screen.getByRole('button', { name: 'Close details' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Packages for Apache-2.0' })
      ).not.toBeInTheDocument()
    );
    expect(currentSearch(router)).toEqual({});
  });

  it('links package IDs to their entries in the packages table', async () => {
    const { user } = renderView();
    await openLicense(user, 'MIT');

    const link = await within(packageRegion('MIT')).findByRole('link', {
      name: firstId,
    });
    const target = new URL(link.getAttribute('href')!, 'http://localhost');

    expect(target.pathname).toBe(
      '/organizations/1/products/2/repositories/3/runs/4/packages'
    );
    expect(defaultParseSearch(target.search)).toEqual({
      pkgId: firstId,
      pkgIdType: packageIdTypeSchema.enum.ORT_ID,
      marked: '0',
    });
  });

  it('links a package with an empty PURL by its ORT ID', async () => {
    packages[0]!.purl = '';
    useUserSettingsStore.setState({
      packageIdType: packageIdTypeSchema.enum.PURL,
    });
    const { user } = renderView();
    await openLicense(user, 'MIT');

    const link = await within(packageRegion('MIT')).findByRole('link', {
      name: firstId,
    });
    const target = new URL(link.getAttribute('href')!, 'http://localhost');

    expect(target.pathname).toBe(
      '/organizations/1/products/2/repositories/3/runs/4/packages'
    );
    expect(defaultParseSearch(target.search)).toEqual({
      pkgId: firstId,
      pkgIdType: packageIdTypeSchema.enum.ORT_ID,
      marked: '0',
    });
  });

  it('paginates the findings of each package independently', async () => {
    const { user, router } = renderView({
      licenseTables: {
        MIT: { packages: { [firstId]: {}, [secondId]: {} } },
      },
    });
    await screen.findByRole('region', { name: findingsName('MIT', secondId) });
    await user.click(
      within(findingsRegion('MIT')).getByRole('link', {
        name: 'Go to next page',
      })
    );
    await waitFor(() =>
      expect(findingsRequests('MIT').at(-1)?.[0].query).toEqual({
        limit: 10,
        offset: 10,
      })
    );
    expect(findingsRequests('MIT', secondId)).toHaveLength(1);
    await user.click(
      within(findingsRegion('MIT', secondId)).getByRole('link', {
        name: 'Go to next page',
      })
    );
    await waitFor(() =>
      expect(
        currentSearch(router).licenseTables?.MIT?.packages?.[secondId]
      ).toEqual({ page: 2 })
    );

    await user.click(within(findingsRegion('MIT')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '20' }));
    await waitFor(() =>
      expect(findingsRequests('MIT').at(-1)?.[0].query).toEqual({
        limit: 20,
        offset: 0,
      })
    );
    expect(
      currentSearch(router).licenseTables?.MIT?.packages?.[secondId]
    ).toEqual({ page: 2 });
    expect(packageRequests('MIT')).toHaveLength(1);
  });

  it('keeps package pagination, sorting and filters to the open license', async () => {
    const { user, router } = renderView({
      page: 1,
      licenseTables: { MIT: {} },
    });
    await screen.findByRole('region', { name: 'Packages for MIT' });
    await user.click(
      within(packageRegion('MIT')).getByRole('link', {
        name: 'Go to next page',
      })
    );
    await waitFor(() =>
      expect(packageRequests('MIT').at(-1)?.[0].query.offset).toBe(10)
    );
    await user.click(within(packageRegion('MIT')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '20' }));
    await waitFor(() =>
      expect(packageRequests('MIT').at(-1)?.[0].query).toEqual(
        expect.objectContaining({ limit: 20, offset: 0 })
      )
    );
    const header = () =>
      within(packageRegion('MIT')).getAllByRole('columnheader')[0]!;
    await user.click(
      within(header()).getByRole('link', { name: 'ORT ID, not sorted' })
    );
    await waitFor(() =>
      expect(packageRequests('MIT').at(-1)?.[0].query.sort).toBe('identifier')
    );
    await user.click(
      within(packageRegion('MIT')).getByRole('link', {
        name: 'Go to next page',
      })
    );
    await user.click(within(header()).getByRole('button'));
    await user.type(
      screen.getByPlaceholderText('(case-insensitive substring)'),
      'library-1{Enter}'
    );
    await waitFor(() =>
      expect(packageRequests('MIT').at(-1)?.[0].query).toEqual(
        expect.objectContaining({
          identifier: 'library-1',
          offset: 0,
          limit: 20,
          sort: 'identifier',
        })
      )
    );
    // The licenses stay where they were.
    expect(currentSearch(router).page).toBe(1);
    expect(mocks.licenses.mock.calls.at(-1)?.[0].query.offset).toBe(0);
  });

  it('restores a shared view and follows the browser history', async () => {
    const original = renderView({
      licenseTables: { MIT: { page: 2 } },
    });
    await screen.findByRole('region', { name: 'Packages for MIT' });
    expect(within(packageRegion('MIT')).getByRole('spinbutton')).toHaveValue(2);
    await original.user.click(
      screen.getByRole('button', { name: 'Close details' })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Packages for MIT' })
      ).not.toBeInTheDocument()
    );
    await original.user.click(
      within(licenseRow('Apache-2.0')).getAllByRole('gridcell')[1]!
    );
    await screen.findByRole('region', { name: 'Packages for Apache-2.0' });
    await original.user.click(
      within(packageRegion('Apache-2.0')).getByRole('link', {
        name: 'Go to next page',
      })
    );
    await waitFor(() =>
      expect(currentSearch(original.router).licenseTables).toEqual({
        'Apache-2.0': { page: 2 },
      })
    );
    const shared = currentSearch(original.router);
    await act(async () => {
      original.router.history.back();
    });
    await waitFor(() =>
      expect(currentSearch(original.router).licenseTables).toEqual({
        'Apache-2.0': {},
      })
    );
    original.unmount();

    renderView(shared);
    await screen.findByRole('region', { name: 'Packages for Apache-2.0' });
    expect(
      within(packageRegion('Apache-2.0')).getByRole('spinbutton')
    ).toHaveValue(2);
  });

  it('retains the open license across pages without fetching it off the page', async () => {
    const { user, router, container } = renderView({
      licenseTables: { MIT: {} },
    });
    await screen.findByRole('region', { name: 'Packages for MIT' });
    const licensesPagination = () =>
      within(container).getAllByRole('link', { name: 'Go to next page' })[0]!;
    await user.click(licensesPagination());
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Packages for MIT' })
      ).not.toBeInTheDocument()
    );
    expect(currentSearch(router).licenseTables).toEqual({ MIT: {} });
    expect(packageRequests('MIT')).toHaveLength(1);
    await user.click(screen.getByRole('link', { name: 'Go to previous page' }));
    await screen.findByRole('region', { name: 'Packages for MIT' });
  });

  it('returns to the first page when the license sorting changes', async () => {
    const { user, router } = renderView({ page: 3 });
    await user.click(
      await screen.findByRole('link', { name: 'Detected License, not sorted' })
    );

    await waitFor(() => expect(currentSearch(router).page).toBe(1));
    expect(currentSearch(router).sortBy).toEqual([
      { id: 'license', desc: false },
    ]);
  });
});

describe('detected-license URL compatibility', () => {
  it('normalizes old marker links before requesting exact package and findings data', async () => {
    const { router, user } = renderView({
      marked: 'MIT',
      packageMarked: firstId,
      findingsPage: 2,
    });
    await screen.findByRole('region', { name: findingsName('MIT') });
    expect(packageRequests('MIT')).toHaveLength(1);
    expect(packageRequests('MIT')[0]?.[0].query).toEqual(
      expect.objectContaining({
        identifier: firstId,
        identifierMatchType: 'exact',
      })
    );
    expect(findingsRequests('MIT')[0]?.[0].query).toEqual({
      limit: 10,
      offset: 10,
    });
    expect(currentSearch(router)).toEqual({
      marked: 'MIT',
      licenseTables: {
        MIT: { packageMarked: firstId, packages: { [firstId]: { page: 2 } } },
      },
    });
    await user.click(packageToggle('MIT'));
    expect(currentSearch(router).licenseTables?.MIT).toEqual({});
  });

  it('opens the details from the links of the package details', async () => {
    renderView({
      detectedLicense: ['MIT'],
      marked: 'MIT',
      page: 1,
      licenseTables: {
        MIT: { packageMarked: firstId, packages: { [firstId]: {} } },
      },
    });
    await screen.findByRole('region', { name: findingsName('MIT') });
    expect(mocks.licenses.mock.calls.at(-1)?.[0].query.license).toBe('MIT');
  });

  it('consumes old unscoped controls only for the first opened license', async () => {
    const { user, router } = renderView({
      packagePageSize: 20,
      findingsPage: 3,
    });
    await openLicense(user, 'MIT');
    await user.click(packageToggle('MIT'));
    await screen.findByRole('region', { name: findingsName('MIT') });
    expect(packageRequests('MIT')[0]?.[0].query.limit).toBe(20);
    expect(findingsRequests('MIT')[0]?.[0].query.offset).toBe(20);
    expect(currentSearch(router)).not.toHaveProperty('findingsPage');
    expect(currentSearch(router)).not.toHaveProperty('packagePageSize');
    expect(currentSearch(router).licenseTables?.MIT).not.toHaveProperty(
      'legacyFindings'
    );

    await user.click(
      within(licenseRow('Apache-2.0')).getAllByRole('gridcell')[1]!
    );
    await screen.findByRole('region', { name: 'Packages for Apache-2.0' });
    expect(packageRequests('Apache-2.0')[0]?.[0].query.limit).toBe(10);
  });

  it('uses URL filter semantics despite a different display preference', async () => {
    useUserSettingsStore.setState({
      packageIdType: packageIdTypeSchema.enum.PURL,
    });
    renderView({
      licenseTables: {
        MIT: {
          packageId: 'library-1',
          packageIdType: packageIdTypeSchema.enum.ORT_ID,
        },
      },
    });
    await screen.findByRole('region', { name: 'Packages for MIT' });
    expect(screen.getByText('Filtering by ORT ID: library-1')).toBeVisible();
    const query = packageRequests('MIT')[0]?.[0].query;
    expect(query).toEqual(expect.objectContaining({ identifier: 'library-1' }));
    expect(query?.purl).toBeUndefined();
  });

  it('resets identifier-dependent controls in one update without closing tables', async () => {
    const { router } = renderView({
      licenseTables: {
        MIT: {
          packageId: 'library',
          packageIdType: packageIdTypeSchema.enum.ORT_ID,
          sortBy: [{ id: 'identifier', desc: false }],
          packages: { [firstId]: { page: 2 } },
        },
      },
    });
    await screen.findByRole('region', { name: findingsName('MIT') });
    const historyIndex = router.history.location.state.__TSR_index;
    await act(async () => {
      useUserSettingsStore
        .getState()
        .setPackageIdType(packageIdTypeSchema.enum.PURL);
    });
    await waitFor(() =>
      expect(currentSearch(router).licenseTables).toEqual({
        MIT: { packages: { [firstId]: { page: 2 } } },
      })
    );
    expect(router.history.location.state.__TSR_index).toBe(historyIndex);
    expect(within(findingsRegion('MIT')).getByRole('spinbutton')).toHaveValue(
      2
    );
  });

  it('ignores malformed entries without losing a valid open license', async () => {
    const { router } = renderView({
      licenseTables: { MIT: { page: -2 }, 'Apache-2.0': null },
    });
    await screen.findByRole('region', { name: 'Packages for MIT' });
    expect(currentSearch(router).licenseTables).toEqual({ MIT: {} });
    expect(packageRequests('Apache-2.0')).toHaveLength(0);
  });
});
