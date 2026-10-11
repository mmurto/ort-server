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

import type { Jobs, JobStatus } from '@/api';
import { RUN_JOBS } from '@/helpers/run-jobs';

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

/** The log levels an archive can be downloaded at, from the least to the most detail. */
export const LOG_LEVELS: readonly { level: LogLevel; description: string }[] = [
  { level: 'ERROR', description: 'Only errors.' },
  { level: 'WARN', description: 'Errors and warnings.' },
  {
    level: 'INFO',
    description:
      'Errors, warnings and the progress of each step; a good place to start.',
  },
  {
    level: 'DEBUG',
    description:
      'Everything, including detailed diagnostics. The largest archive.',
  },
];

type LogStepJob = {
  status: JobStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type LogStep = {
  key: string;
  label: string;
  /** The job of the step; the configuration step has none. */
  job?: LogStepJob;
};

/**
 * The steps of a run whose logs the archives hold: the configuration step, which always runs, and
 * the jobs of the run in pipeline order.
 */
export const getLogSteps = (jobs: Jobs): LogStep[] => {
  const jobSteps = [
    ...RUN_JOBS,
    { key: 'notifier', label: 'Notifier' } as const,
  ].flatMap(({ key, label }) => {
    const job = jobs[key];

    return job ? [{ key, label, job }] : [];
  });

  return [{ key: 'config', label: 'Configuration' }, ...jobSteps];
};

/**
 * The step names to request logs for: the jobs of the run, plus the configuration step, which is
 * always run implicitly and not part of the jobs.
 */
export const getLogStepNames = (jobs: Jobs): string[] =>
  Object.keys(jobs).concat('config');

/**
 * How long a job ran, in milliseconds: until it finished, or until now while it still runs.
 * Undefined while the job has not started.
 */
export const getJobDuration = (
  job: LogStepJob,
  now: number
): number | undefined => {
  if (!job.startedAt) return undefined;

  const end = job.finishedAt ? Date.parse(job.finishedAt) : now;

  return Math.max(0, end - Date.parse(job.startedAt));
};
