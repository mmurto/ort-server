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

import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { GitCompare, View } from 'lucide-react';
import { useState } from 'react';

import { Organization, OrtRunSummary, Product, Repository } from '@/api';
import {
  deleteRepositoryRunMutation,
  getOrganizationOptions,
  getProductOptions,
  getRepositoryOptions,
  getRepositoryRunsOptions,
} from '@/api/@tanstack/react-query.gen';
import { DataTable } from '@/components/data-table/data-table';
import { DeleteDialog } from '@/components/delete-dialog';
import { DeleteIconButton } from '@/components/delete-icon-button';
import { FavoriteButton } from '@/components/favorite-button';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator';
import { OrtRunJobStatus } from '@/components/ort-run-job-status';
import { RunDuration } from '@/components/run-duration';
import { Sha1Component } from '@/components/sha1-component';
import { StatusMark } from '@/components/status-mark';
import { TimestampWithUTC } from '@/components/timestamp-with-utc';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { config } from '@/config';
import { isRunFinished } from '@/helpers/job-helpers';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import { useRepositoryPermission } from '@/hooks/use-authorization';
import { ApiError } from '@/lib/api-error';
import { runDeleted } from '@/lib/entity-cache';
import { toast, toastError } from '@/lib/toast';
import { buildRunFavorite } from '@/providers/home-data';
import { useTablePrefsStore } from '@/store/table-prefs.store';
import {
  compareWithPreviousRun,
  emptyRunComparisonSelection,
  getPreviousRun,
} from './repository-runs-table-utils';
import { RerunButton } from './rerun-button';
import { RunComparisonDialog } from './run-comparison-dialog';
import { RunItemCounts } from './run-item-counts';

type RepositoryTableProps = {
  orgId: string;
  productId: string;
  repoId: string;
  pageIndex: number;
  pageSize: number;
  search: {
    page?: number | undefined;
    pageSize?: number | undefined;
  };
};

type RunComparisonContext = {
  /** The run before the given one, from the rows of the page and the row after them. */
  getPreviousRun: (runIndex: number) => OrtRunSummary | undefined;
  onCompare: (runIndex: number) => void;
};

const pollInterval = config.pollInterval;

const columnHelper = createAppColumnHelper<OrtRunSummary>();

