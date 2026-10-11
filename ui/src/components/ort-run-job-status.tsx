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

/**
 * The jobs of a run as a compact trajectory: one flat segment per job, in pipeline order,
 * coloured by the job's status.
 */
export const OrtRunJobStatus = ({
  jobs,
  orgId,
  productId,
  repoId,
  runIndex,
}: OrtRunJobStatusProps) => {
  return (
    <div className='flex items-center gap-0.5'>
      {RUN_JOBS.map(({ key, label }) => {
        const job = jobs[key];
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Link
                to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/config'
                params={{ orgId, productId, repoId, runIndex }}
                search={{ job: key }}
                className='py-1.5'
                aria-label={`${label}: ${job?.status ?? 'not included'}`}
              >
                <span
                  className={`${getStatusClass(job?.status)} ${getStatusBackgroundColor(job?.status)}`}
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
