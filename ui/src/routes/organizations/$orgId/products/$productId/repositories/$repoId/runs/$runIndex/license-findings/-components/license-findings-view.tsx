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

import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { DetectedLicense } from '@/api';
import {
  getRepositoryRunOptions,
  getRunDetectedLicensesInfiniteOptions,
  getRunDetectedLicensesOptions,
} from '@/api/@tanstack/react-query.gen';
import {
  DataTableCards,
  type DataTableCardsDetails,
} from '@/components/data-table-cards/data-table-cards';
import { DEFAULT_PAGE_SIZE } from '@/components/data-table/data-table';
import { SpdxExpressionBadgeGroup } from '@/components/licenses';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
import {
  convertToBackendSorting,
  EMPTY_SORTING_STATE,
  updateColumnSorting,
} from '@/helpers/handle-multisort';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import type { AppRow } from '@/hooks/use-app-table';
import { useDebounce } from '@/hooks/use-debounce';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { DROPDOWN_PAGE_SIZE } from '@/lib/constants';
import { useUserSettingsStore } from '@/store/user-settings.store';
import { DetectedLicensePackagesTable } from './detected-license-packages-table';
import {
  clearDetectedLicenseMarkers,
  getDetectedLicenseQueryFilter,
  getOpenLicense,
  normalizeLicenseFindingsSearch,
  openLicenseTable,
  resetLicensePackageIdentifierControls,
} from './license-findings-state';

const licenseColumnHelper = createAppColumnHelper<DetectedLicense>();
const packagesCount = (count: number) =>
  `${count} package${count === 1 ? '' : 's'}`;
const licenseFindingsRoutePath =
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/license-findings/';

