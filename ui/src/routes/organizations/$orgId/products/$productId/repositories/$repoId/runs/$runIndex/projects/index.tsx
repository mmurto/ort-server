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
import { DataTableCards } from '@/components/data-table-cards/data-table-cards';
import { EmptyValue } from '@/components/data-table-cards/findings-cells';
import {
  LicensesAccordion,
  SpdxExpressionBadgeGroup,
} from '@/components/licenses';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
import { RenderProperty } from '@/components/render-property';
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
import { toastError } from '@/lib/toast';
import { getRepositoryTypeLabel } from '@/lib/types';
import {
  declaredLicenseSearchParameterSchema,
  definitionFilePathSearchParameterSchema,
  markedSearchParameterSchema,
  paginationSearchParameterSchema,
  projectIdentifierSearchParameterSchema,
  sortingSearchParameterSchema,
} from '@/schemas';

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

const renderSubComponent = ({
  row,
  runId,
}: {
  row: AppRow<Project>;
  runId: number;
}) => {
  const project = row.original;

  return (
    <div className='flex flex-col gap-4'>
      <RenderProperty label='Authors' value={project.authors} />
      <RenderProperty
        label='Description'
        value={project.description}
        type='textblock'
      />
      <LicensesAccordion
        runId={runId}
        identifier={project.identifier}
        declaredLicenses={[
          ...(project.processedDeclaredLicense.spdxExpression
            ? [project.processedDeclaredLicense.spdxExpression]
            : []),
          ...project.processedDeclaredLicense.unmappedLicenses,
        ]}
      />
      <RenderProperty label='Homepage' value={project.homepageUrl} type='url' />
      <RenderProperty label='CPE' value={project.cpe} />
      <div>
        <div className='font-semibold'>Processed Declared License</div>
        <div className='ml-2'>
          <div className='space-y-1'>
            <div className='text-[0.8125rem] font-semibold'>
              SPDX expression
            </div>
            {project.processedDeclaredLicense.spdxExpression ? (
              <SpdxExpressionBadgeGroup
                expression={project.processedDeclaredLicense.spdxExpression}
              />
            ) : (
              <div className='text-muted-foreground'>N/A</div>
            )}
          </div>
          <RenderProperty
            label='Mapped licenses'
            value={project.processedDeclaredLicense.mappedLicenses}
            type='keyvalue'
          />
          <div className='space-y-1'>
            <div className='text-[0.8125rem] font-semibold'>
              Unmapped licenses
            </div>
            {project.processedDeclaredLicense.unmappedLicenses.length > 0 ? (
              <LicenseList
                licenses={project.processedDeclaredLicense.unmappedLicenses}
              />
            ) : (
              <div className='text-muted-foreground'>N/A</div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className='font-semibold'>
          {getRepositoryTypeLabel(project.vcsProcessed.type)} Repository
        </div>
        <div className='ml-2'>
          <RenderProperty
            label='URL'
            value={project.vcsProcessed.url}
            type='url'
          />
          <RenderProperty
            label='Revision'
            value={project.vcsProcessed.revision}
          />
          <RenderProperty label='Path' value={project.vcsProcessed.path} />
        </div>
      </div>
      <RenderProperty label='Scopes' value={project.scopeNames} type='array' />
    </div>
  );
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
    toastError('Unable to load data', error || totalError || licensesError);
    return;
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
          { id: 'homepage', width: 'minmax(0,1.2fr)', mobile: 'hidden' },
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
        renderSubComponent={({ row }) =>
          renderSubComponent({ row, runId: ortRun.id })
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
