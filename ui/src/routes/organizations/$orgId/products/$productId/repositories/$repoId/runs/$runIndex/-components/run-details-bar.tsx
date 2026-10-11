/*
 * Copyright (C) 2025 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
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
import { getRouteApi, Link, useLocation } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

import {
  getRepositoryRunOptions,
  getRepositoryRunsOptions,
} from '@/api/@tanstack/react-query.gen';
import { RunFavoriteButton } from '@/components/favorite-button';
import { OrtRunJobStatus } from '@/components/ort-run-job-status';
import { RunDuration } from '@/components/run-duration';
import { Sha1Component } from '@/components/sha1-component';
import { StatusMark } from '@/components/status-mark';
import { TimestampWithUTC } from '@/components/timestamp-with-utc';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { config } from '@/config';
import { useRepositoryPermission } from '@/hooks/use-authorization';
import { cn } from '@/lib/utils';
import { RerunButton } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/rerun-button';

type RunDetailsBarProps = {
  className?: string;
};

const routeApi = getRouteApi(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex'
);

export const RunDetailsBar = ({ className }: RunDetailsBarProps) => {
  const params = routeApi.useParams();
  const location = useLocation();
  const pollInterval = config.pollInterval;

  // Because the list of run indexes for a repository can be discontinuous
  // (due to run deletions), fetch and sort all run indexes to determine
  // the previous and next runs.
  const { data: allRunIndexes } = useSuspenseQuery({
    ...getRepositoryRunsOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
      },
      query: {
        limit: 100,
        sort: '-index',
      },
    }),
    select: (data) => data.data.map((run) => run.index).sort((a, b) => a - b),
  });

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
    refetchInterval: (run) => {
      if (
        run.state.data?.status === 'FINISHED' ||
        run.state.data?.status === 'FINISHED_WITH_ISSUES' ||
        run.state.data?.status === 'FAILED'
      )
        return false;
      return pollInterval;
    },
  });

  const { isAllowed: canTriggerRun } = useRepositoryPermission(
    Number.parseInt(params.repoId),
    'TRIGGER_ORT_RUN'
  );

  const currentIndex = Number.parseInt(params.runIndex);
  const latestIndex = allRunIndexes.at(-1) ?? currentIndex;
  const isOlderRun =
    allRunIndexes.length === 100 && !allRunIndexes.includes(currentIndex);

  // An older run is not among the newest 100. Its neighbours are read from a
  // window of runs around it, placed as if no runs had been deleted.
  const { data: olderRunIndexes } = useQuery({
    ...getRepositoryRunsOptions({
      path: { repositoryId: Number.parseInt(params.repoId) },
      query: {
        limit: 100,
        offset: Math.max(0, latestIndex - currentIndex - 50),
        sort: '-index',
      },
    }),
    enabled: isOlderRun,
    select: (data) => data.data.map((run) => run.index).sort((a, b) => a - b),
  });

  const runIndexes = isOlderRun ? (olderRunIndexes ?? []) : allRunIndexes;
  const currentPosition = runIndexes.indexOf(currentIndex);

  const previousIndex =
    currentPosition > 0 ? runIndexes[currentPosition - 1] : null;
  const nextIndex =
    currentPosition >= 0 && currentPosition < runIndexes.length - 1
      ? runIndexes[currentPosition + 1]
      : null;

  const hasPrevious = previousIndex !== null;
  const hasNext = nextIndex !== null;

  // Build a path to another run index while preserving the current sub-route.
  // E.g., if on .../runs/5/config, navigating to run 4 should go to
  // .../runs/4/config instead of /runs/4.
  const buildRunPath = (runIndex: number) =>
    location.pathname.replace(`/runs/${params.runIndex}`, `/runs/${runIndex}`);

  // The filters and sorting carry over to the other run, but the marked item
  // and the page belong to the items of this run.
  const runSearch = Object.fromEntries(
    Object.entries(location.search).filter(
      ([key]) => key !== 'marked' && key !== 'page'
    )
  );

  const isOverview = location.pathname
    .replace(/\/$/, '')
    .endsWith(`/runs/${params.runIndex}`);

  return (
    <header className={cn('flex flex-col gap-3 pb-6', className)}>
      <div className='flex flex-wrap items-start justify-between gap-x-8 gap-y-4'>
        <div className='flex min-w-0 flex-col gap-2'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-semibold tracking-[-0.015em]'>
              Run {ortRun.index}
            </h1>
            <StatusMark status={ortRun.status} />
            <RunFavoriteButton
              organizationId={params.orgId}
              productId={params.productId}
              repositoryId={params.repoId}
              run={ortRun}
              size='xs'
              variant='ghost'
              className='size-7 p-0'
            />
          </div>
          <dl className='text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1 text-[0.8125rem]'>
            <div className='flex items-center gap-1.5'>
              <dt>Revision</dt>
              <dd className='text-foreground flex items-center gap-1.5 font-medium'>
                {ortRun.revision}
                {ortRun.resolvedRevision &&
                  ortRun.revision !== ortRun.resolvedRevision && (
                    <>
                      <span className='text-muted-foreground font-normal'>
                        @
                      </span>
                      <Sha1Component sha1={ortRun.resolvedRevision} />
                    </>
                  )}
              </dd>
            </div>
            {ortRun.userDisplayName && (
              <div className='flex items-center gap-1.5'>
                <dt>Created by</dt>
                <dd className='text-foreground font-medium'>
                  {ortRun.userDisplayName.username ? (
                    <Tooltip>
                      <TooltipTrigger className='cursor-default'>
                        {ortRun.userDisplayName.fullName ||
                          ortRun.userDisplayName.username}
                      </TooltipTrigger>
                      <TooltipContent>
                        {ortRun.userDisplayName.username}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    ortRun.userDisplayName.fullName
                  )}
                </dd>
              </div>
            )}
            <div className='flex items-center gap-1.5'>
              <dt className='sr-only'>Created at</dt>
              <dd className='text-foreground'>
                <TimestampWithUTC timestamp={ortRun.createdAt} />
              </dd>
            </div>
            <div className='flex items-center gap-1.5'>
              <dt>Duration</dt>
              <dd className='text-foreground font-medium'>
                <RunDuration
                  createdAt={ortRun.createdAt}
                  finishedAt={ortRun.finishedAt ?? undefined}
                />
              </dd>
            </div>
            <div className='flex items-center gap-1.5'>
              <dt>Run ID</dt>
              <dd className='text-foreground font-medium'>{ortRun.id}</dd>
            </div>
            {!isOverview && (
              <div className='flex items-center gap-1.5'>
                <dt className='sr-only'>Jobs</dt>
                <dd>
                  <OrtRunJobStatus
                    jobs={ortRun.jobs}
                    orgId={params.orgId}
                    productId={params.productId}
                    repoId={params.repoId}
                    runIndex={params.runIndex}
                  />
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <nav aria-label='Runs' className='flex items-center'>
            <Button
              asChild
              variant='outline'
              size='icon'
              className='rounded-r-none'
              disabled={!hasPrevious}
            >
              <Link
                to={hasPrevious ? buildRunPath(previousIndex!) : '#'}
                search={hasPrevious ? runSearch : undefined}
                // The loaders of the run routes write the breadcrumbs into the
                // shared router context, so preloading another run would show
                // its breadcrumbs on this one.
                preload={false}
                disabled={!hasPrevious}
                aria-label='Previous run'
                className='aria-disabled:opacity-40'
              >
                <ChevronLeft />
              </Link>
            </Button>
            <Button
              asChild
              variant='outline'
              className='-ml-px rounded-none px-3'
            >
              <Link
                to='/organizations/$orgId/products/$productId/repositories/$repoId/runs'
                params={params}
              >
                All runs
              </Link>
            </Button>
            <Button
              asChild
              variant='outline'
              size='icon'
              className='-ml-px rounded-l-none'
            >
              <Link
                to={hasNext ? buildRunPath(nextIndex!) : '#'}
                search={hasNext ? runSearch : undefined}
                preload={false}
                disabled={!hasNext}
                aria-label='Next run'
                className='aria-disabled:opacity-40'
              >
                <ChevronRight />
              </Link>
            </Button>
          </nav>
          <Button asChild variant='outline'>
            <Link
              to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/sbom'
              params={params}
            >
              <Download />
              Download reports
            </Link>
          </Button>
          <RerunButton
            orgId={params.orgId}
            productId={params.productId}
            repoId={params.repoId}
            runIndex={ortRun.index}
            canTriggerRun={canTriggerRun}
          />
        </div>
      </div>
    </header>
  );
};
