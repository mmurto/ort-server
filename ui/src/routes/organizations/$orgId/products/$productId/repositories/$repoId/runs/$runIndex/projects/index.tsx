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

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ExpandedState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import z from 'zod';

import { Project } from '@/api';
import {
  getRepositoryRunOptions,
  getRunProjectLicensesOptions,
  getRunProjectsOptions,
} from '@/api/@tanstack/react-query.gen';
import {
  DataTableCards,
  type DataTableCardsDetails,
} from '@/components/data-table-cards/data-table-cards';
import {
  CopyableValue,
  EmptyValue,
} from '@/components/data-table-cards/findings-cells';
import { FindingPanelSection } from '@/components/finding-panel/finding-panel';
import { LicensesList, SpdxExpressionBadgeGroup } from '@/components/licenses';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
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
import type { AppRow } from '@/hooks/use-app-table';
import { routePrefetchStaleTime } from '@/lib/query-client';
import { getRepositoryTypeLabel } from '@/lib/types';
import {
  declaredLicenseSearchParameterSchema,
  definitionFilePathSearchParameterSchema,
  markedSearchParameterSchema,
  paginationSearchParameterSchema,
  projectIdentifierSearchParameterSchema,
  sortingSearchParameterSchema,
} from '@/schemas';
import {
  DependencyGraphLink,
  PanelFields,
  PanelMono,
  PanelUrl,
} from '../-components/panel-fields';

const defaultPageSize = 10;

const supportedSortColumns = new Set([
  'identifier',
  'declaredLicense',
  'definitionFilePath',
]);

const columnHelper = createAppColumnHelper<Project>();

const LicenseList = ({ licenses }: { licenses: string[] }) => (
  <div className='flex flex-wrap gap-1'>
    {licenses.map((license) => (
      <SpdxExpressionBadgeGroup key={license} expression={license} />
    ))}
  </div>
);

type RunParams = {
  orgId: string;
  productId: string;
  repoId: string;
  runIndex: string;
};

// The details of a project, shown in the panel next to the grid.
const renderDetails = ({
  row,
  runId,
  params,
}: {
  row: AppRow<Project>;
  runId: number;
  params: RunParams;
}): DataTableCardsDetails => {
  const project = row.original;
  const id = identifierToString(project.identifier);
  const declaredLicense = project.processedDeclaredLicense;
  const mappedLicenses = Object.entries(declaredLicense.mappedLicenses).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  return {
    title: <span className='font-mono text-[0.875rem] break-all'>{id}</span>,
    meta: (
      <span className='text-muted-foreground'>
        {project.identifier.type}
        {project.definitionFilePath && (
          <>
            {' · '}
            <span className='font-mono text-xs'>
              {project.definitionFilePath}
            </span>
          </>
        )}
      </span>
    ),
    content: (
      <>
        {project.description && (
          <p className='text-[0.875rem] leading-relaxed wrap-break-word'>
            {project.description}
          </p>
        )}
        <FindingPanelSection
          title='Project'
          actions={<DependencyGraphLink params={params} searchTerm={id} />}
        >
          <PanelFields
            fields={[
              {
                label: 'ID',
                value: (
                  <CopyableValue value={id} className='font-mono text-xs' />
                ),
              },
              {
                label: 'Definition file',
                value: <PanelMono value={project.definitionFilePath} />,
              },
              {
                label: 'Authors',
                value:
                  project.authors.length > 0
                    ? project.authors.join(', ')
                    : null,
              },
              {
                label: 'Homepage',
                value: <PanelUrl url={project.homepageUrl} />,
              },
              { label: 'CPE', value: <PanelMono value={project.cpe} /> },
            ]}
          />
        </FindingPanelSection>
        <FindingPanelSection title='Licenses'>
          <LicensesList
            runId={runId}
            identifier={project.identifier}
            declaredLicenses={[
              ...(declaredLicense.spdxExpression
                ? [declaredLicense.spdxExpression]
                : []),
              ...declaredLicense.unmappedLicenses,
            ]}
          />
        </FindingPanelSection>
        <FindingPanelSection title='Processed declared license'>
          <PanelFields
            fields={[
              {
                label: 'SPDX expression',
                value: declaredLicense.spdxExpression ? (
                  <SpdxExpressionBadgeGroup
                    expression={declaredLicense.spdxExpression}
                  />
                ) : null,
              },
              {
                label: 'Mapped licenses',
                value:
                  mappedLicenses.length > 0 ? (
                    <ul className='flex flex-col gap-0.5'>
                      {mappedLicenses.map(([from, to]) => (
                        <li key={from} className='wrap-break-word'>
                          {from}
                          <span className='text-muted-foreground'> → </span>
                          {to}
                        </li>
                      ))}
                    </ul>
                  ) : null,
              },
              {
                label: 'Unmapped licenses',
                value:
                  declaredLicense.unmappedLicenses.length > 0 ? (
                    <LicenseList licenses={declaredLicense.unmappedLicenses} />
                  ) : null,
              },
            ]}
          />
        </FindingPanelSection>
        <FindingPanelSection
          title={`${getRepositoryTypeLabel(project.vcsProcessed.type)} repository`}
        >
          <PanelFields
            fields={[
              {
                label: 'URL',
                value: <PanelUrl url={project.vcsProcessed.url} />,
              },
              {
                label: 'Revision',
                value: <PanelMono value={project.vcsProcessed.revision} />,
              },
              {
                label: 'Path',
                value: <PanelMono value={project.vcsProcessed.path} />,
              },
            ]}
          />
        </FindingPanelSection>
        <FindingPanelSection title='Scopes'>
          {project.scopeNames.length > 0 ? (
            <ul className='flex flex-col gap-0.5 font-mono text-xs'>
              {[...project.scopeNames].sort().map((scope) => (
                <li key={scope}>{scope}</li>
              ))}
            </ul>
          ) : (
            <EmptyValue />
          )}
        </FindingPanelSection>
      </>
    ),
  };
};

