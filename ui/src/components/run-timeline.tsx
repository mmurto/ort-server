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

import { useEffect, useState } from 'react';

import type { JobStatus, JobSummaries, OrtRunStatus } from '@/api';
import { formatDuration, formatElapsed } from '@/helpers/format-elapsed';
import { RUN_JOBS, type RunJobKey } from '@/helpers/run-jobs';
import { cn } from '@/lib/utils';

export type RunTimelineEvent = {
  job: RunJobKey;
  content: React.ReactNode;
  /** Marks the event as something that needs attention. */
  alert?: boolean;
};

type RunTimelineProps = {
  createdAt: string;
  finishedAt?: string | null;
  status: OrtRunStatus;
  jobs: JobSummaries;
  events?: RunTimelineEvent[];
  /** The jobs configured for the run; jobs missing from it are shown as not included. */
  included?: RunJobKey[];
  className?: string;
};

const ACTIVE_JOB_STATUSES: JobStatus[] = ['CREATED', 'SCHEDULED', 'RUNNING'];

const STATUS_LABELS: Record<OrtRunStatus, string> = {
  CREATED: 'Created',
  ACTIVE: 'Running',
  FINISHED: 'Finished',
  FINISHED_WITH_ISSUES: 'Finished with issues',
  FAILED: 'Failed',
};

const STATUS_TEXT: Record<OrtRunStatus, string> = {
  CREATED: 'text-muted-foreground',
  ACTIVE: 'text-brand',
  FINISHED: 'text-ok',
  FINISHED_WITH_ISSUES: 'text-warn',
  FAILED: 'text-err',
};

const TICK_STEPS_SECONDS = [
  10, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, 86400,
];

const useNow = (ticking: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);
  return now;
};

/**
 * The run's timeline from creation to completion. Each job is a segment
 * in its ORT colour, placed and sized by when it ran; findings hang below the job that produced
 * them, and while the run is active a crimson marker shows the current position.
 */
