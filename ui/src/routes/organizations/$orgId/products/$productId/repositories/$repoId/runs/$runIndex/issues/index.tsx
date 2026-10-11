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
import { useState } from 'react';
import z from 'zod';

import { Issue, Severity } from '@/api';
import {
  getRepositoryRunOptions,
  getRunIssuesOptions,
  getRunStatisticsOptions,
} from '@/api/@tanstack/react-query.gen';
import { zSeverity } from '@/api/zod.gen';
import {
  DataTableCards,
  type DataTableCardsDetails,
} from '@/components/data-table-cards/data-table-cards';
import {
  CopyableValue,
  FindingText,
  ResolutionStateMark,
  SeverityMark,
} from '@/components/data-table-cards/findings-cells';
import {
  selectCountsByResolution,
  sumCounts,
} from '@/components/data-table-cards/findings-counts';
import { FindingsFilterChips } from '@/components/data-table-cards/findings-filter-chips';
import { FindingPanelSection } from '@/components/finding-panel/finding-panel';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
import {
  BulkResolve,
  PendingResolutionsBanner,
  RESOLUTION_FORM_SELECTOR,
  Resolutions,
} from '@/components/resolutions';
import { TimestampWithUTC } from '@/components/timestamp-with-utc';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { capitalize } from '@/helpers/capitalize';
import { getIssueCategory } from '@/helpers/get-issue-category';
import { getIssueSeverityBackgroundColor } from '@/helpers/get-status-class';
import {
  convertToBackendSorting,
  updateColumnSorting,
} from '@/helpers/handle-multisort';
import { identifierToString } from '@/helpers/identifier-conversion';
import {
  getResolutionAccordionLabel,
  getResolutionState,
  getResolvedStatus,
} from '@/helpers/resolutions';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import type { AppRow } from '@/hooks/use-app-table';
import {
  ItemResolved,
  itemResolvedSchema,
  itemStatusSearchParameterSchema,
  markedSearchParameterSchema,
  packageIdentifierSearchParameterSchema,
  packageIdTypeSchema,
  paginationSearchParameterSchema,
  severitySearchParameterSchema,
  sortingSearchParameterSchema,
} from '@/schemas';
import { useUserSettingsStore } from '@/store/user-settings.store';
import { IssueDetails } from './-components/issue-details';

const defaultPageSize = 10;
const supportedSortColumns = new Set([
  'identifier',
  'purl',
  'status',
  'severity',
  'source',
]);

const columnHelper = createAppColumnHelper<Issue>();

