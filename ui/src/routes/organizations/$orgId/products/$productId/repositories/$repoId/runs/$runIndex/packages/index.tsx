/*
 * Copyright (C) 2024 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
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
import { createFileRoute } from '@tanstack/react-router';
import { ExpandedState } from '@tanstack/react-table';
import { useState } from 'react';
import z from 'zod';

import { Package } from '@/api';
import {
  getRepositoryRunOptions,
  getRunPackageLicensesOptions,
  getRunPackagesOptions,
} from '@/api/@tanstack/react-query.gen';
import {
  DataTableCards,
  type DataTableCardsDetails,
} from '@/components/data-table-cards/data-table-cards';
import {
  CopyableValue,
  EmptyValue,
} from '@/components/data-table-cards/findings-cells';
import { DependencyPaths } from '@/components/dependency-paths';
import { FindingPanelSection } from '@/components/finding-panel/finding-panel';
import { LicensesList, SpdxExpressionBadgeGroup } from '@/components/licenses';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator';
import { PackageCuration } from '@/components/package-curation';
import { SheetSection } from '@/components/page-header';
import { TimestampWithUTC } from '@/components/timestamp-with-utc';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getIssueSeverityBackgroundColor } from '@/helpers/get-status-class';
import {
  convertToBackendSorting,
  EMPTY_SORTING_STATE,
  updateColumnSorting,
} from '@/helpers/handle-multisort';
import {
  getPackageIdFilter,
  identifierToString,
} from '@/helpers/identifier-conversion';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import type { AppRow } from '@/hooks/use-app-table';
import { getRepositoryTypeLabel } from '@/lib/types';
import {
  declaredLicenseSearchParameterSchema,
  isDirectDependencySearchParameterSchema,
  markedSearchParameterSchema,
  packageIdentifierSearchParameterSchema,
  PackageIdType,
  packageIdTypeSchema,
  paginationSearchParameterSchema,
  sortingSearchParameterSchema,
} from '@/schemas';
import { useUserSettingsStore } from '@/store/user-settings.store';
import {
  DependencyGraphLink,
  PanelFields,
  PanelMono,
  PanelUrl,
} from '../-components/panel-fields';
import { PackageFindings } from './-components/package-findings';

const defaultPageSize = 10;

const columnHelper = createAppColumnHelper<Package>();

const LicenseList = ({ licenses }: { licenses: string[] }) => (
  <div className='flex flex-wrap gap-1'>
    {licenses.map((license) => (
      <SpdxExpressionBadgeGroup key={license} expression={license} />
    ))}
  </div>
);

const getDeclaredLicenses = (pkg: Package) => [
  ...(pkg.processedDeclaredLicense.spdxExpression
    ? [pkg.processedDeclaredLicense.spdxExpression]
    : []),
  ...pkg.processedDeclaredLicense.unmappedLicenses,
];

// The identifier of a package in the format chosen by the user.
const PackageId = ({ pkg }: { pkg: Package }) => {
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const id =
    packageIdType === packageIdTypeSchema.enum.PURL && pkg.purl
      ? pkg.purl
      : identifierToString(pkg.identifier);

  return <CopyableValue value={id} className='font-mono text-xs font-medium' />;
};

// The marks of a curated, metadata-only or modified package.
const PackageFlags = ({ pkg }: { pkg: Package }) => (
  <div className='flex flex-wrap gap-1'>
    {pkg.curations.length > 0 && (
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant='small'
            className={`${getIssueSeverityBackgroundColor('HINT')}`}
          >
            CURATED
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          This package has {pkg.curations.length} metadata curation
          {pkg.curations.length > 1 ? 's' : ''}.
        </TooltipContent>
      </Tooltip>
    )}
    {pkg.isMetadataOnly && (
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant='small'
            className={`${getIssueSeverityBackgroundColor('HINT')}`}
          >
            METADATA ONLY
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          This is a metadata-only package that has no source code associated to
          it.
        </TooltipContent>
      </Tooltip>
    )}
    {pkg.isModified && (
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant='small'
            className={`${getIssueSeverityBackgroundColor('WARNING')}`}
          >
            MODIFIED
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          The package has been modified compared to the original package, e.g.
          in case of a fork of an upstream Open Source project.
        </TooltipContent>
      </Tooltip>
    )}
  </div>
);

type RunParams = {
  orgId: string;
  productId: string;
  repoId: string;
  runIndex: string;
};

const hasArtifact = (artifact: Package['binaryArtifact']) =>
  !!(artifact.url || artifact.hashValue || artifact.hashAlgorithm);

const ArtifactFields = ({
  artifact,
}: {
  artifact: Package['binaryArtifact'];
}) => (
  <PanelFields
    fields={[
      { label: 'URL', value: <PanelUrl url={artifact.url} /> },
      { label: 'Hash', value: <PanelMono value={artifact.hashValue} /> },
      { label: 'Algorithm', value: artifact.hashAlgorithm || null },
    ]}
  />
);

// The details of a package, shown in the panel next to the grid.
const renderDetails = ({
  row,
  packageIdType,
  runId,
  params,
}: {
  row: AppRow<Package>;
  packageIdType: PackageIdType;
  runId: number;
  params: RunParams;
}): DataTableCardsDetails => {
  const pkg = row.original;
  const ortId = identifierToString(pkg.identifier);
  const usesPurl =
    packageIdType === packageIdTypeSchema.enum.PURL && !!pkg.purl;
  const id = usesPurl ? pkg.purl : ortId;
  // The title shows one of the identifiers, the details the other one.
  const alternativeId = usesPurl ? ortId : pkg.purl;
  const hasFlags =
    pkg.curations.length > 0 || pkg.isMetadataOnly || pkg.isModified;
  const vcs = pkg.vcsProcessed;
  const hasVcs = !!(vcs.type || vcs.url || vcs.revision || vcs.path);

  return {
    title: <span className='font-mono text-[0.875rem] break-all'>{id}</span>,
    meta: hasFlags ? <PackageFlags pkg={pkg} /> : undefined,
    content: (
      <>
        {pkg.description && (
          <p className='text-[0.875rem] leading-relaxed wrap-break-word'>
            {pkg.description}
          </p>
        )}
        <FindingPanelSection title='Findings'>
          <PackageFindings pkg={pkg} runId={runId} params={params} />
        </FindingPanelSection>
        <FindingPanelSection
          title='Dependency paths'
          actions={<DependencyGraphLink params={params} searchTerm={id} />}
        >
          {pkg.shortestDependencyPaths.length > 0 ? (
            <DependencyPaths
              pkg={pkg}
              pkgIdType={packageIdType}
              className='flex flex-col gap-2'
            />
          ) : (
            <div className='text-muted-foreground'>
              No dependency paths recorded.
            </div>
          )}
        </FindingPanelSection>
        <FindingPanelSection title='Package'>
          <PanelFields
            fields={[
              {
                label: usesPurl ? 'ORT ID' : 'PURL',
                value: alternativeId ? (
                  <CopyableValue
                    value={alternativeId}
                    className='font-mono text-xs'
                  />
                ) : null,
              },
              {
                label: 'Authors',
                value: pkg.authors.length > 0 ? pkg.authors.join(', ') : null,
              },
              { label: 'Homepage', value: <PanelUrl url={pkg.homepageUrl} /> },
              {
                label: 'Published',
                value: pkg.publishedAt ? (
                  <TimestampWithUTC
                    timestamp={pkg.publishedAt}
                    label='Publishing timestamp'
                  />
                ) : null,
              },
              { label: 'CPE', value: <PanelMono value={pkg.cpe} /> },
              {
                label: 'Source code origins',
                value:
                  pkg.sourceCodeOrigins && pkg.sourceCodeOrigins.length > 0
                    ? pkg.sourceCodeOrigins.join(', ')
                    : null,
              },
            ]}
          />
        </FindingPanelSection>
        <FindingPanelSection title='Licenses'>
          <LicensesList
            runId={runId}
            identifier={pkg.identifier}
            declaredLicenses={getDeclaredLicenses(pkg)}
          />
        </FindingPanelSection>
        <FindingPanelSection
          title={
            hasVcs
              ? `${getRepositoryTypeLabel(vcs.type)} repository`
              : 'Repository'
          }
        >
          {hasVcs ? (
            <PanelFields
              fields={[
                { label: 'URL', value: <PanelUrl url={vcs.url} /> },
                {
                  label: 'Revision',
                  value: <PanelMono value={vcs.revision} />,
                },
                { label: 'Path', value: <PanelMono value={vcs.path} /> },
              ]}
            />
          ) : (
            <EmptyValue />
          )}
        </FindingPanelSection>
        <FindingPanelSection title='Binary artifact'>
          {hasArtifact(pkg.binaryArtifact) ? (
            <ArtifactFields artifact={pkg.binaryArtifact} />
          ) : (
            <EmptyValue />
          )}
        </FindingPanelSection>
        {!pkg.isMetadataOnly && (
          <FindingPanelSection title='Source artifact'>
            {hasArtifact(pkg.sourceArtifact) ? (
              <ArtifactFields artifact={pkg.sourceArtifact} />
            ) : (
              <EmptyValue />
            )}
          </FindingPanelSection>
        )}
        <FindingPanelSection title='Labels'>
          {pkg.labels && Object.keys(pkg.labels).length > 0 ? (
            <PanelFields
              fields={Object.entries(pkg.labels)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => ({ label: key, value: String(value) }))}
            />
          ) : (
            <EmptyValue />
          )}
        </FindingPanelSection>
        {pkg.curations.length > 0 && (
          <FindingPanelSection title={`Curations (${pkg.curations.length})`}>
            <p className='text-muted-foreground mb-2'>
              Curations are shown from highest to lowest priority, where
              higher-priority values take precedence over lower-priority values.
            </p>
            <div className='flex flex-col gap-3'>
              {pkg.curations.map((curation, idx) => (
                <PackageCuration key={idx} curation={curation} />
              ))}
            </div>
          </FindingPanelSection>
        )}
      </>
    ),
  };
};

const PackagesComponent = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : defaultPageSize;
  const packageId = search.pkgId;
  const declaredLicense = search.declaredLicense;
  const isDirectDependency =
    search.isDirectDependency === undefined
      ? undefined
      : search.isDirectDependency === 'true';
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const packageIdFilterType = search.pkgIdType ?? packageIdType;

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
  });

  const { data: totalPackages } = useSuspenseQuery({
    ...getRunPackagesOptions({
      path: { runId: ortRun.id },
      query: { limit: 1 },
    }),
  });

  const { data: declaredLicensesOptions } = useSuspenseQuery({
    ...getRunPackageLicensesOptions({
      path: { runId: ortRun.id },
    }),
  });

  const {
    data: packages,
    isError,
    error,
  } = useSuspenseQuery({
    ...getRunPackagesOptions({
      path: {
        runId: ortRun.id,
      },
      query: {
        limit: pageSize,
        offset: pageIndex * pageSize,
        sort: convertToBackendSorting(search.sortBy),
        ...getPackageIdFilter(packageId, packageIdFilterType),
        declaredLicense: declaredLicense?.join(','),
        isDirectDependency,
      },
    }),
  });

  const columns = columnHelper.columns([
    // The columns of the grid.
    columnHelper.display({
      id: 'package',
      header: 'Package',
      cell: ({ row }) => <PackageId pkg={row.original} />,
    }),
    columnHelper.display({
      id: 'license',
      header: 'Declared license',
      cell: ({ row }) => {
        const licenses = getDeclaredLicenses(row.original);

        return licenses.length > 0 ? (
          <LicenseList licenses={licenses} />
        ) : (
          <EmptyValue />
        );
      },
    }),
    columnHelper.display({
      id: 'flags',
      header: 'Flags',
      cell: ({ row }) => <PackageFlags pkg={row.original} />,
    }),
    columnHelper.display({
      id: 'published',
      header: 'Published',
      cell: ({ row }) =>
        row.original.publishedAt ? (
          <TimestampWithUTC
            timestamp={row.original.publishedAt}
            label='Publishing timestamp'
            className='text-muted-foreground text-[0.8125rem] whitespace-nowrap'
          />
        ) : (
          <EmptyValue />
        ),
    }),
    columnHelper.display({
      id: 'homepage',
      header: 'Homepage',
      cell: ({ row }) =>
        row.original.homepageUrl ? (
          <a
            href={row.original.homepageUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='link block truncate'
            title={row.original.homepageUrl}
          >
            {row.original.homepageUrl}
          </a>
        ) : (
          <EmptyValue />
        ),
    }),
    // All (hidden) columns that are used for filtering/sorting the main column.
    // They don't render any data, but need to retain their accessor logic, and
    // any special sorting and filtering logic.
    columnHelper.accessor(() => search.isDirectDependency, {
      id: 'isDirectDependency',
      header: 'Dependency Type',
      enableSorting: false,
      meta: {
        filter: {
          filterVariant: 'single-select',
          selectOptions: [
            { label: 'Direct', value: 'true' },
            { label: 'Transitive', value: 'false' },
          ],
          setSelected: (value: 'true' | 'false' | undefined) => {
            navigate({
              search: {
                ...search,
                page: 1,
                isDirectDependency: value,
              },
            });
          },
        },
      },
    }),
    columnHelper.accessor(
      (pkg) => {
        if (packageIdType === packageIdTypeSchema.enum.ORT_ID) {
          return identifierToString(pkg.identifier);
        } else {
          return pkg.purl;
        }
      },
      {
        id: `${packageIdType === packageIdTypeSchema.enum.ORT_ID ? 'identifier' : 'purl'}`,
        header: 'Package ID',
        meta: {
          filter: {
            filterVariant: 'text',
            setFilterValue: (value: string | undefined) => {
              navigate({
                search: {
                  ...search,
                  page: 1,
                  pkgId: value,
                  pkgIdType: packageIdType,
                },
              });
            },
          },
        },
      }
    ),
    columnHelper.accessor(
      (row) => {
        return row.processedDeclaredLicense.spdxExpression;
      },
      {
        id: 'processedDeclaredLicense',
        header: 'Declared License',
        meta: {
          filter: {
            filterVariant: 'select',
            align: 'end',
            selectOptions: [
              ...declaredLicensesOptions.processedDeclaredLicenses.map(
                (license) => ({
                  label: license,
                  value: license,
                  group: 'Processed licenses',
                })
              ),
              ...(declaredLicensesOptions.unmappedDeclaredLicenses ?? []).map(
                (license) => ({
                  label: license,
                  value: license,
                  group: 'Unmapped licenses',
                })
              ),
            ],
            setSelected: (licenses: string[]) => {
              navigate({
                search: {
                  ...search,
                  page: 1,
                  declaredLicense: licenses.length === 0 ? undefined : licenses,
                },
              });
            },
          },
        },
      }
    ),
    columnHelper.accessor((pkg) => pkg.publishedAt, {
      id: 'publishedAt',
      header: 'Published',
      enableColumnFilter: false,
    }),
  ]);

  const columnId =
    packageIdType === packageIdTypeSchema.enum.ORT_ID ? 'identifier' : 'purl';

  const [expanded, setExpanded] = useState<ExpandedState>(
    search.marked ? { [search.marked]: true } : {}
  );

  const table = useAppTable(
    {
      data: packages.data,
      columns,
      pageCount: Math.ceil(packages.pagination.totalCount / pageSize),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
        sorting: search.sortBy ?? EMPTY_SORTING_STATE,
        expanded: expanded,
        columnFilters: [
          { id: 'isDirectDependency', value: search.isDirectDependency },
          { id: columnId, value: packageId },
          { id: 'processedDeclaredLicense', value: declaredLicense },
        ],
        // Always hide the columns that are used for filtering/sorting only.
        columnVisibility: {
          isDirectDependency: false,
          [columnId]: false,
          processedDeclaredLicense: false,
          publishedAt: false,
        },
      },
      onExpandedChange: setExpanded,
      getRowCanExpand: () => true,
      manualPagination: true,
    },
    selectNoTableState
  );

  if (isError) {
    return <LoadError error={error} />;
  }
  const filtersInUse =
    totalPackages.pagination.totalCount !== packages.pagination.totalCount;
  const intro =
    'This view shows the flat set of de-duplicated packages discovered for all projects.';
  const matching = `, ${packages.pagination.totalCount} matching filters`;

  return (
    <SheetSection
      title='Packages'
      meta={`${totalPackages.pagination.totalCount} in total${filtersInUse ? matching : ''}`}
    >
      <p
        className='text-muted-foreground -mt-2 text-[0.8125rem] max-md:line-clamp-1'
        title={intro}
      >
        {intro}
      </p>
      <DataTableCards
        onClearFilters={() =>
          navigate({
            search: {
              ...search,
              page: 1,
              isDirectDependency: undefined,
              pkgId: undefined,
              declaredLicense: undefined,
            },
          })
        }
        table={table}
        aria-label='Packages'
        layout={[
          {
            id: 'package',
            width: 'minmax(0,2.4fr)',
            sortBy: columnId,
            filters: [columnId, 'isDirectDependency'],
            mobile: 'main',
          },
          {
            id: 'license',
            width: 'minmax(0,1.4fr)',
            sortBy: 'processedDeclaredLicense',
            filters: ['processedDeclaredLicense'],
            mobile: 'sub',
          },
          { id: 'flags', width: 'max-content', mobile: 'end' },
          {
            id: 'published',
            width: 'max-content',
            sortBy: 'publishedAt',
            mobile: 'hidden',
            withDetails: false,
          },
          {
            id: 'homepage',
            width: 'minmax(0,1.2fr)',
            mobile: 'hidden',
            withDetails: false,
          },
        ]}
        setMarkedOptions={(marked) => ({
          to: Route.to,
          search: {
            ...search,
            marked: marked === '' ? undefined : marked,
          },
        })}
        renderDetails={({ row }) =>
          renderDetails({ row, packageIdType, runId: ortRun.id, params })
        }
        setCurrentPageOptions={(currentPage) => {
          return {
            to: Route.to,
            search: { ...search, page: currentPage },
          };
        }}
        setPageSizeOptions={(size) => {
          return {
            to: Route.to,
            search: { ...search, page: 1, pageSize: size },
          };
        }}
        setSortingOptions={(sortBy) => {
          return {
            to: Route.to,
            search: {
              ...search,
              page: 1,
              sortBy: updateColumnSorting(search.sortBy, sortBy),
            },
          };
        }}
      />
    </SheetSection>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages/'
)({
  validateSearch: z.object({
    ...paginationSearchParameterSchema.shape,
    ...sortingSearchParameterSchema.shape,
    ...packageIdentifierSearchParameterSchema.shape,
    ...declaredLicenseSearchParameterSchema.shape,
    ...isDirectDependencySearchParameterSchema.shape,
    ...markedSearchParameterSchema.shape,
  }),
  component: PackagesComponent,
  pendingComponent: LoadingIndicator,
});