const ProjectsComponent = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : defaultPageSize;
  const projectIdentifier = search.projectId ? search.projectId : undefined;

  const definitionFilePath = search.definitionFilePath
    ? search.definitionFilePath
    : undefined;

  const declaredLicense = search.declaredLicense
    ? search.declaredLicense
    : undefined;

  const columnFilters = [];
  if (projectIdentifier) {
    columnFilters.push({ id: 'identifier', value: projectIdentifier });
  }
  if (definitionFilePath) {
    columnFilters.push({ id: 'definitionFilePath', value: definitionFilePath });
  }
  if (declaredLicense) {
    columnFilters.push({ id: 'declaredLicense', value: declaredLicense });
  }

  // The sorting is used again after the queries below. React Compiler does
  // not memoize it on its own there, so without `useMemo` it would be a new
  // array on every render.
  const sortBy = useMemo(
    () =>
      search.sortBy?.filter((sort) => supportedSortColumns.has(sort.id)) ??
      EMPTY_SORTING_STATE,
    [search.sortBy]
  );

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
  });

  const {
    data: totalProjects,
    isPending: totalIsPending,
    isError: totalIsError,
    error: totalError,
  } = useQuery({
    ...getRunProjectsOptions({
      path: { runId: ortRun.id },
      query: { limit: 1 },
    }),
  });

  const {
    data: declaredLicenseOptions,
    isPending: licensesIsPending,
    isError: licensesIsError,
    error: licensesError,
  } = useQuery({
    ...getRunProjectLicensesOptions({
      path: { runId: ortRun.id },
    }),
    staleTime: routePrefetchStaleTime,
  });

  const {
    data: projects,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getRunProjectsOptions({
      path: { runId: ortRun.id },
      query: {
        limit: pageSize,
        offset: pageIndex * pageSize,
        sort: convertToBackendSorting(sortBy),
        identifier: projectIdentifier,
        declaredLicense: declaredLicense?.join(','),
        definitionFilePath,
      },
    }),
    staleTime: routePrefetchStaleTime,
  });

  const columns = columnHelper.columns([
    columnHelper.display({
      id: 'project',
      header: 'Project',
      cell: ({ row }) => {
        const id = identifierToString(row.original.identifier);

        return (
          <div className='truncate font-mono text-xs font-medium' title={id}>
            {id}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'definitionFile',
      header: 'Definition file',
      cell: ({ row }) =>
        row.original.definitionFilePath ? (
          <div
            className='truncate font-mono text-xs'
            title={row.original.definitionFilePath}
          >
            {row.original.definitionFilePath}
          </div>
        ) : (
          <EmptyValue />
        ),
    }),
    columnHelper.display({
      id: 'license',
      header: 'Declared license',
      cell: ({ row }) => {
        const declaredLicenses = [
          ...(row.original.processedDeclaredLicense.spdxExpression
            ? [row.original.processedDeclaredLicense.spdxExpression]
            : []),
          ...row.original.processedDeclaredLicense.unmappedLicenses,
        ];

        return declaredLicenses.length > 0 ? (
          <LicenseList licenses={declaredLicenses} />
        ) : (
          <EmptyValue />
        );
      },
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
    columnHelper.accessor(
      (project) => {
        return identifierToString(project.identifier);
      },
      {
        id: 'identifier',
        header: 'Project ID',
        meta: {
          filter: {
            filterVariant: 'text',
            setFilterValue: (value: string | undefined) => {
              navigate({
                search: { ...search, page: 1, projectId: value },
              });
            },
          },
        },
      }
    ),
    columnHelper.accessor('processedDeclaredLicense', {
      id: 'declaredLicense',
      header: 'Declared License',
      meta: {
        filter: {
          filterVariant: 'select',
          selectOptions: [
            ...(declaredLicenseOptions?.processedDeclaredLicenses ?? []).map(
              (license) => ({
                label: license,
                value: license,
                group: 'Processed licenses',
              })
            ),
            ...(declaredLicenseOptions?.unmappedDeclaredLicenses ?? []).map(
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
          align: 'end',
        },
      },
    }),
    columnHelper.accessor('definitionFilePath', {
      id: 'definitionFilePath',
      header: 'Definition File',
      meta: {
        filter: {
          filterVariant: 'text',
          setFilterValue: (value: string | undefined) => {
            navigate({
              search: { ...search, page: 1, definitionFilePath: value },
            });
          },
        },
      },
    }),
  ]);

  const [expanded, setExpanded] = useState<ExpandedState>(
    search.marked ? { [search.marked]: true } : {}
  );

  const table = useAppTable(
    {
      data: projects?.data || [],
      columns,
      pageCount: Math.ceil((projects?.pagination.totalCount ?? 0) / pageSize),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
        columnFilters,
        columnVisibility: {
          identifier: false,
          declaredLicense: false,
          definitionFilePath: false,
        },
        sorting: sortBy,
        expanded: expanded,
      },
      onExpandedChange: setExpanded,
      getRowCanExpand: () => true,
      manualFiltering: true,
      manualPagination: true,
      manualSorting: true,
      getRowId: (row) => identifierToString(row.identifier),
    },
    selectNoTableState
  );

  if (isPending || totalIsPending || licensesIsPending) {
    return <LoadingIndicator />;
  }

  if (isError || totalIsError || licensesIsError) {
    return <LoadError error={error || totalError || licensesError} />;
  }

  const filtersInUse = columnFilters.length > 0;
  const matching = `, ${projects.pagination.totalCount} matching filters`;

  return (
    <SheetSection
      title='Projects'
      meta={`${totalProjects.pagination.totalCount} in total${filtersInUse ? matching : ''}`}
    >
      <p className='text-muted-foreground -mt-2 text-[0.8125rem] max-md:line-clamp-1'>
        This view shows all projects.
      </p>
      <DataTableCards
        onClearFilters={() =>
          navigate({
            search: {
              ...search,
              page: 1,
              projectId: undefined,
              definitionFilePath: undefined,
              declaredLicense: undefined,
            },
          })
        }
        table={table}
        aria-label='Projects'
        layout={[
          {
            id: 'project',
            width: 'minmax(0,2fr)',
            sortBy: 'identifier',
            filters: ['identifier'],
            mobile: 'main',
          },
          {
            id: 'definitionFile',
            width: 'minmax(0,1.6fr)',
            sortBy: 'definitionFilePath',
            filters: ['definitionFilePath'],
            mobile: 'sub',
          },
          {
            id: 'license',
            width: 'minmax(0,1.2fr)',
            sortBy: 'declaredLicense',
            filters: ['declaredLicense'],
            mobile: 'hidden',
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
            // If no items are marked for inspection, remove the "marked"
            // parameter from search parameters.
            marked: marked === '' ? undefined : marked,
          },
        })}
        renderDetails={({ row }) =>
          renderDetails({ row, runId: ortRun.id, params })
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
              sortBy: updateColumnSorting(
                search.sortBy?.filter((sort) =>
                  supportedSortColumns.has(sort.id)
                ),
                sortBy
              ),
            },
          };
        }}
      />
    </SheetSection>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/projects/'
)({
  validateSearch: z.object({
    ...declaredLicenseSearchParameterSchema.shape,
    ...definitionFilePathSearchParameterSchema.shape,
    ...paginationSearchParameterSchema.shape,
    ...projectIdentifierSearchParameterSchema.shape,
    ...sortingSearchParameterSchema.shape,
    ...markedSearchParameterSchema.shape,
  }),
  loader: async ({ context: { queryClient }, params }) => {
    const ortRun = await queryClient.ensureQueryData({
      ...getRepositoryRunOptions({
        path: {
          repositoryId: Number.parseInt(params.repoId),
          ortRunIndex: Number.parseInt(params.runIndex),
        },
      }),
    });

    await Promise.all([
      queryClient.prefetchQuery({
        ...getRunProjectsOptions({
          path: { runId: ortRun.id },
          query: { limit: defaultPageSize, offset: 0 },
        }),
        staleTime: routePrefetchStaleTime,
      }),
      queryClient.prefetchQuery({
        ...getRunProjectLicensesOptions({
          path: { runId: ortRun.id },
        }),
        staleTime: routePrefetchStaleTime,
      }),
    ]);
  },
  component: ProjectsComponent,
  pendingComponent: LoadingIndicator,
});