// The package or project of an issue, linked to its table.
const IssuePackage = ({ issue }: { issue: Issue }) => {
  const params = Route.useParams();
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const purl =
    packageIdType === packageIdTypeSchema.enum.PURL && issue.purl
      ? issue.purl
      : undefined;
  const id = purl ?? identifierToString(issue.identifier);
  const idType = purl
    ? packageIdTypeSchema.enum.PURL
    : packageIdTypeSchema.enum.ORT_ID;
  const linkParams = {
    orgId: params.orgId,
    productId: params.productId,
    repoId: params.repoId,
    runIndex: params.runIndex,
  };

  return (
    <CopyableValue value={id} className='font-mono text-xs'>
      <Tooltip>
        <TooltipTrigger asChild>
          {issue.purl != null ? (
            <Link
              className='link'
              to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages'
              params={linkParams}
              search={{ pkgId: id, pkgIdType: idType, marked: '0' }}
            >
              {id}
            </Link>
          ) : (
            <Link
              className='link'
              to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/projects'
              params={linkParams}
              search={{ projectId: id, marked: id }}
            >
              {id}
            </Link>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {issue.purl != null
            ? 'Inspect the package details in packages table'
            : 'Inspect the project details in projects table'}
        </TooltipContent>
      </Tooltip>
    </CopyableValue>
  );
};

const IssuesComponent = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);

  const columns = columnHelper.columns([
    columnHelper.display({
      id: 'severityMark',
      header: 'Severity',
      cell: ({ row }) => (
        <SeverityMark
          label={row.original.severity}
          colorClass={getIssueSeverityBackgroundColor(row.original.severity)}
        />
      ),
    }),
    columnHelper.display({
      id: 'origin',
      header: 'Source',
      cell: ({ row }) => (
        <div className='flex min-w-0 items-baseline gap-1.5'>
          <span className='shrink-0 font-medium'>{row.original.source}</span>
          <span className='text-muted-foreground truncate'>
            {getIssueCategory(row.original.message)}
          </span>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'issueMessage',
      header: 'Message',
      cell: ({ row }) => {
        const state = getResolutionState(row.original);
        const message = row.original.message.split('\n')[0];

        return (
          <div className='flex min-w-0 items-center gap-2'>
            <FindingText resolved={state === 'resolved'} className='truncate'>
              <span title={row.original.message}>{message}</span>
            </FindingText>
            <ResolutionStateMark state={state} />
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'package',
      header: 'Identifier',
      cell: ({ row }) => <IssuePackage issue={row.original} />,
    }),
    columnHelper.accessor(
      (issue) => {
        // Return purl only if the issue has been reported for a package
        if (packageIdType === packageIdTypeSchema.enum.PURL && issue.purl) {
          return issue.purl;
        } else {
          return identifierToString(issue.identifier);
        }
      },
      {
        id: `${packageIdType === packageIdTypeSchema.enum.PURL ? 'purl' : 'identifier'}`,
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
    columnHelper.accessor(
      (issue) => {
        return getResolvedStatus(issue);
      },
      {
        id: 'status',
        header: 'Status',
        meta: {
          filter: {
            filterVariant: 'select',
            selectOptions: itemResolvedSchema.options.map((itemResolved) => ({
              label: itemResolved,
              value: itemResolved,
            })),
            setSelected: (statuses: ItemResolved[]) => {
              navigate({
                search: {
                  ...search,
                  page: 1,
                  itemResolved: statuses.length === 0 ? undefined : statuses,
                },
              });
            },
          },
        },
      }
    ),
    columnHelper.accessor('severity', {
      header: 'Severity',
      meta: {
        filter: {
          filterVariant: 'select',
          selectOptions: zSeverity.options.map((severity) => ({
            label: severity,
            value: severity,
          })),
          setSelected: (severities: Severity[]) => {
            navigate({
              search: {
                ...search,
                page: 1,
                severity: severities.length === 0 ? undefined : severities,
              },
            });
          },
        },
      },
    }),
    columnHelper.accessor('affectedPath', {
      header: 'Affected Path',
      enableSorting: false,
      enableColumnFilter: false,
    }),
    columnHelper.accessor('source', {
      header: 'Source',
      enableColumnFilter: false,
    }),
  ]);

  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : defaultPageSize;
  const severity = search.severity;
  const itemStatus = search.itemResolved;
  const packageIdentifier = search.pkgId;
  const columnId =
    packageIdType === packageIdTypeSchema.enum.ORT_ID ? 'identifier' : 'purl';
  const resolved =
    itemStatus?.length === 1 ? itemStatus[0] === 'Resolved' : undefined;
  const sortBy =
    search.sortBy?.filter((sort) => supportedSortColumns.has(sort.id)) ?? [];

  const columnFilters = [
    { id: 'severity', value: severity },
    { id: 'status', value: itemStatus },
    { id: columnId, value: packageIdentifier },
  ].filter(({ value }) => value !== undefined);

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
  });

  const {
    data: totalIssues,
    isPending: totalIsPending,
    isError: totalIsError,
    error: totalError,
  } = useQuery({
    ...getRunIssuesOptions({
      path: { runId: ortRun.id },
      query: { limit: 1 },
    }),
  });

  const { data: statistics } = useQuery({
    ...getRunStatisticsOptions({ path: { runId: ortRun.id } }),
  });

  // The run statistics count the issues per severity in the whole run,
  // regardless of the other filters.
  const severityCounts = selectCountsByResolution(
    statistics?.issuesCountTotalBySeverity,
    statistics?.issuesCountBySeverity,
    itemStatus
  );

  const {
    data: issues,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getRunIssuesOptions({
      path: { runId: ortRun.id },
      query: {
        limit: pageSize,
        offset: pageIndex * pageSize,
        sort: convertToBackendSorting(sortBy),
        resolved,
        severity: severity?.join(','),
        ...(packageIdType === packageIdTypeSchema.enum.ORT_ID
          ? { identifier: packageIdentifier }
          : { purl: packageIdentifier }),
      },
    }),
  });

  const renderDetails = ({
    row,
  }: {
    row: AppRow<Issue>;
  }): DataTableCardsDetails => {
    const issue = row.original;

    return {
      title: (
        <span className='line-clamp-3'>
          {issue.message.split('\n')[0] || 'Issue'}
        </span>
      ),
      meta: (
        <>
          <SeverityMark
            label={issue.severity}
            colorClass={getIssueSeverityBackgroundColor(issue.severity)}
          />
          <ResolutionStateMark state={getResolutionState(issue)} />
          <span className='text-muted-foreground'>
            {issue.source} · {getIssueCategory(issue.message)}
          </span>
        </>
      ),
      content: (
        <>
          <div className='text-muted-foreground flex flex-wrap gap-x-1 text-[0.8125rem]'>
            <span>Created at</span>
            <TimestampWithUTC
              timestamp={issue.timestamp}
              className='text-foreground'
            />
            <span>by</span>
            <span className='text-foreground'>{issue.worker}</span>
          </div>
          <FindingPanelSection
            title={issue.purl != null ? 'Package' : 'Project'}
          >
            <IssuePackage issue={issue} />
          </FindingPanelSection>
          {issue.affectedPath && (
            <FindingPanelSection title='Affected path'>
              <div className='font-mono text-xs break-all'>
                {issue.affectedPath}
              </div>
            </FindingPanelSection>
          )}
          <FindingPanelSection title={getResolutionAccordionLabel(issue)}>
            <Resolutions
              item={issue}
              repositoryId={params.repoId}
              runId={ortRun.id}
            />
          </FindingPanelSection>
          <FindingPanelSection title='Message'>
            <IssueDetails issue={issue} />
          </FindingPanelSection>
        </>
      ),
    };
  };

  // Control the expanded state of the subrows manually, so that when
  // a user arrives at the table view via a URL link with search parameter
  // "marked" set to an item, the item subrow is expanded by default, while
  // still retaining full control of expanding/collapsing each subrow.
  const [expanded, setExpanded] = useState<ExpandedState>(
    search.marked ? { [search.marked]: true } : {}
  );

  const table = useAppTable(
    {
      data: issues?.data || [],
      columns,
      pageCount: Math.ceil((issues?.pagination.totalCount ?? 0) / pageSize),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
        columnFilters,
        columnVisibility: {
          [columnId]: false,
          severity: false,
          status: false,
          affectedPath: false,
          source: false,
        },
        sorting: sortBy,
        expanded: expanded,
      },
      onExpandedChange: setExpanded,
      getRowCanExpand: () => true,
      manualFiltering: true,
      manualPagination: true,
      manualSorting: true,
    },
    selectNoTableState
  );

  if (isPending || totalIsPending) {
    return <LoadingIndicator />;
  }

  if (isError || totalIsError) {
    return <LoadError error={error || totalError} />;
  }
  const filtersInUse =
    totalIssues.pagination.totalCount !== issues.pagination.totalCount;
  const intro =
    'This view shows any technical issues that were discovered by the respective source. As technical issues might have an impact on the completeness of metadata, it is highly recommended to resolve any technical issues before acting on any compliance related findings.';
  const matching = `, ${issues.pagination.totalCount} matching filters`;

  return (
    <SheetSection
      title='Issues'
      meta={`${totalIssues.pagination.totalCount} in total${filtersInUse ? matching : ''}`}
    >
      <p
        className='text-muted-foreground -mt-2 max-w-[75ch] text-[0.8125rem] max-md:line-clamp-1'
        title={intro}
      >
        {intro}
      </p>
      <FindingsFilterChips
        label='Filter by severity'
        chips={[...zSeverity.options].reverse().map((value) => ({
          value,
          label: capitalize(value),
          colorClass: getIssueSeverityBackgroundColor(value),
          count: severityCounts ? (severityCounts[value] ?? 0) : undefined,
        }))}
        total={sumCounts(severityCounts)}
        countsTitle='The number in the whole run, regardless of the other filters'
        selected={severity}
        onSelect={(severities) => {
          navigate({ search: { ...search, page: 1, severity: severities } });
        }}
      />
      <PendingResolutionsBanner items={issues.data} run={params} />
      <DataTableCards
        onClearFilters={() =>
          navigate({
            search: {
              ...search,
              page: 1,
              pkgId: undefined,
              itemResolved: undefined,
              severity: undefined,
            },
          })
        }
        table={table}
        aria-label='Issues'
        layout={[
          {
            id: 'severityMark',
            width: 'max-content',
            sortBy: 'severity',
            filters: ['severity'],
            mobile: 'lead',
          },
          {
            id: 'origin',
            width: 'minmax(0,1fr)',
            sortBy: 'source',
            mobile: 'hidden',
            withDetails: false,
          },
          {
            id: 'issueMessage',
            width: 'minmax(0,2.5fr)',
            filters: ['status'],
            mobile: 'main',
          },
          {
            id: 'package',
            width: 'minmax(0,2fr)',
            sortBy: columnId,
            filters: [columnId],
            mobile: 'sub',
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
        renderDetails={renderDetails}
        resolveTarget={RESOLUTION_FORM_SELECTOR}
        bulkActions={({ rows, clear }) => (
          <BulkResolve
            items={rows.map((row) => row.original)}
            itemType='issue'
            repositoryId={params.repoId}
            runId={ortRun.id}
            onDone={clear}
          />
        )}
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
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/issues/'
)({
  validateSearch: z.object({
    ...paginationSearchParameterSchema.shape,
    ...severitySearchParameterSchema.shape,
    ...itemStatusSearchParameterSchema.shape,
    ...packageIdentifierSearchParameterSchema.shape,
    ...sortingSearchParameterSchema.shape,
    ...markedSearchParameterSchema.shape,
  }),
  component: IssuesComponent,
  pendingComponent: LoadingIndicator,
});
