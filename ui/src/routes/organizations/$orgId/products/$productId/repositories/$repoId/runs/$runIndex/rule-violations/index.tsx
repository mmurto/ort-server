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

import { RuleViolation, Severity } from '@/api';
import {
  getRepositoryRunOptions,
  getRunRuleViolationRulesOptions,
  getRunRuleViolationsOptions,
  getRunStatisticsOptions,
} from '@/api/@tanstack/react-query.gen';
import { zSeverity } from '@/api/zod.gen';
import { DataTableCards } from '@/components/data-table-cards/data-table-cards';
import {
  CopyableValue,
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
import { FormattedValue } from '@/components/formatted-value';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { capitalize } from '@/helpers/capitalize';
import { getRuleViolationSeverityBackgroundColor } from '@/helpers/get-status-class';
import {
  convertToBackendSorting,
  updateColumnSorting,
} from '@/helpers/handle-multisort';
import { identifierToString } from '@/helpers/identifier-conversion';
import {
  getResolutionAccordionDefaultValue,
  getResolutionAccordionLabel,
  getResolvedStatus,
} from '@/helpers/resolutions';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import type { AppRow } from '@/hooks/use-app-table';
import { toastError } from '@/lib/toast';
import {
  ItemResolved,
  itemResolvedSchema,
  itemStatusSearchParameterSchema,
  markedSearchParameterSchema,
  packageIdentifierSearchParameterSchema,
  packageIdTypeSchema,
  paginationSearchParameterSchema,
  ruleSearchParameterSchema,
  severitySearchParameterSchema,
  sortingSearchParameterSchema,
} from '@/schemas';
import { useUserSettingsStore } from '@/store/user-settings.store';

const defaultPageSize = 10;
const supportedSortColumns = new Set([
  'identifier',
  'purl',
  'status',
  'severity',
  'rule',
]);

const columnHelper = createAppColumnHelper<RuleViolation>();

// The package or project of a rule violation, linked to its table.
const RuleViolationPackage = ({
  ruleViolation,
}: {
  ruleViolation: RuleViolation;
}) => {
  const params = Route.useParams();
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const purl =
    packageIdType === packageIdTypeSchema.enum.PURL && ruleViolation.purl
      ? ruleViolation.purl
      : undefined;
  const id = purl ?? identifierToString(ruleViolation.id);
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
          {ruleViolation.purl != null ? (
            <Link
              className='link flex min-w-0'
              to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages'
              params={linkParams}
              search={{ pkgId: id, pkgIdType: idType, marked: '0' }}
            >
              <MiddleTruncate value={id} />
            </Link>
          ) : (
            <Link
              className='link flex min-w-0'
              to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/projects'
              params={linkParams}
              search={{ projectId: id, marked: id }}
            >
              <MiddleTruncate value={id} />
            </Link>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {ruleViolation.purl != null
            ? 'Inspect the package details in packages table'
            : 'Inspect the project details in projects table'}
        </TooltipContent>
      </Tooltip>
    </CopyableValue>
  );
};

// The license a rule violation is about, or else its message.
const RuleViolationFinding = ({
  ruleViolation,
}: {
  ruleViolation: RuleViolation;
}) => {
  if (!ruleViolation.license) {
    return (
      <div
        className='text-muted-foreground truncate'
        title={ruleViolation.message}
      >
        {ruleViolation.message}
      </div>
    );
  }

  const sources =
    ruleViolation.licenseSources && ruleViolation.licenseSources.length > 0
      ? ruleViolation.licenseSources.join(', ')
      : undefined;

  return (
    <div className='flex min-w-0 items-baseline gap-1.5'>
      <span className='truncate font-mono text-xs'>
        {ruleViolation.license}
      </span>
      {sources && (
        <span className='text-muted-foreground shrink-0'>({sources})</span>
      )}
    </div>
  );
};

const RuleViolationsComponent = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
  });

  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : defaultPageSize;
  const severity = search.severity;
  const itemStatus = search.itemResolved;
  const packageIdentifier = search.pkgId;
  const selectedRules = search.rule;
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
    { id: 'rule', value: selectedRules },
  ].filter(({ value }) => value !== undefined);

  const {
    data: totalRuleViolations,
    isPending: totalIsPending,
    isError: totalIsError,
    error: totalError,
  } = useQuery({
    ...getRunRuleViolationsOptions({
      path: { runId: ortRun.id },
      query: { limit: 1 },
    }),
  });

  const {
    data: availableRules,
    isPending: rulesIsPending,
    isError: rulesIsError,
    error: rulesError,
  } = useQuery({
    ...getRunRuleViolationRulesOptions({
      path: { runId: ortRun.id },
    }),
  });

  const { data: statistics } = useQuery({
    ...getRunStatisticsOptions({ path: { runId: ortRun.id } }),
  });

  // The run statistics count the rule violations per severity, but know
  // nothing of the other filters, so the counts are only shown without them.
  const severityCounts =
    packageIdentifier === undefined && selectedRules === undefined
      ? selectCountsByResolution(
          statistics?.ruleViolationsCountTotalBySeverity,
          statistics?.ruleViolationsCountBySeverity,
          itemStatus
        )
      : undefined;

  const {
    data: ruleViolations,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getRunRuleViolationsOptions({
      path: { runId: ortRun.id },
      query: {
        limit: pageSize,
        offset: pageIndex * pageSize,
        sort: convertToBackendSorting(sortBy),
        resolved,
        severity: severity?.join(','),
        rule: selectedRules?.join(','),
        ...(packageIdType === packageIdTypeSchema.enum.ORT_ID
          ? { identifier: packageIdentifier }
          : { purl: packageIdentifier }),
      },
    }),
  });

  const ruleOptions =
    availableRules?.map((rule) => ({ label: rule, value: rule })) ?? [];

  const columns = columnHelper.columns([
    columnHelper.display({
      id: 'severityMark',
      header: 'Severity',
      cell: ({ row }) => (
        <SeverityMark
          label={row.original.severity}
          colorClass={getRuleViolationSeverityBackgroundColor(
            row.original.severity
          )}
        />
      ),
    }),
    columnHelper.display({
      id: 'ruleName',
      header: 'Rule',
      cell: ({ row }) => (
        <FindingText
          resolved={getResolvedStatus(row.original) === 'Resolved'}
          className='block truncate font-mono text-xs font-medium'
        >
          {row.original.rule}
        </FindingText>
      ),
    }),
    columnHelper.display({
      id: 'package',
      header: 'Package',
      cell: ({ row }) => <RuleViolationPackage ruleViolation={row.original} />,
    }),
    columnHelper.display({
      id: 'finding',
      header: 'License / finding',
      cell: ({ row }) => <RuleViolationFinding ruleViolation={row.original} />,
    }),
    columnHelper.display({
      id: 'resolution',
      header: 'Status',
      cell: ({ row }) =>
        getResolvedStatus(row.original) === 'Resolved' ? (
          <ResolvedMark />
        ) : null,
    }),
    columnHelper.accessor(
      (ruleViolation) => {
        // Return purl only if the rule violation has been reported for a package
        if (
          packageIdType === packageIdTypeSchema.enum.PURL &&
          ruleViolation.purl
        ) {
          return ruleViolation.purl;
        } else {
          return identifierToString(ruleViolation.id);
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
      (ruleViolation) => {
        return getResolvedStatus(ruleViolation);
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

    columnHelper.accessor('rule', {
      header: 'Rule',
      meta: {
        filter: {
          filterVariant: 'select',
          selectOptions: ruleOptions,
          setSelected: (rules: string[]) => {
            navigate({
              search: {
                ...search,
                page: 1,
                rule: rules.length === 0 ? undefined : rules,
              },
            });
          },
          align: 'end',
        },
      },
    }),
  ]);

  const renderSubComponent = ({ row }: { row: AppRow<RuleViolation> }) => {
    const ruleViolation = row.original;

    return (
      <Accordion
        type='multiple'
        className='w-full'
        defaultValue={getResolutionAccordionDefaultValue(ruleViolation)}
      >
        <AccordionItem value='resolutions'>
          <AccordionTrigger className='font-semibold'>
            {getResolutionAccordionLabel(ruleViolation)}
          </AccordionTrigger>
          <AccordionContent>
            <Resolutions
              item={ruleViolation}
              repositoryId={params.repoId}
              runId={ortRun.id}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='details'>
          <AccordionTrigger className='font-semibold'>Details</AccordionTrigger>
          <AccordionContent>
            <div className='flex flex-col gap-4'>
              <div>{ruleViolation.message}</div>
              <div className='grid grid-cols-8 gap-2'>
                <div className='col-span-2 font-semibold'>License:</div>
                <div className='col-span-6'>
                  <FormattedValue value={ruleViolation.license} />
                </div>
                <div className='col-span-2 font-semibold'>License sources:</div>
                <div className='col-span-6'>
                  <FormattedValue
                    value={
                      ruleViolation.licenseSources &&
                      ruleViolation.licenseSources.length > 0
                        ? ruleViolation.licenseSources.join(', ')
                        : null
                    }
                  />
                </div>
                <div className='col-span-2 font-semibold'>How to fix:</div>
              </div>
              <MarkdownRenderer markdown={ruleViolation.howToFix} />
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
      data: ruleViolations?.data || [],
      columns,
      pageCount: Math.ceil(
        (ruleViolations?.pagination.totalCount ?? 0) / pageSize
      ),
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
          rule: false,
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

  if (isPending || totalIsPending || rulesIsPending) {
    return <LoadingIndicator />;
  }

  if (isError || totalIsError || rulesIsError) {
    toastError('Unable to load data', error || totalError || rulesError);
    return;
  }

  const filtersInUse = columnFilters.length > 0;
  const intro =
    'This view shows all violations that go against the rules defined in the configured policy.';
  const matching = `, ${ruleViolations.pagination.totalCount} matching filters`;
  const evaluatorWasIncludedInRun = ortRun.jobs.evaluator != null;
  const noResultsContent = !evaluatorWasIncludedInRun ? (
    <div className='text-muted-foreground text-[0.8125rem]'>
      No rule violations are available because the evaluator job was not enabled
      for this run.
    </div>
  ) : undefined;

  return (
    <SheetSection
      title='Rule violations'
      meta={`${totalRuleViolations.pagination.totalCount} in total${filtersInUse ? matching : ''}`}
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
          colorClass: getRuleViolationSeverityBackgroundColor(value),
          count: severityCounts ? (severityCounts[value] ?? 0) : undefined,
        }))}
        total={sumCounts(severityCounts)}
        selected={severity}
        onSelect={(severities) => {
          navigate({ search: { ...search, page: 1, severity: severities } });
        }}
      />
      <DataTableCards
        table={table}
        aria-label='Rule violations'
        layout={[
          {
            id: 'severityMark',
            width: 'max-content',
            sortBy: 'severity',
            filters: ['severity'],
            mobile: 'lead',
          },
          {
            id: 'ruleName',
            width: 'minmax(0,1.2fr)',
            sortBy: 'rule',
            filters: ['rule'],
            mobile: 'main',
          },
          {
            id: 'package',
            width: 'minmax(0,2fr)',
            sortBy: columnId,
            filters: [columnId],
            mobile: 'sub',
          },
          { id: 'finding', width: 'minmax(0,1.5fr)', mobile: 'hidden' },
          {
            id: 'resolution',
            width: 'max-content',
            sortBy: 'status',
            filters: ['status'],
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
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations/'
)({
  validateSearch: z.object({
    ...paginationSearchParameterSchema.shape,
    ...severitySearchParameterSchema.shape,
    ...itemStatusSearchParameterSchema.shape,
    ...packageIdentifierSearchParameterSchema.shape,
    ...ruleSearchParameterSchema.shape,
    ...sortingSearchParameterSchema.shape,
    ...markedSearchParameterSchema.shape,
  }),
  component: RuleViolationsComponent,
  pendingComponent: LoadingIndicator,
});
