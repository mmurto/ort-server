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

import {
  AdvisorJob,
  AnalyzerJob,
  EvaluatorJob,
  NotifierJob,
  ReporterJob,
  ScannerJob,
} from '@/api';
import { RunDuration } from '@/components/run-duration';
import { StatusMark } from '@/components/status-mark';

type JobTitleProps = {
  title: string;
  job:
    | AnalyzerJob
    | AdvisorJob
    | ScannerJob
    | EvaluatorJob
    | ReporterJob
    | NotifierJob
    | null
    | undefined;
};

export const JobTitle = ({ title, job }: JobTitleProps) => {
  return (
    <div className='grid grid-cols-[6rem_auto_1fr] items-center gap-2'>
      <span className='font-semibold'>{title}</span>
      {job?.status ? (
        <StatusMark status={job.status} />
      ) : (
        <span className='bg-neutral-soft text-muted-foreground inline-flex h-5 items-center rounded-xs px-1.5 text-[0.6875rem] leading-4 font-semibold tracking-[0.06em] whitespace-nowrap uppercase'>
          Not run
        </span>
      )}
      <span className='text-muted-foreground text-[0.8125rem] font-normal'>
        {job?.startedAt &&
          (job.finishedAt ? (
            <span className='flex items-center gap-1'>
              in
              <RunDuration
                createdAt={job.startedAt}
                finishedAt={job.finishedAt}
              />
            </span>
          ) : (
            <span className='flex items-center'>
              (
              <RunDuration createdAt={job.startedAt} finishedAt={undefined} />)
            </span>
          ))}
      </span>
    </div>
  );
};
