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
import { Download } from 'lucide-react';

import { getRepositoryRunOptions } from '@/api/@tanstack/react-query.gen';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { config } from '@/config';
import { formatFileSize } from '@/helpers/format-file-size';
import { useUser } from '@/hooks/use-user.ts';
import { toastError } from '@/lib/toast';

const API_URL = config.API_URL;

const ReportComponent = () => {
  const params = Route.useParams();
  const { user } = useUser();

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
  });

  const downloadZipFile = async ({
    runId,
    fileName,
  }: {
    runId: number;
    fileName: string;
  }) => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/runs/${runId}/reporter/${fileName}`,
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

      // Convert the response to a Blob
      const blob = await response.blob();
      // Create a temporary URL for the Blob
      const url = window.URL.createObjectURL(blob);
      // Create an anchor element
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      // Programmatically trigger a click event on the anchor element
      a.click();
      // Clean up by revoking the URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toastError('Unable to download report', error);
    }
  };

  async function handleDownload(runId: number, filename: string) {
    await downloadZipFile({
      runId: runId,
      fileName: filename,
    });
  }

  const reports =
    ortRun.jobs.reporter?.reportFilenames?.filter(
      (filename) =>
        !filename.toLowerCase().includes('spdx') &&
        !filename.toLowerCase().includes('cyclonedx')
    ) ?? [];
  const sizesMap = ortRun.jobs.reporter?.reportSizesInBytes;

  return (
    <SheetSection
      title='Other report formats'
      meta={`${reports.length} ${reports.length === 1 ? 'file' : 'files'}`}
    >
      <p className='text-muted-foreground -mt-2 text-[0.8125rem]'>
        Click the file to download.
      </p>
      {reports.length > 0 ? (
        <ul className='divide-y border-y'>
          {reports.map((filename) => {
            const sizeBytes =
              sizesMap && filename in sizesMap ? sizesMap[filename] : undefined;
            return (
              <li key={filename}>
                <Button
                  variant='ghost'
                  className='h-auto w-full justify-between gap-4 rounded-none px-2 py-2 font-normal whitespace-normal'
                  onClick={() => handleDownload(ortRun.id, filename)}
                >
                  <span className='flex min-w-0 items-center gap-2'>
                    <Download className='text-muted-foreground size-3.5' />
                    <span className='font-mono text-xs break-all'>
                      {filename}
                    </span>
                  </span>
                  <span className='text-muted-foreground shrink-0 text-xs'>
                    {sizeBytes !== undefined
                      ? formatFileSize(sizeBytes)
                      : 'Unknown size'}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className='text-muted-foreground text-[0.8125rem]'>
          No reports available.
        </p>
      )}
    </SheetSection>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/reports/'
)({
  component: ReportComponent,
  pendingComponent: LoadingIndicator,
});
