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

import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Download, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getRepositoryRunOptions } from '@/api/@tanstack/react-query.gen';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
import { StatusMark } from '@/components/status-mark';
import { TimestampWithUTC } from '@/components/timestamp-with-utc';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { config } from '@/config';
import { formatDuration } from '@/helpers/format-elapsed';
import { isRunFinished } from '@/helpers/job-helpers';
import { useUser } from '@/hooks/use-user.ts';
import { toastError } from '@/lib/toast';
import {
  getJobDuration,
  getLogStepNames,
  getLogSteps,
  LOG_LEVELS,
  type LogLevel,
  type LogStep,
} from './-components/log-steps';

const API_URL = config.API_URL;

/** The current time, ticking every second while `ticking` is set. */
const useNow = (ticking: boolean) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  return now;
};

const LogStepRow = ({ step, now }: { step: LogStep; now: number }) => {
  const { job } = step;
  const duration = job ? getJobDuration(job, now) : undefined;
  const isRunning = job !== undefined && !job.finishedAt;

  return (
    <TableRow>
      <TableCell className='font-medium'>{step.label}</TableCell>
      <TableCell>
        {job ? (
          <StatusMark status={job.status} />
        ) : (
          <span className='text-muted-foreground text-[0.8125rem]'>
            Always included
          </span>
        )}
      </TableCell>
      <TableCell className='text-muted-foreground text-[0.8125rem] tabular-nums'>
        {job?.startedAt ? <TimestampWithUTC timestamp={job.startedAt} /> : '—'}
      </TableCell>
      <TableCell className='text-right text-[0.8125rem] tabular-nums'>
        {duration === undefined ? (
          <span className='text-muted-foreground'>—</span>
        ) : (
          <span className={isRunning ? 'text-muted-foreground' : undefined}>
            {formatDuration(duration)}
            {isRunning && <span className='sr-only'> so far</span>}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
};

const LogsComponent = () => {
  const params = Route.useParams();
  const [pendingLevel, setPendingLevel] = useState<LogLevel>();
  const { user } = useUser();

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
    // Keep the steps current while the run still changes.
    refetchInterval: (query) =>
      isRunFinished(query.state.data?.status) ? false : config.pollInterval,
  });

  const steps = getLogSteps(ortRun.jobs);
  const now = useNow(steps.some((step) => step.job && !step.job.finishedAt));

  const downloadLogs = async (
    runId: number,
    level: LogLevel,
    steps: string = ''
  ) => {
    setPendingLevel(level);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/runs/${runId}/logs?level=${level}&steps=${steps}`,
        {
          headers: {
            Authorization: `Bearer ${user?.access_token}`,
          },
        }
      );

      // Check if the response status is not in the 2xx range
      if (!response.ok) {
        throw new Error();
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = response.headers
        .get('content-disposition')
        ?.split(';')
        .find((entry) => entry.includes('filename='))
        ?.replace('filename=', '')
        .trim();
      a.download = filename ?? `run-${runId}-${level}-logs.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toastError('Unable to download logs', error);
    } finally {
      setPendingLevel(undefined);
    }
  };

  const handleLevelChoice = (level: LogLevel) => {
    // Only request logs for the steps that were run.
    downloadLogs(ortRun.id, level, getLogStepNames(ortRun.jobs).join(','));
  };

  return (
    <div className='flex flex-col gap-8'>
      <SheetSection title='Logs'>
        <p className='text-muted-foreground -mt-2 max-w-[75ch] text-[0.8125rem]'>
          Download the logs of this run as a ZIP archive with the logs of each
          step listed below. The levels are additive: each level holds
          everything of the levels above it, so DEBUG holds all messages while
          WARN holds only errors and warnings.
        </p>
        <ul className='divide-y border-y'>
          {LOG_LEVELS.map(({ level, description }) => (
            <li
              key={level}
              className='grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-4 py-2'
            >
              <span className='font-mono text-xs font-medium'>{level}</span>
              <span className='text-muted-foreground text-[0.8125rem]'>
                {description}
              </span>
              <Button
                variant='outline'
                disabled={pendingLevel !== undefined}
                aria-label={`Download ${level} level archive`}
                onClick={() => handleLevelChoice(level)}
              >
                {pendingLevel === level ? (
                  <>
                    <Loader2 className='animate-spin' />
                    Downloading…
                  </>
                ) : (
                  <>
                    <Download />
                    Download
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      </SheetSection>
      <SheetSection title='Steps' meta={`${steps.length} in the archive`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead className='text-right'>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((step) => (
              <LogStepRow key={step.key} step={step} now={now} />
            ))}
          </TableBody>
        </Table>
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/logs/'
)({
  component: LogsComponent,
  pendingComponent: LoadingIndicator,
});