export const LicenseFindingsView = () => {
  const params = useParams({ from: licenseFindingsRoutePath });
  const search = useSearch({ from: licenseFindingsRoutePath });
  const navigate = useNavigate({ from: licenseFindingsRoutePath });
  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;
  const detectedLicenses = search.detectedLicense;
  const detectedLicenseFilter =
    detectedLicenses && detectedLicenses.length > 0
      ? detectedLicenses.join(',')
      : undefined;
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const previousPackageIdType = useRef(packageIdType);
  const normalizedSearch = normalizeLicenseFindingsSearch(
    search,
    packageIdType
  );
  const needsNormalization =
    JSON.stringify(normalizedSearch) !== JSON.stringify(search);
  const [licenseFilterOpen, setLicenseFilterOpen] = useState(false);
  const [licenseSearchTerm, setLicenseSearchTerm] = useState('');
  const debouncedLicenseSearchTerm = useDebounce(licenseSearchTerm, 300).trim();

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
  });

  const detectedLicenseOptions = useInfiniteList(
    getRunDetectedLicensesInfiniteOptions({
      path: { runId: ortRun.id },
      query: {
        limit: DROPDOWN_PAGE_SIZE,
        licenseSearch: debouncedLicenseSearchTerm || undefined,
      },
    }),
    { enabled: licenseFilterOpen }
  );
  const licenseFilterOptions = {
    ...detectedLicenseOptions,
    items: detectedLicenseOptions.items.map(({ license }) => ({
      label: license,
      value: license,
    })),
  };

  const { data: totalDetectedLicenses } = useSuspenseQuery({
    ...getRunDetectedLicensesOptions({
      path: { runId: ortRun.id },
      query: { limit: 1 },
    }),
  });

  const {
    data: detectedLicenseFindings,
    isError,
    error,
  } = useSuspenseQuery({
    ...getRunDetectedLicensesOptions({
      path: { runId: ortRun.id },
      query: {
        limit: pageSize,
        offset: pageIndex * pageSize,
        sort: convertToBackendSorting(search.sortBy),
        ...getDetectedLicenseQueryFilter(search.marked, detectedLicenseFilter),
      },
    }),
  });

  const columns = licenseColumnHelper.columns([
    licenseColumnHelper.accessor('license', {
      id: 'license',
      header: 'Detected License',
      cell: ({ row }) => (
        <SpdxExpressionBadgeGroup expression={row.original.license} />
      ),
      meta: {
        filter: {
          filterVariant: 'infinite-select',
          align: 'end',
          selectOptions: licenseFilterOptions,
          getSelectedOption: (license: string) => ({
            label: license,
            value: license,
          }),
          open: licenseFilterOpen,
          onOpenChange: setLicenseFilterOpen,
          searchTerm: licenseSearchTerm,
          onSearchTermChange: setLicenseSearchTerm,
          setSelected: (licenses: string[]) => {
            navigate({
              search: (previous) =>
                clearDetectedLicenseMarkers({
                  ...previous,
                  page: 1,
                  detectedLicense: licenses.length === 0 ? undefined : licenses,
                }),
            });
          },
        },
      },
    }),
    licenseColumnHelper.accessor('packageCount', {
      id: 'packageCount',
      header: 'Package Count',
      cell: ({ row }) => (
        <span className='text-muted-foreground whitespace-nowrap tabular-nums'>
          {packagesCount(row.original.packageCount)}
        </span>
      ),
    }),
  ]);

  // The packages of one license are shown next to the licenses.
  const openLicense = getOpenLicense(
    search,
    detectedLicenseFindings.data.map(({ license }) => license)
  );

  const table = useAppTable(
    {
      data: detectedLicenseFindings.data,
      columns,
      pageCount: Math.ceil(
        detectedLicenseFindings.pagination.totalCount / pageSize
      ),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
        sorting: search.sortBy ?? EMPTY_SORTING_STATE,
        expanded: openLicense ? { [openLicense]: true } : {},
        columnFilters: [{ id: 'license', value: detectedLicenses }],
      },
      getRowCanExpand: () => true,
      getRowId: (row) => row.license,
      manualPagination: true,
    },
    selectNoTableState
  );

  useEffect(() => {
    const identifierTypeChanged =
      previousPackageIdType.current !== packageIdType;
    previousPackageIdType.current = packageIdType;
    if (!needsNormalization && !identifierTypeChanged) return;

    navigate({
      search: (previous) => {
        const normalized = normalizeLicenseFindingsSearch(
          previous,
          packageIdType
        );
        return identifierTypeChanged
          ? resetLicensePackageIdentifierControls(normalized)
          : normalized;
      },
      replace: true,
    });
  }, [navigate, packageIdType, needsNormalization, search]);

  // Resolve old links before mounting nested tables with their scoped query inputs.
  if (needsNormalization) return <LoadingIndicator />;

  if (isError) {
    return <LoadError error={error} />;
  }

  const renderDetails = ({
    row,
  }: {
    row: AppRow<DetectedLicense>;
  }): DataTableCardsDetails => ({
    title: <SpdxExpressionBadgeGroup expression={row.original.license} />,
    meta: (
      <span className='text-muted-foreground tabular-nums'>
        {packagesCount(row.original.packageCount)}
      </span>
    ),
    content: (
      <DetectedLicensePackagesTable license={row.original} runId={ortRun.id} />
    ),
  });

  const filtersInUse =
    totalDetectedLicenses.pagination.totalCount !==
    detectedLicenseFindings.pagination.totalCount;
  const matching = `, ${detectedLicenseFindings.pagination.totalCount} matching filters`;
  const scannerWasIncludedInRun = ortRun.jobs.scanner != null;
  const noResultsContent = !scannerWasIncludedInRun ? (
    <div className='text-muted-foreground text-[0.8125rem]'>
      No detected licenses are available because the scanner job was not enabled
      for this run.
    </div>
  ) : undefined;

  return (
    <SheetSection
      title='Detected licenses'
      meta={`${totalDetectedLicenses.pagination.totalCount} in total${filtersInUse ? matching : ''}`}
    >
      <p className='text-muted-foreground -mt-2 text-[0.8125rem]'>
        Licenses as detected in projects and packages by the configured
        scanners.
      </p>
      <DataTableCards
        table={table}
        aria-label='Detected licenses'
        layout={[
          {
            id: 'license',
            width: 'minmax(0,1fr)',
            sortBy: 'license',
            filters: ['license'],
            mobile: 'main',
          },
          {
            id: 'packageCount',
            width: 'max-content',
            sortBy: 'packageCount',
            mobile: 'end',
          },
        ]}
        noResultsContent={noResultsContent}
        onClearFilters={() =>
          navigate({
            search: (previous) =>
              clearDetectedLicenseMarkers({
                ...previous,
                page: 1,
                detectedLicense: undefined,
              }),
          })
        }
        setMarkedOptions={(license) => ({
          to: '.',
          search: (previous) =>
            openLicenseTable(previous, license || undefined, packageIdType),
        })}
        renderDetails={renderDetails}
        setCurrentPageOptions={(currentPage) => {
          return {
            to: '.',
            search: (previous) =>
              clearDetectedLicenseMarkers({
                ...previous,
                page: currentPage,
              }),
          };
        }}
        setPageSizeOptions={(size) => {
          return {
            to: '.',
            search: (previous) =>
              clearDetectedLicenseMarkers({
                ...previous,
                page: 1,
                pageSize: size,
              }),
          };
        }}
        setSortingOptions={(sortBy) => {
          return {
            to: '.',
            search: (previous) => ({
              ...previous,
              page: 1,
              sortBy: updateColumnSorting(previous.sortBy, sortBy),
            }),
          };
        }}
      />
    </SheetSection>
  );
};
