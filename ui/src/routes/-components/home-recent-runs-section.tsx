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
import { Link, type LinkProps } from '@tanstack/react-router';
import { AxiosError } from 'axios';
import { X } from 'lucide-react';
import { useEffect } from 'react';

import { OrtRunStatus } from '@/api';
import {
  getRepositoryRunOptions,
  getRunStatisticsOptions,
} from '@/api/@tanstack/react-query.gen';
import { ItemCounts } from '@/components/item-counts';
import { OrtRunJobStatus } from '@/components/ort-run-job-status';
import { SheetSection } from '@/components/page-header';
import { RunDuration } from '@/components/run-duration';
import { StatusMark } from '@/components/status-mark';
import { TimestampWithUTC } from '@/components/timestamp-with-utc';
import { Button } from '@/components/ui/button';
import { config } from '@/config';
import { isJobFinished } from '@/helpers/job-helpers';
import { cn } from '@/lib/utils';
import { RecentRunItem, useHomeRecentRunActions } from '@/providers/home-data';
import { HomeEmptyState } from './home-empty-state';

const isNotFoundError = (error: unknown) =>
  error instanceof AxiosError &&
  (error.status ?? error.response?.status) === 404;

// Stop polling once a run has reached a terminal state, matching the behavior
// of the run details page.
const isRunFinished = (status: OrtRunStatus | undefined) =>
  status === 'FINISHED' ||
  status === 'FINISHED_WITH_ISSUES' ||
  status === 'FAILED';

/** Render a recent run and mark it if the run can no longer be loaded. */
const RecentRunListItem = ({ recentRun }: { recentRun: RecentRunItem }) => {
  const { removeRecentRun, setRecentRunUnavailable } =
    useHomeRecentRunActions();
  const runQuery = useQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: recentRun.repositoryId,
        ortRunIndex: recentRun.runIndex,
      },
    }),
    // Stop asking for a run that is gone, but keep retrying a single failed request, which
    // can also happen for a run that is still there.
    refetchInterval: (query) =>
      isRunFinished(query.state.data?.status) ||
      isNotFoundError(query.state.error)
        ? false
        : config.pollInterval,
    retry: (failureCount) => failureCount < 3,
  });

  const isMissing = isNotFoundError(runQuery.error);
  const isUnavailable = isMissing || Boolean(recentRun.unavailable);

  useEffect(() => {
    // Only a confirmed answer changes the mark, so that a run keeps its state while it is
    // loading or while the server cannot be reached at all.
    if (isMissing && !recentRun.unavailable) {
      setRecentRunUnavailable(recentRun.id, true);
    } else if (runQuery.isSuccess && recentRun.unavailable) {
      setRecentRunUnavailable(recentRun.id, false);
    }
  }, [
    isMissing,
    recentRun.id,
    recentRun.unavailable,
    runQuery.isSuccess,
    setRecentRunUnavailable,
  ]);

  const run = runQuery.data;
  const statistics = useQuery({
    ...getRunStatisticsOptions({
      path: { runId: run?.id ?? recentRun.runId },
    }),
    enabled: Boolean(run?.jobs) && !isMissing,
    refetchInterval: isRunFinished(run?.status) ? false : config.pollInterval,
  });

  const status = run?.status ?? recentRun.status;
  const createdAt = run?.createdAt ?? recentRun.createdAt;
  const params = {
    orgId: recentRun.organizationId.toString(),
    productId: recentRun.productId.toString(),
    repoId: recentRun.repositoryId.toString(),
    runIndex: recentRun.runIndex.toString(),
  };

  return (
    <li
      className={cn(
        'flex flex-col gap-1 border-b py-2.5',
        isUnavailable && 'opacity-60'
      )}
    >
      <div className='flex items-center gap-3'>
        <div className='min-w-0 flex-1 text-[0.8125rem] break-words'>
          <span className='text-muted-foreground'>
            {recentRun.organizationName} / {recentRun.productName} /{' '}
          </span>
          <span className='font-medium'>{recentRun.repositoryName}</span>
        </div>
        <Link
          to={recentRun.to as LinkProps['to']}
          params={params as LinkProps['params']}
          className='link shrink-0 text-[0.8125rem] tabular-nums'
        >
          Run {recentRun.runIndex}
        </Link>
        <div className='flex w-36 shrink-0 items-center justify-end gap-1'>
          {isUnavailable ? (
            <span className='bg-neutral-soft text-muted-foreground inline-flex h-5 items-center rounded-xs px-1.5 text-[0.6875rem] leading-4 font-semibold tracking-[0.06em] uppercase'>
              Unavailable
            </span>
          ) : (
            status && <StatusMark status={status} />
          )}
          {isUnavailable && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-5'
              aria-label='Remove run from the list'
              onClick={() => removeRecentRun(recentRun.id)}
            >
              <X className='size-3' />
            </Button>
          )}
        </div>
      </div>

      {isUnavailable && (
        <p className='text-muted-foreground text-[0.8125rem]'>
          This run can no longer be loaded. It may have been deleted, or you may
          no longer have access to it.
        </p>
      )}

      <div className='text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[0.8125rem] tabular-nums'>
        <div className='flex min-w-0 flex-wrap items-center gap-1'>
          <span>Started</span>
          {createdAt && (
            <TimestampWithUTC
              timestamp={createdAt}
              className='text-foreground'
            />
          )}
          {createdAt && !isUnavailable && (
            // A run without a finishing time keeps counting, which must not happen for a
            // run that is not there anymore.
            <span className='flex items-center'>
              {'('}
              <RunDuration
                createdAt={createdAt}
                finishedAt={run?.finishedAt ?? undefined}
              />
              {')'}
            </span>
          )}
        </div>
        {run?.jobs && (
          <div className='flex shrink-0 items-center gap-4'>
            <OrtRunJobStatus jobs={run.jobs} {...params} />
            <ItemCounts
              statistics={statistics.data}
              compact
              showIssues={Boolean(isJobFinished(run.jobs.analyzer?.status))}
              showVulnerabilities={Boolean(
                isJobFinished(run.jobs.advisor?.status)
              )}
              showRuleViolations={Boolean(
                isJobFinished(run.jobs.evaluator?.status)
              )}
              link={{
                params,
                issuesSearch: {
                  sortBy: [{ id: 'severity', desc: true }],
                  itemResolved: ['Unresolved'],
                },
                vulnerabilitiesSearch: {
                  sortBy: [{ id: 'rating', desc: true }],
                  itemResolved: ['Unresolved'],
                },
                ruleViolationsSearch: {
                  sortBy: [{ id: 'severity', desc: true }],
                  itemResolved: ['Unresolved'],
                },
              }}
            />
          </div>
        )}
      </div>
    </li>
  );
};

/** Render runs recently started from this browser UI. */
export const HomeRecentRunsSection = ({
  recentRuns,
}: {
  recentRuns: RecentRunItem[];
}) => {
  return (
    <SheetSection title='Recently started runs' meta='Last 10'>
      {recentRuns.length > 0 ? (
        <ul className='border-t'>
          {recentRuns.map((recentRun) => (
            <RecentRunListItem key={recentRun.id} recentRun={recentRun} />
          ))}
        </ul>
      ) : (
        <HomeEmptyState>
          Runs you start from the UI in this browser will appear here.
        </HomeEmptyState>
      )}
    </SheetSection>
  );
};
