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

import { useQuery } from '@tanstack/react-query';
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';

import { DetectedLicense, PackageIdentifier } from '@/api';
import { getRunPackagesWithDetectedLicenseOptions } from '@/api/@tanstack/react-query.gen';
import { DataTableCards } from '@/components/data-table-cards/data-table-cards';
import { CopyableValue } from '@/components/data-table-cards/findings-cells';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  convertToBackendSorting,
  EMPTY_SORTING_STATE,
  updateColumnSorting,
} from '@/helpers/handle-multisort';
import { identifierToString } from '@/helpers/identifier-conversion';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import { KEEP_SCROLL_POSITION } from '@/lib/scroll';
import {
  licensePackagesTableStateSchema,
  packageIdTypeSchema,
  type PackageIdType,
} from '@/schemas';
import { useUserSettingsStore } from '@/store/user-settings.store';
import { DetectedLicenseFindingsTable } from './detected-license-findings-table';
import {
  getLicensePackagesExpandedState,
  getLicensePackagesQueryFilter,
  getLicensePackagesTableState,
  getLicenseTablePagination,
  toggleLicensePackageTable,
  updateLicensePackagesTable,
} from './license-findings-state';

const packageColumnHelper = createAppColumnHelper<PackageIdentifier>();
const licenseFindingsRoutePath =
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/license-findings/';

const PackageIdCell = ({
  pkg,
  packageIdType,
}: {
  pkg: PackageIdentifier;
  packageIdType: PackageIdType;
}) => {
  const params = useParams({ from: licenseFindingsRoutePath });
  const purl =
    packageIdType === packageIdTypeSchema.enum.PURL && pkg.purl
      ? pkg.purl
      : undefined;
  const id = purl ?? identifierToString(pkg.identifier);
  const idType = purl
    ? packageIdTypeSchema.enum.PURL
    : packageIdTypeSchema.enum.ORT_ID;

  return (
    <CopyableValue value={id} className='font-mono text-xs'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            className='link break-all whitespace-normal'
            to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages'
            params={params}
            search={{ pkgId: id, pkgIdType: idType, marked: '0' }}
          >
            {id}
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          Inspect the package details in packages table
        </TooltipContent>
      </Tooltip>
    </CopyableValue>
  );
};

type DetectedLicensePackagesTableProps = {
  license: DetectedLicense;
  runId: number;
};

/**
 * The packages with a detected license, each of which shows the findings of
 * the license in the package when it is expanded.
 */
