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
import { createFileRoute, Link } from '@tanstack/react-router';
import { ExpandedState } from '@tanstack/react-table';
import { PackageURL } from 'packageurl-js';
import { useState } from 'react';
import z from 'zod';

import { VulnerabilityRating, VulnerabilityWithDetails } from '@/api';
import {
  getRepositoryRunOptions,
  getRunStatisticsOptions,
  getRunVulnerabilitiesOptions,
  getRunVulnerabilityAdvisorsOptions,
} from '@/api/@tanstack/react-query.gen';
import { zVulnerabilityRating } from '@/api/zod.gen';
import { VulnerabilityMetrics } from '@/components/charts/vulnerability-metrics';
import { DataTableCards } from '@/components/data-table-cards/data-table-cards';
import {
  CopyableValue,
  EmptyValue,
  FindingText,
  MiddleTruncate,
  ResolvedMark,
  SeverityMark,
} from '@/components/data-table-cards/findings-cells';
import {
  selectCountsByResolution,
  sumCounts,
} from '@/components/data-table-cards/findings-counts';
import { FindingsFilterChips } from '@/components/data-table-cards/findings-filter-chips';
import { LoadingIndicator } from '@/components/loading-indicator';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { SheetSection } from '@/components/page-header';
import { Resolutions } from '@/components/resolutions';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { capitalize } from '@/helpers/capitalize';
import { getVulnerabilityRatingBackgroundColor } from '@/helpers/get-status-class';
import {
  convertToBackendSorting,
  EMPTY_SORTING_STATE,
  updateColumnSorting,
} from '@/helpers/handle-multisort';
import { identifierToString } from '@/helpers/identifier-conversion';
import {
  getResolutionAccordionDefaultValue,
  getResolutionAccordionLabel,
  getResolvedStatus,
} from '@/helpers/resolutions';
import { getVersionsRelativeToReference } from '@/helpers/versions';
import {
  splitVulnerabilityStatusSelection,
  toTriState,
  vulnerabilityStatusOptions,
} from '@/helpers/vulnerability-status';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import type { AppRow } from '@/hooks/use-app-table';
import { toastError } from '@/lib/toast';
import {
  advisorSearchParameterSchema,
  externalIdSearchParameterSchema,
  ItemFix,
  itemFixSearchParameterSchema,
  ItemResolved,
  itemStatusSearchParameterSchema,
  markedSearchParameterSchema,
  packageIdentifierSearchParameterSchema,
  packageIdTypeSchema,
  paginationSearchParameterSchema,
  sortingSearchParameterSchema,
  vulnerabilityRatingSearchParameterSchema,
} from '@/schemas';
import { useUserSettingsStore } from '@/store/user-settings.store';

const defaultPageSize = 10;
const supportedSortColumns = new Set([
  'identifier',
  'purl',
  'externalId',
  'rating',
]);

const columnHelper = createAppColumnHelper<VulnerabilityWithDetails>();

// The affected package of a vulnerability, linked to the packages table.
const VulnerabilityPackage = ({
  vulnerability,
}: {
  vulnerability: VulnerabilityWithDetails;
}) => {
  const params = Route.useParams();
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const purl =
    packageIdType === packageIdTypeSchema.enum.PURL && vulnerability.purl
      ? vulnerability.purl
      : undefined;
  const id = purl ?? identifierToString(vulnerability.identifier);
  const idType = purl
    ? packageIdTypeSchema.enum.PURL
    : packageIdTypeSchema.enum.ORT_ID;

  return (
    <CopyableValue value={id} className='font-mono text-xs'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            className='link flex min-w-0'
            to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages'
            params={{
              orgId: params.orgId,
              productId: params.productId,
              repoId: params.repoId,
              runIndex: params.runIndex,
            }}
            search={{ pkgId: id, pkgIdType: idType, marked: '0' }}
          >
            <MiddleTruncate value={id} />
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          Inspect the package details in packages table
        </TooltipContent>
      </Tooltip>
    </CopyableValue>
  );
};

