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

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import type { OrtRunSummary } from '@/api';
import { getRepositoryRunsOptions } from '@/api/@tanstack/react-query.gen';
import {
  DEFAULT_RUNS,
  RunsFilterForm,
  type RunsFilterValues,
} from '@/components/form/runs-filter-form';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { config } from '@/config';
import { formatDuration } from '@/helpers/format-elapsed';
import { RUN_JOBS } from '@/helpers/run-jobs';

type JobDurationsProps = {
  repoId: string;
  pageIndex: number;
  pageSize: number;
};

const pollInterval = config.pollInterval;

type Segment = {
  key: string;
  label: string;
  color: string;
  start: number;
  duration: number;
  lane: number;
};

/**
 * Lays out the jobs of a run on its own clock. With infrastructure included, jobs sit where they
 * actually ran, so the gaps between them are the time spent on infrastructure and parallel jobs
 * get lanes of their own; without it, the jobs are packed back to back.
 */
const layoutRun = (run: OrtRunSummary, withInfrastructure: boolean) => {
  const createdAt = Date.parse(run.createdAt);
  const now = Date.now();
  const timed = RUN_JOBS.flatMap(({ key, label, color }) => {
    const job = run.jobs[key];
    if (!job?.startedAt) return [];
    const from = Date.parse(job.startedAt);
    const to = job.finishedAt ? Date.parse(job.finishedAt) : now;
    return [{ key, label, color, from, duration: Math.max(to - from, 0) }];
  });

  const segments: Segment[] = [];
  const laneEnds: number[] = [];
  let cursor = 0;
  for (const job of timed) {
    if (withInfrastructure) {
      const start = job.from - createdAt;
      const free = laneEnds.findIndex((end) => end <= start);
      const lane = free === -1 ? laneEnds.length : free;
      laneEnds[lane] = start + job.duration;
      segments.push({ ...job, start, lane });
    } else {
      segments.push({ ...job, start: cursor, lane: 0 });
      cursor += job.duration;
    }
  }

  const total = withInfrastructure
    ? (run.finishedAt ? Date.parse(run.finishedAt) : now) - createdAt
    : cursor;
  return {
    segments,
    total: Math.max(total, 0),
    lanes: Math.max(laneEnds.length, 1),
  };
};

/**
 * The durations of the repository's runs: every run's jobs on one shared time scale, so runs
 * that took longer read longer. Selecting a run opens it.
 */
export const JobDurations = ({
  repoId,
  pageIndex,
  pageSize,
}: JobDurationsProps) => {
  const navigate = useNavigate();

  // This state drives the query for the runs, and it is updated on form submission.
  const [applied, setApplied] = useState<RunsFilterValues>({
    fetchMode: 'VISIBLE_RUNS',
    nRuns: DEFAULT_RUNS,
  });

  // Whether the time between jobs, spent on infrastructure, is part of the timelines.
  const [showInfrastructure, setShowInfrastructure] = useState(false);

  // Compute query params from applied values.
  const limit = applied.fetchMode === 'VISIBLE_RUNS' ? pageSize : applied.nRuns;
  const offset =
    applied.fetchMode === 'VISIBLE_RUNS' ? pageIndex * pageSize : undefined;

  const {
    data: runs,
    error: runsError,
    isPending: runsIsPending,
    isError: runsIsError,
  } = useQuery({
    ...getRepositoryRunsOptions({
      path: {
        repositoryId: Number.parseInt(repoId),
      },
      query: { limit, offset, sort: '-index' },
    }),

    refetchInterval: pollInterval,
  });

  if (runsIsPending) {
    return <LoadingIndicator />;
  }

  if (runsIsError) {
    return <LoadError error={runsError} />;
  }

  if (runs.pagination.totalCount === 0) {
    return null;
  }

  const laidOut = runs.data.map((run) => ({
    run,
    ...layoutRun(run, showInfrastructure),
  }));
  const scale = Math.max(...laidOut.map(({ total }) => total), 1);

  const openRun = (run: OrtRunSummary) =>
    navigate({
      to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex',
      params: {
        orgId: run.organizationId.toString(),
        productId: run.productId.toString(),
        repoId: run.repositoryId.toString(),
        runIndex: run.index.toString(),
      },
    });

  return (
    <SheetSection
      title='Durations'
      actions={
        <div className='flex flex-wrap items-center justify-end gap-x-6 gap-y-2'>
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground text-[0.8125rem]'>
              Show durations for
            </span>
            <RunsFilterForm
              initialValues={applied}
              onApply={(values) => {
                // Normalize and apply; this triggers refetch via derived params.
                setApplied({
                  fetchMode: values.fetchMode,
                  nRuns:
                    values.fetchMode === 'CUSTOM_RUNS'
                      ? (values.nRuns ?? DEFAULT_RUNS)
                      : undefined,
                });
              }}
            />
          </div>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='infra'
              checked={showInfrastructure}
              onCheckedChange={(value) => {
                setShowInfrastructure(value === true);
              }}
            />
            <Label htmlFor='infra' className='font-normal'>
              Include infrastructure durations
            </Label>
          </div>
        </div>
      }
    >
      <div className='border-foreground border-t pt-2'>
        <ul className='flex max-h-72 flex-col overflow-y-auto'>
          {laidOut.map(({ run, segments, total, lanes }) => (
            <li key={run.id}>
              <button
                type='button'
                onClick={() => openRun(run)}
                aria-label={`Run ${run.index}, ${formatDuration(total)}`}
                className='hover:bg-muted/70 grid w-full grid-cols-[4.5rem_minmax(0,1fr)_5rem] items-center gap-3 py-1.5 text-left text-[0.8125rem] transition-colors duration-100'
              >
                <span className='font-medium'>Run {run.index}</span>
                <span
                  className='relative block'
                  style={{ height: `${lanes * 6 + (lanes - 1) * 2}px` }}
                >
                  {showInfrastructure && (
                    <span
                      aria-hidden
                      className='bg-border absolute top-0 left-0 h-1.5'
                      style={{ width: `${(total / scale) * 100}%` }}
                    />
                  )}
                  {segments.map((segment) => (
                    <span
                      key={segment.key}
                      title={`${segment.label}: ${formatDuration(segment.duration)}`}
                      className='animate-draw-x absolute h-1.5 origin-left'
                      style={{
                        left: `${(segment.start / scale) * 100}%`,
                        width: `max(${(segment.duration / scale) * 100}%, 2px)`,
                        top: `${segment.lane * 8}px`,
                        backgroundColor: segment.color,
                      }}
                    />
                  ))}
                </span>
                <span className='text-muted-foreground text-right'>
                  {total > 0 ? formatDuration(total) : '—'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className='text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs'>
          {RUN_JOBS.map(({ key, label, color }) => (
            <span key={key} className='flex items-center gap-1.5'>
              <span
                aria-hidden
                className='size-2'
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
          ))}
          {showInfrastructure && (
            <span className='flex items-center gap-1.5'>
              <span aria-hidden className='bg-border size-2' />
              Infrastructure
            </span>
          )}
        </div>
      </div>
    </SheetSection>
  );
};