export const RunTimeline = ({
  createdAt,
  finishedAt,
  status,
  jobs,
  events = [],
  included,
  className,
}: RunTimelineProps) => {
  const isActive = !finishedAt && status !== 'FAILED';
  const now = useNow(isActive);

  const start = Date.parse(createdAt);
  const end = finishedAt ? Date.parse(finishedAt) : now;
  const total = Math.max(end - start, 1000);
  const pct = (time: number) =>
    Math.min(100, Math.max(0, ((time - start) / total) * 100));

  const segments = RUN_JOBS.flatMap((meta) => {
    const job = jobs[meta.key];
    if (!job?.startedAt) return [];
    const from = Date.parse(job.startedAt);
    const to = job.finishedAt
      ? Date.parse(job.finishedAt)
      : ACTIVE_JOB_STATUSES.includes(job.status)
        ? end
        : from;
    return [
      {
        ...meta,
        status: job.status,
        left: pct(from),
        width: Math.max(pct(to) - pct(from), 0.4),
        duration: to - from,
        running: !job.finishedAt && job.status === 'RUNNING',
      },
    ];
  });

  // Jobs that run in parallel (advisor and scanner) get their own lanes. Labels stand on
  // ticks above their segment; crowded labels move to a taller second tier.
  const placed = segments.reduce<{
    items: ((typeof segments)[number] & {
      lane: number;
      tier: number;
      anchorEnd: boolean;
    })[];
    laneEnds: number[];
    lastTier0: number;
  }>(
    (acc, segment) => {
      const free = acc.laneEnds.findIndex((end) => end <= segment.left + 0.01);
      const lane = free === -1 ? acc.laneEnds.length : free;
      const laneEnds = [...acc.laneEnds];
      laneEnds[lane] = segment.left + segment.width;
      const tier = segment.left - acc.lastTier0 < 11 ? 1 : 0;
      return {
        items: [
          ...acc.items,
          { ...segment, lane, tier, anchorEnd: segment.left > 84 },
        ],
        laneEnds,
        lastTier0: tier === 0 ? segment.left : acc.lastTier0,
      };
    },
    { items: [], laneEnds: [], lastTier0: -Infinity }
  );
  const labelled = placed.items;
  const laneCount = Math.max(placed.laneEnds.length, 1);

  const notIncluded = RUN_JOBS.filter(({ key }) =>
    included ? !included.includes(key) : !jobs[key]
  );
  const plannedCount = RUN_JOBS.length - notIncluded.length;

  const step = TICK_STEPS_SECONDS.find((s) => total / 1000 / s <= 6) ?? 86400;
  const ticks: number[] = [];
  for (let t = 0; t < total * 0.94; t += step * 1000) ticks.push(t);

  const placedEvents = events.flatMap((event) => {
    const segment = segments.find((s) => s.key === event.job);
    return segment ? [{ ...event, left: segment.left }] : [];
  });

  return (
    <section aria-label='Run timeline' className={className}>
      <div className='border-foreground border-t pt-2'>
        <div className='flex h-4 items-center justify-between gap-4'>
          <span className='label-caps'>
            Run timeline · {plannedCount} {plannedCount === 1 ? 'job' : 'jobs'}
            {notIncluded.length > 0 && (
              <span className='tracking-normal normal-case'>
                {' '}
                · {notIncluded.map((j) => j.label).join(', ')} not included
              </span>
            )}
          </span>
          <span
            className={cn(
              'flex items-center gap-2 text-[0.6875rem] font-semibold tracking-[0.06em] uppercase',
              STATUS_TEXT[status]
            )}
          >
            <span className='text-foreground'>
              {formatElapsed(end - start)}
            </span>
            {STATUS_LABELS[status]}
            <span
              aria-hidden
              className={cn(
                'h-3 w-0.5',
                isActive ? 'bg-brand animate-pulse' : 'bg-foreground'
              )}
            />
          </span>
        </div>

        {/* Job labels; narrow screens list the jobs below instead */}
        <div className='relative mt-2 hidden h-14 md:block'>
          {segments.length === 0 && (
            <p className='text-muted-foreground absolute bottom-1 left-0 text-[0.8125rem]'>
              {status === 'FAILED'
                ? 'The run failed before any job started.'
                : 'Waiting for the first job to start.'}
            </p>
          )}
          {labelled.map((segment) => (
            <div
              key={segment.key}
              className={cn(
                'border-foreground absolute bottom-0 flex flex-col justify-end text-xs leading-4 whitespace-nowrap',
                segment.anchorEnd
                  ? '-translate-x-full border-r pr-1.5 text-right'
                  : 'border-l pl-1.5',
                segment.tier === 1 ? 'h-14' : 'h-9'
              )}
              style={{
                left: segment.anchorEnd
                  ? `${segment.left + segment.width}%`
                  : `${segment.left}%`,
              }}
            >
              <span className={cn(segment.tier === 1 && 'mb-auto')}>
                <span className='font-semibold'>{segment.label}</span>
                <span className='text-muted-foreground ml-1.5'>
                  {segment.running
                    ? 'running'
                    : formatDuration(segment.duration)}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Job segments */}
        <div
          className='relative'
          style={{ height: `${laneCount * 6 + (laneCount - 1) * 2}px` }}
        >
          {Array.from({ length: laneCount }).map((_, lane) => (
            <div
              key={lane}
              aria-hidden
              className={cn(
                'absolute inset-x-0 h-1.5',
                lane === 0 ? 'bg-border' : 'bg-border/50'
              )}
              style={{ top: `${lane * 8}px` }}
            />
          ))}
          {labelled.map((segment) => (
            <div
              key={segment.key}
              title={`${segment.label}: ${segment.status}`}
              className={cn(
                'animate-draw-x absolute h-1.5 origin-left',
                segment.status === 'FAILED' &&
                  'bg-[repeating-linear-gradient(135deg,var(--err)_0_3px,transparent_3px_6px)]',
                segment.running && 'animate-pulse'
              )}
              style={{
                left: `${segment.left}%`,
                width: `${segment.width}%`,
                top: `${segment.lane * 8}px`,
                backgroundColor:
                  segment.status === 'FAILED' ? undefined : segment.color,
                animationDelay: `${segment.left * 5}ms`,
              }}
            />
          ))}
          {isActive && (
            <div
              aria-hidden
              className='bg-brand absolute -top-3 -bottom-3 w-0.5 -translate-x-full'
              style={{ left: '100%' }}
            />
          )}
        </div>

        {/* Time axis */}
        <div className='text-muted-foreground relative h-5 text-[0.6875rem] leading-4'>
          {ticks.map((t) => (
            <span
              key={t}
              className='before:bg-input absolute top-1.5 -translate-x-1/2 whitespace-nowrap before:absolute before:-top-1.5 before:left-1/2 before:h-1 before:w-px first:translate-x-0 first:before:left-0 not-first:max-md:hidden'
              style={{ left: `${(t / total) * 100}%` }}
            >
              {formatElapsed(t)}
            </span>
          ))}
          <span className='text-foreground absolute top-1.5 right-0 font-medium'>
            {formatElapsed(total)}
          </span>
        </div>

        {/* Events */}
        {placedEvents.length > 0 && (
          <div className='relative hidden h-7 text-xs leading-4 md:block'>
            {placedEvents.map((event) => (
              <div
                key={event.job}
                className={cn(
                  'absolute top-1.5 pl-1.5 whitespace-nowrap',
                  event.alert && 'text-err font-medium'
                )}
                style={{ left: `${event.left}%` }}
              >
                {event.alert && (
                  <span
                    aria-hidden
                    className='bg-err after:bg-err absolute -top-[2.125rem] left-0 h-[2.375rem] w-px after:absolute after:bottom-0 after:left-0 after:h-1.5 after:w-2'
                  />
                )}
                {event.content}
              </div>
            ))}
          </div>
        )}
        <ul className='mt-1 divide-y text-[0.8125rem] md:hidden'>
          {labelled.map((segment) => {
            const event = placedEvents.find((e) => e.job === segment.key);
            return (
              <li key={segment.key} className='flex items-center gap-2 py-1.5'>
                <span
                  aria-hidden
                  className='size-2 shrink-0'
                  style={{ backgroundColor: segment.color }}
                />
                <span className='font-medium'>{segment.label}</span>
                <span className='text-muted-foreground'>
                  {segment.running
                    ? 'running'
                    : formatDuration(segment.duration)}
                </span>
                {event && (
                  <span
                    className={cn(
                      'ml-auto text-xs',
                      event.alert
                        ? 'text-err font-medium'
                        : 'text-muted-foreground'
                    )}
                  >
                    {event.content}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