const VulnerabilitiesComponent = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : defaultPageSize;
  const selectedStatuses = [
    ...(search.itemResolved ?? []),
    ...(search.itemFix ?? []),
  ];
  const itemStatus = selectedStatuses.length > 0 ? selectedStatuses : undefined;
  const packageIdentifier = search.pkgId;
  const rating = search.rating;
  const externalId = search.externalId;
  const advisor = search.advisor;
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const resolved = toTriState(search.itemResolved, 'Resolved');
  const fixAvailable = toTriState(search.itemFix, 'Fix available');
  const sortBy = search.sortBy?.filter((sort) =>
    supportedSortColumns.has(sort.id)
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
    data: advisors,
    isError: advisorsIsError,
    error: advisorsError,
  } = useSuspenseQuery({
    ...getRunVulnerabilityAdvisorsOptions({
      path: { runId: ortRun.id },
    }),
  });

  const columns = columnHelper.columns([
    columnHelper.display({
      id: 'ratingMark',
      header: 'Rating',
      cell: ({ row }) => (
        <SeverityMark
          label={row.original.rating}
          colorClass={getVulnerabilityRatingBackgroundColor(
            row.original.rating
          )}
        />
      ),
    }),
    columnHelper.display({
      id: 'vulnerabilityId',
      header: 'ID',
      cell: ({ row }) => {
        const resolved = getResolvedStatus(row.original) === 'Resolved';

        return (
          <div className='flex min-w-0 items-center gap-2'>
            <FindingText
              resolved={resolved}
              className='font-mono text-xs font-medium whitespace-nowrap'
            >
              {row.original.vulnerability.externalId}
            </FindingText>
            {resolved && <ResolvedMark />}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'package',
      header: 'Package',
      cell: ({ row }) => <VulnerabilityPackage vulnerability={row.original} />,
    }),
    columnHelper.display({
      id: 'summaryText',
      header: 'Summary',
      cell: ({ row }) => {
        const summary = row.original.vulnerability.summary;

        return summary ? (
          <div
            className='text-muted-foreground line-clamp-2 wrap-break-word'
            title={summary}
          >
            {summary}
          </div>
        ) : (
          <div className='text-muted-foreground'>No summary available</div>
        );
      },
    }),
    columnHelper.display({
      id: 'advisor',
      header: 'Advisor',
      cell: ({ row }) => (
        <div className='text-muted-foreground truncate'>
          {row.original.advisor.name}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'fix',
      header: 'Fix',
      cell: ({ row }) =>
        (row.original.firstFixedVersions?.length ?? 0) > 0 ? (
          <span className='text-ok text-[0.6875rem] font-semibold tracking-[0.04em] whitespace-nowrap uppercase'>
            Fix available
          </span>
        ) : (
          <EmptyValue />
        ),
    }),
    columnHelper.accessor(
      (vuln) => {
        if (packageIdType === packageIdTypeSchema.enum.PURL) {
          return vuln.purl;
        } else {
          return identifierToString(vuln.identifier);
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
                search: { ...search, page: 1, pkgId: value },
              });
            },
          },
        },
      }
    ),
    columnHelper.accessor('vulnerability.externalId', {
      id: 'externalId',
      header: 'External ID',
      meta: {
        filter: {
          filterVariant: 'text',
          setFilterValue: (value: string | undefined) => {
            navigate({
              search: { ...search, page: 1, externalId: value },
            });
          },
        },
      },
    }),
    columnHelper.accessor('rating', {
      id: 'rating',
      header: 'Rating',
      meta: {
        filter: {
          filterVariant: 'select',
          selectOptions: zVulnerabilityRating.options.map((rating) => ({
            label: rating,
            value: rating,
          })),
          setSelected: (ratings: VulnerabilityRating[]) => {
            navigate({
              search: {
                ...search,
                page: 1,
                rating: ratings.length === 0 ? undefined : ratings,
              },
            });
          },
        },
      },
    }),
    columnHelper.accessor(
      (vuln) => [
        getResolvedStatus(vuln),
        (vuln.firstFixedVersions?.length ?? 0) > 0
          ? 'Fix available'
          : 'Fix unavailable',
      ],
      {
        id: 'itemStatus',
        header: 'Status',
        enableSorting: false,
        meta: {
          filter: {
            filterVariant: 'select',
            selectOptions: vulnerabilityStatusOptions,
            setSelected: (statuses: (ItemResolved | ItemFix)[]) => {
              navigate({
                search: {
                  ...search,
                  page: 1,
                  ...splitVulnerabilityStatusSelection(statuses),
                },
              });
            },
          },
        },
      }
    ),
    columnHelper.accessor('advisor.name', {
      id: 'advisorName',
      header: 'Advisor',
      enableSorting: false,
      enableColumnFilter: advisors.length > 1,
      meta: {
        filter: {
          filterVariant: 'select',
          selectOptions: advisors.map((advisor) => ({
            label: advisor,
            value: advisor,
          })),
          setSelected: (advisors: string[]) => {
            navigate({
              search: {
                ...search,
                page: 1,
                advisor: advisors.length === 0 ? undefined : advisors,
              },
            });
          },
        },
      },
    }),
    columnHelper.accessor(
      (row) => {
        return row.vulnerability.summary;
      },
      {
        id: 'summary',
        header: 'Summary',
        enableSorting: false,
        enableColumnFilter: false,
      }
    ),
  ]);

  const columnId =
    packageIdType === packageIdTypeSchema.enum.ORT_ID ? 'identifier' : 'purl';

  const { data: statistics } = useQuery({
    ...getRunStatisticsOptions({ path: { runId: ortRun.id } }),
  });

  // The run statistics count the vulnerabilities per rating, but know nothing
  // of the other filters, so the counts are only shown without them.
  const ratingCounts =
    packageIdentifier === undefined &&
    externalId === undefined &&
    advisor === undefined &&
    search.itemFix === undefined
      ? selectCountsByResolution(
          statistics?.vulnerabilitiesCountTotalByRating,
          statistics?.vulnerabilitiesCountByRating,
          search.itemResolved
        )
      : undefined;

  const {
    data: totalVulnerabilities,
    isError: totalIsError,
    error: totalError,
  } = useSuspenseQuery({
    ...getRunVulnerabilitiesOptions({
      path: { runId: ortRun.id },
      query: { limit: 1 },
    }),
  });

  const {
    data: vulnerabilities,
    isError,
    error,
  } = useSuspenseQuery({
    ...getRunVulnerabilitiesOptions({
      path: { runId: ortRun.id },
      query: {
        limit: pageSize,
        offset: pageIndex * pageSize,
        sort: convertToBackendSorting(sortBy),
        resolved,
        fixAvailable,
        rating: rating?.join(','),
        advisors: advisor?.join(','),
        ...(packageIdType === packageIdTypeSchema.enum.ORT_ID
          ? { identifier: packageIdentifier }
          : { purl: packageIdentifier }),
        externalId,
      },
    }),
  });

  const renderSubComponent = ({
    row,
  }: {
    row: AppRow<VulnerabilityWithDetails>;
  }) => {
    const vulnerability = row.original.vulnerability;
    let pkgVersion;
    try {
      pkgVersion = PackageURL.fromString(row.original.purl).version;
    } catch {
      pkgVersion = undefined;
    }

    const relativeVersions = getVersionsRelativeToReference(
      row.original.firstFixedVersions || [],
      pkgVersion || ''
    );

    return (
      <Accordion
        type='multiple'
        className='w-full'
        defaultValue={getResolutionAccordionDefaultValue(row.original)}
      >
        <AccordionItem value='fixed-versions'>
          <AccordionTrigger className='font-semibold'>
            First fixed versions
          </AccordionTrigger>
          <AccordionContent>
            {(row.original.firstFixedVersions?.length ?? 0) > 0 ? (
              <>
                {relativeVersions.earlierVersions.length > 0 && (
                  <span className='text-muted-foreground'>
                    {relativeVersions.earlierVersions.join(', ')}
                    {relativeVersions.nextVersion && ', '}
                  </span>
                )}
                {relativeVersions.nextVersion && (
                  <span className='font-semibold'>
                    {relativeVersions.nextVersion}
                  </span>
                )}
                {relativeVersions.laterVersions.length > 0 && (
                  <span>
                    {', '}
                    {relativeVersions.laterVersions.join(', ')}
                  </span>
                )}
              </>
            ) : (
              <div className='text-muted-foreground text-[0.8125rem]'>
                No fixed versions available.
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='resolutions'>
          <AccordionTrigger className='font-semibold'>
            {getResolutionAccordionLabel(row.original)}
          </AccordionTrigger>
          <AccordionContent>
            <Resolutions
              item={row.original}
              repositoryId={params.repoId}
              runId={ortRun.id}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='details'>
          <AccordionTrigger className='font-semibold'>Details</AccordionTrigger>
          <AccordionContent>
            <div className='flex flex-col gap-4'>
              <VulnerabilityMetrics vulnerability={vulnerability} />
              <div className='font-semibold'>Description</div>
              <MarkdownRenderer
                markdown={
                  vulnerability.description || '_No description available._'
                }
              />
              <div className='mt-2 font-semibold'>
                Links to vulnerability references
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Scoring system</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Vector</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulnerability.references
                    .sort((refA, refB) => (refB.score ?? 0) - (refA.score ?? 0))
                    .map((reference, index) => (
                      <TableRow key={index}>
                        <TableCell>{reference.severity || '-'}</TableCell>
                        <TableCell>{reference.scoringSystem || '-'}</TableCell>
                        <TableCell>{reference.score || '-'}</TableCell>
                        <TableCell className='font-mono text-xs break-all whitespace-normal'>
                          {reference.vector || '-'}
                        </TableCell>
                        <TableCell>
                          <Link
                            className='link break-all'
                            to={reference.url}
                            target='_blank'
                          >
                            {reference.url}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  const [expanded, setExpanded] = useState<ExpandedState>(
    search.marked ? { [search.marked]: true } : {}
  );

  const table = useAppTable(
    {
      data: vulnerabilities.data,
      columns,
      pageCount: Math.ceil(vulnerabilities.pagination.totalCount / pageSize),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
        columnFilters: [
          { id: 'itemStatus', value: itemStatus },
          { id: columnId, value: packageIdentifier },
          { id: 'rating', value: rating },
          { id: 'advisorName', value: advisor },
          { id: 'externalId', value: externalId },
        ].filter(({ value }) => value !== undefined),
        columnVisibility: {
          [columnId]: false,
          rating: false,
          itemStatus: false,
          externalId: false,
          advisorName: false,
          summary: false,
        },
        sorting: sortBy ?? EMPTY_SORTING_STATE,
        expanded: expanded,
      },
      onExpandedChange: setExpanded,
      getRowCanExpand: () => true,
      manualPagination: true,
    },
    selectNoTableState
  );

  if (isError || totalIsError || advisorsIsError) {
    toastError('Unable to load data', error || totalError || advisorsError);
    return;
  }
  const filtersInUse =
    totalVulnerabilities.pagination.totalCount !==
    vulnerabilities.pagination.totalCount;
  const intro =
    'This view shows the vulnerabilities found in any of the packages used as dependencies of a project. As vulnerabilities may be only discovered over time, new vulnerabilities may arise even without changes to the any of the projects or their dependencies. Therefore, it is important to check for vulnerabilities on a regular basis.';
  const matching = `, ${vulnerabilities.pagination.totalCount} matching filters`;
  const advisorWasIncludedInRun = ortRun.jobs.advisor != null;
  const noResultsContent = !advisorWasIncludedInRun ? (
    <div className='text-muted-foreground text-[0.8125rem]'>
      No vulnerabilities are available because the advisor job was not enabled
      for this run.
    </div>
  ) : undefined;

  return (
    <SheetSection
      title='Vulnerabilities'
      meta={`${totalVulnerabilities.pagination.totalCount} in total${filtersInUse ? matching : ''}`}
    >
      <p
        className='text-muted-foreground -mt-2 max-w-[75ch] text-[0.8125rem] max-md:line-clamp-1'
        title={intro}
      >
        {intro}
      </p>
      <FindingsFilterChips
        label='Filter by rating'
        chips={[...zVulnerabilityRating.options].reverse().map((value) => ({
          value,
          label: capitalize(value),
          colorClass: getVulnerabilityRatingBackgroundColor(value),
          count: ratingCounts ? (ratingCounts[value] ?? 0) : undefined,
        }))}
        total={sumCounts(ratingCounts)}
        selected={rating}
        onSelect={(ratings) => {
          navigate({ search: { ...search, page: 1, rating: ratings } });
        }}
      />
      <DataTableCards
        table={table}
        aria-label='Vulnerabilities'
        layout={[
          {
            id: 'ratingMark',
            width: 'max-content',
            sortBy: 'rating',
            filters: ['rating'],
            mobile: 'lead',
          },
          {
            id: 'vulnerabilityId',
            width: 'minmax(0,1.1fr)',
            sortBy: 'externalId',
            filters: ['externalId'],
            mobile: 'main',
          },
          {
            id: 'package',
            width: 'minmax(0,1.8fr)',
            sortBy: columnId,
            filters: [columnId],
            mobile: 'sub',
          },
          { id: 'summaryText', width: 'minmax(0,2.2fr)', mobile: 'hidden' },
          {
            id: 'advisor',
            width: 'minmax(0,0.7fr)',
            filters: ['advisorName'],
            mobile: 'hidden',
          },
          {
            id: 'fix',
            width: 'max-content',
            filters: ['itemStatus'],
            mobile: 'end',
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
        noResultsContent={noResultsContent}
        renderSubComponent={renderSubComponent}
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
              sortBy: updateColumnSorting(search.sortBy, sortBy),
            },
          };
        }}
      />
    </SheetSection>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/vulnerabilities/'
)({
  validateSearch: z.object({
    ...paginationSearchParameterSchema.shape,
    ...sortingSearchParameterSchema.shape,
    ...itemStatusSearchParameterSchema.shape,
    ...itemFixSearchParameterSchema.shape,
    ...packageIdentifierSearchParameterSchema.shape,
    ...vulnerabilityRatingSearchParameterSchema.shape,
    ...advisorSearchParameterSchema.shape,
    ...externalIdSearchParameterSchema.shape,
    ...markedSearchParameterSchema.shape,
  }),
  component: VulnerabilitiesComponent,
  pendingComponent: LoadingIndicator,
});
