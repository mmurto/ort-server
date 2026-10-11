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

import { Link } from '@tanstack/react-router';

import { PagedResponseOrtRunSummary } from '@/api';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getStatusBackgroundColor,
  getStatusClass,
} from '@/helpers/get-status-class';
import { RUN_JOBS } from '@/helpers/run-jobs';
import { RunDuration } from './run-duration';

type OrtRunJobStatusProps = {
  jobs: PagedResponseOrtRunSummary['data'][0]['jobs'];
  orgId: string;
  productId: string;
  repoId: string;
  runIndex: string;
};

const MIN_SHARE = 0.08;

const durationOf = (
  job:
    { startedAt?: string | null; finishedAt?: string | null } | null | undefined
) =>
  job?.startedAt
    ? Math.max(
        (job.finishedAt ? Date.parse(job.finishedAt) : Date.now()) -
          Date.parse(job.startedAt),
        0
      )
    : 0;

/**
 * The jobs of a run as a compact timeline: one flat segment per
 * job in pipeline order, its length proportional to how long the job ran and its colour its
 * status.
 */
export const OrtRunJobStatus = ({
  jobs,
  orgId,
  productId,
  repoId,
  runIndex,
}: OrtRunJobStatusProps) => {
  return (
    <div className='flex w-24 items-center gap-px'>
      {RUN_JOBS.map(({ key, label }) => {
        const job = jobs[key];
        const total = RUN_JOBS.reduce(
          (sum, j) => sum + durationOf(jobs[j.key]),
          0
        );
        const share = total > 0 ? durationOf(job) / total : 0;
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Link
                to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/config'
                params={{ orgId, productId, repoId, runIndex }}
                search={{ job: key }}
                className='min-w-1.5 py-1.5'
                style={{ flexGrow: Math.max(share, MIN_SHARE) }}
                aria-label={`${label}: ${job?.status ?? 'not included'}`}
              >
                <span
                  className={`${getStatusClass(job?.status)} ${getStatusBackgroundColor(job?.status)} w-full`}
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <div className='flex flex-col'>
                <div className='flex gap-2'>
                  <div>{label}:</div>
                  <div>
                    {job?.status || 'Not started / not included in run'}
                  </div>
                </div>
                {job?.startedAt && (
                  <div className='flex gap-2'>
                    <div>Duration:</div>
                    <RunDuration
                      createdAt={job.startedAt}
                      finishedAt={job.finishedAt ?? undefined}
                    />
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
