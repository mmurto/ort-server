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
import { ChevronDownIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { getRepositoryRunOptions } from '@/api/@tanstack/react-query.gen';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { config } from '@/config';
import { useUser } from '@/hooks/use-user.ts';
import { toastError } from '@/lib/toast';

const API_URL = config.API_URL;

const ReportComponent = () => {
  const params = Route.useParams();
  const [level, setLevel] = useState('INFO');
  const [isPending, setIsPending] = useState(false);
  const { user } = useUser();

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
  });

  const downloadLogs = async (
    runId: number,
    level: string = '',
    steps: string = ''
  ) => {
    setIsPending(true);
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
      setIsPending(false);
    }
  };

  const handleLevelChoice = (level: string) => {
    // Get the list of steps that were run to only request logs for those steps. The `config` step is
    // always run implicitly and not part of the jobs, so add that manually.
    const jobNames = Object.keys(ortRun.jobs).concat('config');
    downloadLogs(ortRun.id, level, jobNames.join(','));
  };

  return (
    <SheetSection title='Logs'>
      <p className='text-muted-foreground -mt-2 max-w-[75ch] text-[0.8125rem]'>
        Click the button to download. To download a different log level, choose
        it from the dropdown. Note that the log levels are additive, eg. DEBUG
        logs include all the log levels, while WARN logs include only errors and
        warnings.
      </p>
      <div className='flex align-middle'>
        <Button
          disabled={isPending}
          onClick={() => handleLevelChoice(level)}
          variant='outline'
          className='rounded-r-none'
        >
          {isPending ? (
            <>
              <span>Downloading logs...</span>
              <Loader2 className='animate-spin' />
            </>
          ) : (
            `Download ${level} level archive`
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isPending}
              variant='outline'
              className={'rounded-l-none border-l-0 px-2 pt-1'}
            >
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setLevel('ERROR');
                handleLevelChoice('ERROR');
              }}
            >
              Download ERROR level archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setLevel('WARN');
                handleLevelChoice('WARN');
              }}
            >
              Download WARN level archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setLevel('INFO');
                handleLevelChoice('INFO');
              }}
            >
              Download INFO level archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setLevel('DEBUG');
                handleLevelChoice('DEBUG');
              }}
            >
              Download DEBUG level archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SheetSection>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/logs/'
)({
  component: ReportComponent,
  pendingComponent: LoadingIndicator,
});