export const DetectedLicensePackagesTable = ({
  license: detectedLicense,
  runId,
}: DetectedLicensePackagesTableProps) => {
  const search = useSearch({ from: licenseFindingsRoutePath });
  const navigate = useNavigate({ from: licenseFindingsRoutePath });
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const license = detectedLicense.license;
  const tableState = getLicensePackagesTableState(search, license);
  const { pageIndex: packagePageIndex, pageSize: packagePageSize } =
    getLicenseTablePagination(tableState);
  const packageIdFilter = tableState.packageId;
  const packageSortBy = tableState.sortBy;
  const packageColumnId =
    packageIdType === packageIdTypeSchema.enum.PURL ? 'purl' : 'identifier';
  const packageColumnLabel =
    packageIdType === packageIdTypeSchema.enum.PURL ? 'PURL' : 'ORT ID';

  const {
    data: packages,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getRunPackagesWithDetectedLicenseOptions({
      path: {
        runId,
        license,
      },
      query: {
        limit: packagePageSize,
        offset: packagePageIndex * packagePageSize,
        sort: convertToBackendSorting(packageSortBy),
        ...getLicensePackagesQueryFilter(tableState),
      },
    }),
  });

  const packageColumns = packageColumnHelper.columns([
    packageColumnHelper.display({
      id: 'package',
      header: packageColumnLabel,
      cell: ({ row }) => (
        <PackageIdCell pkg={row.original} packageIdType={packageIdType} />
      ),
    }),
    packageColumnHelper.accessor(
      (pkg) =>
        packageIdType === packageIdTypeSchema.enum.PURL && pkg.purl
          ? pkg.purl
          : identifierToString(pkg.identifier),
      {
        id: packageColumnId,
        header: packageColumnLabel,
        meta: {
          filter: {
            filterVariant: 'text',
            setFilterValue: (value: string | undefined) => {
              navigate({
                search: (previous) =>
                  updateLicensePackagesTable(previous, license, {
                    packageId: value,
                    packageIdType,
                  }),
                ...KEEP_SCROLL_POSITION,
              });
            },
          },
        },
      }
    ),
  ]);

  const packageTable = useAppTable(
    {
      data: packages?.data || [],
      columns: packageColumns,
      pageCount: Math.ceil(
        (packages?.pagination.totalCount ?? 0) / packagePageSize
      ),
      state: {
        pagination: {
          pageIndex: packagePageIndex,
          pageSize: packagePageSize,
        },
        sorting: packageSortBy ?? EMPTY_SORTING_STATE,
        expanded: getLicensePackagesExpandedState(search, license),
        columnFilters: [{ id: packageColumnId, value: packageIdFilter }],
        columnVisibility: { [packageColumnId]: false },
      },
      getRowCanExpand: () => true,
      getRowId: (row) => identifierToString(row.identifier),
      manualPagination: true,
    },
    selectNoTableState
  );

  if (isPending) {
    return <LoadingIndicator />;
  }

  if (isError) {
    return <LoadError error={error} />;
  }

  const filtersInUse =
    detectedLicense.packageCount !== packages.pagination.totalCount;
  const matching = `, ${packages.pagination.totalCount} matching filters`;

  return (
    <section
      aria-label={`Packages for ${license}`}
      className='flex flex-col gap-3'
    >
      <div className='text-muted-foreground text-[0.8125rem]'>
        Packages with this detected license ({detectedLicense.packageCount} in
        total
        {filtersInUse && matching}). Expand a package to see where the license
        was found.
      </div>
      {packageIdFilter && tableState.packageIdType !== packageIdType && (
        <div className='text-muted-foreground text-[0.8125rem]'>
          Filtering by{' '}
          {tableState.packageIdType === packageIdTypeSchema.enum.PURL
            ? 'PURL'
            : 'ORT ID'}
          : {packageIdFilter}
        </div>
      )}
      <DataTableCards
        table={packageTable}
        aria-label={`Packages for ${license}`}
        globalShortcuts={false}
        layout={[
          {
            id: 'package',
            width: 'minmax(0,1fr)',
            sortBy: packageColumnId,
            filters: [packageColumnId],
            mobile: 'main',
          },
        ]}
        onClearFilters={() =>
          navigate({
            search: (previous) =>
              updateLicensePackagesTable(previous, license, {
                packageId: undefined,
                packageIdType,
              }),
            ...KEEP_SCROLL_POSITION,
          })
        }
        onToggleExpanded={(packageRow) => {
          navigate({
            search: (previous) =>
              toggleLicensePackageTable(previous, license, packageRow.id),
            ...KEEP_SCROLL_POSITION,
          });
        }}
        renderSubComponent={({ row: packageRow }) => (
          <DetectedLicenseFindingsTable
            runId={runId}
            license={license}
            identifier={identifierToString(packageRow.original.identifier)}
            purl={packageRow.original.purl ?? undefined}
          />
        )}
        setCurrentPageOptions={(currentPage) => {
          return {
            to: '.',
            search: (previous) =>
              updateLicensePackagesTable(previous, license, {
                page: currentPage,
              }),
            ...KEEP_SCROLL_POSITION,
          };
        }}
        setPageSizeOptions={(size) => {
          return {
            to: '.',
            search: (previous) =>
              updateLicensePackagesTable(previous, license, { pageSize: size }),
            ...KEEP_SCROLL_POSITION,
          };
        }}
        setSortingOptions={(sortBy) => {
          return {
            to: '.',
            search: (previous) =>
              updateLicensePackagesTable(previous, license, {
                sortBy: licensePackagesTableStateSchema.shape.sortBy.parse(
                  updateColumnSorting(
                    getLicensePackagesTableState(previous, license).sortBy,
                    sortBy
                  )
                ),
              }),
            ...KEEP_SCROLL_POSITION,
          };
        }}
      />
    </section>
  );
};