/** The revision of a run, with its configuration context and labels folded below. */
const RevisionCell = ({ summary }: { summary: OrtRunSummary }) => {
  const hasLabels = Object.keys(summary.labels).length > 0;

  return (
    <div className='flex min-w-0 flex-col gap-1'>
      <div className='flex min-w-0 items-baseline gap-1.5'>
        <span className='truncate font-medium'>{summary.revision}</span>
        {summary.resolvedRevision &&
          summary.revision !== summary.resolvedRevision && (
            <Sha1Component sha1={summary.resolvedRevision} />
          )}
      </div>
      <Accordion type='multiple' className='w-full'>
        <AccordionItem value='configuration' className='border-b-0'>
          <AccordionTrigger
            className='text-muted-foreground hover:text-foreground flex-none items-center gap-1 py-0 text-[0.8125rem] font-normal hover:no-underline [&>svg]:size-3.5 [&>svg]:translate-y-0'
            headerClassName='items-center gap-2'
          >
            Configuration
          </AccordionTrigger>
          <AccordionContent className='flex flex-col gap-1.5 pt-2 pb-0'>
            <div className='flex flex-wrap items-baseline gap-1.5 text-[0.8125rem]'>
              <span className='text-muted-foreground'>Context</span>
              <span>{summary.jobConfigContext}</span>
              {summary.resolvedJobConfigContext &&
                summary.jobConfigContext !==
                  summary.resolvedJobConfigContext && (
                  <Sha1Component sha1={summary.resolvedJobConfigContext} />
                )}
            </div>
            {hasLabels && (
              <div className='flex w-full flex-wrap gap-1'>
                {Object.entries(summary.labels!).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant='secondary'
                    className='max-w-full min-w-0 shrink font-mono font-normal break-words whitespace-normal'
                  >
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

const CreatedCell = ({ summary }: { summary: OrtRunSummary }) => (
  <div className='text-muted-foreground flex min-w-0 flex-col text-[0.8125rem] tabular-nums'>
    <TimestampWithUTC
      timestamp={summary.createdAt}
      className='w-fit text-left whitespace-nowrap'
    />
    {summary.userDisplayName && (
      <div className='flex min-w-0 items-baseline gap-1'>
        <span className='shrink-0'>by</span>
        {summary.userDisplayName.username ? (
          <Tooltip>
            <TooltipTrigger className='text-foreground min-w-0 truncate text-left'>
              {summary.userDisplayName.fullName ||
                summary.userDisplayName.username}
            </TooltipTrigger>
            <TooltipContent>{summary.userDisplayName.username}</TooltipContent>
          </Tooltip>
        ) : (
          <span className='text-foreground min-w-0 truncate'>
            {summary.userDisplayName.fullName}
          </span>
        )}
      </div>
    )}
  </div>
);

type FavoriteContext = {
  organization?: Organization;
  product?: Product;
  repository?: Repository;
};

const RunIndexCell = ({
  favoriteContext,
  summary,
}: {
  favoriteContext: FavoriteContext;
  summary: OrtRunSummary;
}) => {
  const { organization, product, repository } = favoriteContext;

  return (
    <div className='flex items-center gap-1'>
      <Link
        className='link tabular-nums'
        to={
          '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex'
        }
        params={{
          orgId: summary.organizationId.toString(),
          productId: summary.productId.toString(),
          repoId: summary.repositoryId.toString(),
          runIndex: summary.index.toString(),
        }}
      >
        {summary.index}
      </Link>
      {organization && product && repository && (
        <FavoriteButton
          favorite={buildRunFavorite(
            organization,
            product,
            repository,
            summary
          )}
          size='xs'
          variant='ghost'
          className='size-6 p-0'
        />
      )}
    </div>
  );
};

const createColumns = (
  favoriteContext: FavoriteContext,
  comparison: RunComparisonContext
) =>
  columnHelper.columns([
    columnHelper.accessor('index', {
      header: 'Run',
      size: 76,
      cell: ({ row }) => (
        <RunIndexCell
          favoriteContext={favoriteContext}
          summary={row.original}
        />
      ),
      enableColumnFilter: false,
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      size: 150,
      cell: ({ row }) => <StatusMark status={row.original.status} />,
      enableColumnFilter: false,
    }),
    columnHelper.display({
      id: 'jobs',
      header: 'Jobs',
      size: 104,
      cell: ({ row }) => (
        <OrtRunJobStatus
          jobs={row.original.jobs}
          orgId={row.original.organizationId.toString()}
          productId={row.original.productId.toString()}
          repoId={row.original.repositoryId.toString()}
          runIndex={row.original.index.toString()}
        />
      ),
      enableColumnFilter: false,
    }),
    columnHelper.display({
      id: 'findings',
      header: 'Findings',
      size: 190,
      cell: ({ row }) => (
        <RunItemCounts
          summary={row.original}
          previous={comparison.getPreviousRun(row.original.index)}
        />
      ),
      enableColumnFilter: false,
    }),
    columnHelper.display({
      id: 'revision',
      header: 'Revision',
      minSize: 220,
      cell: ({ row }) => <RevisionCell summary={row.original} />,
      meta: {
        isGrow: true,
      },
      enableColumnFilter: false,
    }),
    columnHelper.display({
      id: 'created',
      header: 'Created',
      size: 160,
      cell: ({ row }) => <CreatedCell summary={row.original} />,
      enableColumnFilter: false,
    }),
    columnHelper.display({
      id: 'duration',
      header: 'Duration',
      size: 92,
      cell: ({ row }) => (
        <div className='text-muted-foreground text-[0.8125rem] tabular-nums'>
          <RunDuration
            createdAt={row.original.createdAt}
            finishedAt={row.original.finishedAt ?? undefined}
          />
        </div>
      ),
      enableColumnFilter: false,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 184,
      cell: function Row({ row }) {
        const queryClient = useQueryClient();

        const repository = useSuspenseQuery({
          ...getRepositoryOptions({
            path: {
              repositoryId: row.original.repositoryId,
            },
          }),
        });

        const { isAllowed: canTriggerRun } = useRepositoryPermission(
          row.original.repositoryId,
          'TRIGGER_ORT_RUN'
        );

        const { isAllowed: canDeleteRun } = useRepositoryPermission(
          row.original.repositoryId,
          'DELETE'
        );

        const { mutateAsync: deleteRun } = useMutation({
          ...deleteRepositoryRunMutation(),
          onSuccess() {
            toast.info('Delete Run', {
              description: `Run "${row.original.index}" deleted successfully.`,
            });
            runDeleted(
              queryClient,
              row.original.repositoryId,
              row.original.index
            );
          },
          onError(error: ApiError) {
            toastError(error.message, error);
          },
        });

        async function handleDelete() {
          await deleteRun({
            path: {
              ortRunIndex: row.original.index,
              repositoryId: row.original.repositoryId,
            },
          });
        }

        return (
          <div className='flex items-center gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='outline' asChild size='icon'>
                  <Link
                    to={
                      '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex'
                    }
                    params={{
                      orgId: row.original.organizationId.toString(),
                      productId: row.original.productId.toString(),
                      repoId: row.original.repositoryId.toString(),
                      runIndex: row.original.index.toString(),
                    }}
                  >
                    <View />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View the details of this run</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  aria-label={`Compare run ${row.original.index}…`}
                  onClick={() => comparison.onCompare(row.original.index)}
                >
                  <GitCompare />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Compare findings and configuration with another run
              </TooltipContent>
            </Tooltip>
            <RerunButton
              orgId={row.original.organizationId.toString()}
              productId={row.original.productId.toString()}
              repoId={row.original.repositoryId.toString()}
              runIndex={row.original.index}
              canTriggerRun={canTriggerRun}
              compact
            />
            <DeleteDialog
              thingName={
                <>
                  run with index{' '}
                  <span className='font-bold'>{row.original.index}</span> from
                  repository{' '}
                  <span className='font-bold'>{repository.data.url}</span>
                </>
              }
              uiComponent={<DeleteIconButton />}
              onDelete={handleDelete}
              disabled={canDeleteRun === false}
            />
          </div>
        );
      },
      enableColumnFilter: false,
    }),
  ]);

export const RepositoryRunsTable = ({
  orgId,
  productId,
  repoId,
  pageIndex,
  pageSize,
  search,
}: RepositoryTableProps) => {
  const setRunPageSize = useTablePrefsStore((state) => state.setRunPageSize);
  const repositoryId = Number.parseInt(repoId);
  const [comparisonSelection, setComparisonSelection] = useState(
    emptyRunComparisonSelection
  );

  const handleComparisonDialogOpenChange = (open: boolean) => {
    setComparisonSelection((selection) => ({
      ...selection,
      isDialogOpen: open,
    }));
  };

  const { data: organization } = useQuery({
    ...getOrganizationOptions({
      path: { organizationId: Number.parseInt(orgId) },
    }),
  });

  const { data: product } = useQuery({
    ...getProductOptions({
      path: { productId: Number.parseInt(productId) },
    }),
  });

  const { data: repository } = useQuery({
    ...getRepositoryOptions({
      path: { repositoryId },
    }),
  });

  const {
    data: runs,
    error: runsError,
    isPending: runsIsPending,
    isError: runsIsError,
  } = useQuery({
    ...getRepositoryRunsOptions({
      path: {
        repositoryId,
      },
      // One row more than the page shows, so that the last row can show the change since the
      // run before it.
      query: {
        limit: pageSize + 1,
        offset: pageIndex * pageSize,
        sort: '-index',
      },
    }),
    // Poll only while a listed run can still change.
    refetchInterval: (query) =>
      query.state.data?.data.some((run) => !isRunFinished(run.status))
        ? pollInterval
        : false,
  });

  const loadedRuns = runs?.data ?? [];
  const pageRuns = loadedRuns.slice(0, pageSize);

  const columns = createColumns(
    { organization, product, repository },
    {
      getPreviousRun: (runIndex) => getPreviousRun(loadedRuns, runIndex),
      onCompare: (runIndex) =>
        setComparisonSelection(compareWithPreviousRun(loadedRuns, runIndex)),
    }
  );

  const table = useAppTable(
    {
      data: pageRuns,
      columns,
      pageCount: Math.ceil((runs?.pagination.totalCount ?? 0) / pageSize),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
      },
      manualPagination: true,
    },
    selectNoTableState
  );

  if (runsIsPending) {
    return <LoadingIndicator />;
  }

  if (runsIsError) {
    return <LoadError error={runsError} />;
  }

  return (
    <>
      <DataTable
        table={table}
        setCurrentPageOptions={(currentPage) => {
          return {
            search: { ...search, page: currentPage },
          };
        }}
        setPageSizeOptions={(size) => {
          setRunPageSize(size);
          return {
            search: { ...search, page: 1, pageSize: size },
          };
        }}
      />
      <RunComparisonDialog
        repositoryId={repositoryId}
        open={comparisonSelection.isDialogOpen}
        onOpenChange={handleComparisonDialogOpenChange}
        baseRunIndex={comparisonSelection.baseRunIndex}
        comparedRunIndex={comparisonSelection.comparedRunIndex}
        knownRuns={loadedRuns}
      />
    </>
  );
};
