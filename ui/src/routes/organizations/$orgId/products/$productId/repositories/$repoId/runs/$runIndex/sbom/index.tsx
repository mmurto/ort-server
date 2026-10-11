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

import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import type { ReactNode } from 'react';

import { getRepositoryRunOptions } from '@/api/@tanstack/react-query.gen';
import CycloneDXDark from '@/assets/cyclonedx-logo-black.svg';
import CycloneDXLight from '@/assets/cyclonedx-logo-white.svg';
import SPDX from '@/assets/spdx-logo-color.svg';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
import { useTheme } from '@/components/theme-provider-context';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { config } from '@/config';
import { formatFileSize } from '@/helpers/format-file-size';
import { useUser } from '@/hooks/use-user.ts';
import { toastError } from '@/lib/toast';

const API_URL = config.API_URL;

/** One SBOM format: its logo, a short description and the downloadable files. */
const SbomFormat = ({
  homepage,
  logo,
  description,
  filenames,
  sizes,
  getFormat,
  emptyText,
  onDownload,
}: {
  homepage: string;
  logo: ReactNode;
  description: ReactNode;
  filenames: string[] | undefined;
  sizes: Record<string, number> | undefined;
  getFormat: (filename: string) => string;
  emptyText: string;
  onDownload: (filename: string) => void;
}) => (
  <div className='flex flex-col gap-4 py-5 md:px-6 md:first:pl-0 md:last:pr-0'>
    <a
      href={homepage}
      target='_blank'
      rel='noopener noreferrer'
      className='self-start'
    >
      <Tooltip>
        <TooltipTrigger>{logo}</TooltipTrigger>
        <TooltipContent>Click to visit the homepage</TooltipContent>
      </Tooltip>
    </a>
    <p className='text-muted-foreground max-w-[60ch] text-[0.8125rem]'>
      {description}
    </p>
    <div className='flex flex-wrap gap-2'>
      {filenames && filenames.length > 0 ? (
        filenames.map((filename) => {
          const sizeBytes =
            sizes && filename in sizes ? sizes[filename] : undefined;
          const format = getFormat(filename);
          const sizeLabel =
            sizeBytes !== undefined
              ? formatFileSize(sizeBytes)
              : 'Unknown size';
          return (
            <Tooltip key={filename}>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant='outline'
                    className='h-auto whitespace-normal'
                    onClick={() => onDownload(filename)}
                  >
                    <Download />
                    {format}
                    <span className='text-muted-foreground text-xs font-normal'>
                      {sizeLabel}
                    </span>
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Click to download in {format} format
              </TooltipContent>
            </Tooltip>
          );
        })
      ) : (
        <span className='text-muted-foreground text-[0.8125rem]'>
          {emptyText}
        </span>
      )}
    </div>
  </div>
);

const SBOMComponent = () => {
  const params = Route.useParams();
  // For CycloneDX, no SVG logo was found which would adapt to the color
  // theme automatically. Two different logos are provided instead in
  // https://cyclonedx.org/about/branding/ and the correct one is selected
  // based on the current mode.
  const { mode } = useTheme();
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

  const spdxReports = ortRun.jobs.reporter?.reportFilenames?.filter(
    (filename) => filename.toLowerCase().includes('spdx')
  );

  const cycloneDxReports = ortRun.jobs.reporter?.reportFilenames?.filter(
    (filename) => filename.toLowerCase().includes('cyclonedx')
  );

  const sizesMap = ortRun.jobs.reporter?.reportSizesInBytes;

  const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

  const reportCount =
    (cycloneDxReports?.length ?? 0) + (spdxReports?.length ?? 0);

  return (
    <SheetSection
      title='SBOMs'
      meta={`${reportCount} ${reportCount === 1 ? 'file' : 'files'}`}
    >
      <div className='grid divide-y border-y md:grid-cols-2 md:divide-x md:divide-y-0'>
        <SbomFormat
          homepage='https://cyclonedx.org/'
          logo={
            <img
              alt='CycloneDX'
              src={
                mode === 'dark' || (mode === 'system' && systemMode === 'dark')
                  ? CycloneDXLight
                  : CycloneDXDark
              }
              width={160}
            />
          }
          description={
            <>
              <a
                className='link'
                href='https://cyclonedx.org/'
                target='_blank'
                rel='noopener noreferrer'
              >
                CycloneDX
              </a>{' '}
              is a standard format for creating software Bill of Materials
              (SBOMs) to improve software supply chain transparency and
              security.
            </>
          }
          filenames={cycloneDxReports}
          sizes={sizesMap}
          getFormat={(filename) => (filename.includes('json') ? 'JSON' : 'XML')}
          emptyText='No CycloneDX reports available.'
          onDownload={(filename) => handleDownload(ortRun.id, filename)}
        />
        <SbomFormat
          homepage='https://spdx.dev/'
          logo={<img alt='SPDX' src={SPDX} width={104} />}
          description={
            <>
              <a
                className='link'
                href='https://spdx.dev/'
                target='_blank'
                rel='noopener noreferrer'
              >
                System Package Data Exchange (SPDX)
              </a>{' '}
              is an open standard capable of representing systems with software
              components as SBOMs (Software Bill of Materials).
            </>
          }
          filenames={spdxReports}
          sizes={sizesMap}
          getFormat={(filename) =>
            filename.includes('json') ? 'JSON' : 'YAML'
          }
          emptyText='No SPDX reports available.'
          onDownload={(filename) => handleDownload(ortRun.id, filename)}
        />
      </div>
    </SheetSection>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/sbom/'
)({
  component: SBOMComponent,
  pendingComponent: LoadingIndicator,
});
