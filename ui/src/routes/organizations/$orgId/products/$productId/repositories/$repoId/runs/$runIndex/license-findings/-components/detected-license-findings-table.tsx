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

import { useQuery } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';

import { LicenseFinding } from '@/api';
import { getRunDetectedLicenseFindingsOptions } from '@/api/@tanstack/react-query.gen';
import swhLogo from '@/assets/software-heritage-logo.svg';
import { CopyToClipboard } from '@/components/copy-to-clipboard';
import { DataTableCards } from '@/components/data-table-cards/data-table-cards';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import { createLicenseFindingCurationTemplate } from '@/lib/license-finding-curation';
import { KEEP_SCROLL_POSITION } from '@/lib/scroll';
import { buildSwhBrowseUrl } from '@/lib/software-heritage';
import { formatLineRange } from '@/lib/utils';
import {
  getLicenseFindingsTableState,
  getLicenseTablePagination,
  updateLicenseFindingsTable,
} from './license-findings-state';

const findingColumnHelper = createAppColumnHelper<LicenseFinding>();
const licenseFindingsRoutePath =
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/license-findings/';

type DetectedLicenseFindingsTableProps = {
  runId: number;
  license: string;
  identifier: string;
  purl?: string;
};

export const DetectedLicenseFindingsTable = ({
  runId,
  license,
  identifier,
  purl,
}: DetectedLicenseFindingsTableProps) => {
  const search = useSearch({ from: licenseFindingsRoutePath });
  const { pageIndex: findingsPageIndex, pageSize: findingsPageSize } =
    getLicenseTablePagination(
      getLicenseFindingsTableState(search, license, identifier)
    );

  const {
    data: findings,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getRunDetectedLicenseFindingsOptions({
      path: {
        runId,
        license,
        identifier,
      },
      query: {
        limit: findingsPageSize,
        offset: findingsPageIndex * findingsPageSize,
      },
    }),
  });

  const findingColumns = findingColumnHelper.columns([
    findingColumnHelper.accessor('path', {
      id: 'path',
      header: 'Path',
      cell: ({ row }) => {
        const url = purl
          ? buildSwhBrowseUrl(
              purl,
              row.original.path,
              row.original.startLine,
              row.original.endLine
            )
          : null;

        const curationTemplate = createLicenseFindingCurationTemplate({
          id: identifier,
          path: row.original.path,
          startLine: row.original.startLine,
          endLine: row.original.endLine,
          detectedLicense: license,
        });

        return (
          <div className='flex min-w-0 items-start gap-1'>
            <span className='min-w-0 font-mono text-xs break-all'>
              {row.original.path}
            </span>
            <CopyToClipboard
              copyText={curationTemplate}
              tooltipText='Copy license finding curation template to clipboard'
              className='h-5 shrink-0 px-1 align-middle'
            />
            {url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-0.5 shrink-0'
                  >
                    <img
                      src={swhLogo}
                      alt='Software Heritage'
                      className='h-4 w-4'
                    />
                  </a>
                </TooltipTrigger>
                <TooltipContent>View in Software Heritage</TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    }),
    findingColumnHelper.accessor('startLine', {
      id: 'startLine',
      header: 'Line Range',
      cell: ({ row }) => (
        <span className='text-muted-foreground whitespace-nowrap tabular-nums'>
          {formatLineRange(row.original.startLine, row.original.endLine)}
        </span>
      ),
    }),
    findingColumnHelper.accessor('score', {
      id: 'score',
      header: 'Score',
      cell: ({ row }) => (
        <span className='tabular-nums'>{row.original.score ?? '-'}</span>
      ),
    }),
    findingColumnHelper.accessor('scanner', {
      id: 'scanner',
      header: 'Scanner',
      cell: ({ row }) => (
        <span className='text-muted-foreground wrap-break-word'>
          {row.original.scanner}
        </span>
      ),
    }),
  ]);

  const findingsTable = useAppTable(
    {
      data: findings?.data || [],
      columns: findingColumns,
      pageCount: Math.ceil(
        (findings?.pagination.totalCount ?? 0) / findingsPageSize
      ),
      state: {
        pagination: {
          pageIndex: findingsPageIndex,
          pageSize: findingsPageSize,
        },
      },
      manualPagination: true,
    },
    selectNoTableState
  );

  if (isPending) {
    return <LoadingIndicator />;
  }

  if (isError) {
    return <LoadError error={error} />;
  }

  return (
    <section
      aria-label={`License findings for ${identifier} under ${license}`}
      className='flex flex-col gap-2'
    >
      <div className='text-muted-foreground text-[0.8125rem]'>
        License findings ({findings.pagination.totalCount} in total).
      </div>
      <DataTableCards
        table={findingsTable}
        aria-label={`License findings for ${identifier}`}
        globalShortcuts={false}
        layout={[
          { id: 'path', width: 'minmax(0,2fr)', mobile: 'main' },
          { id: 'startLine', width: 'max-content', mobile: 'end' },
          { id: 'score', width: 'max-content', mobile: 'end' },
          { id: 'scanner', width: 'minmax(0,1fr)', mobile: 'sub' },
        ]}
        setCurrentPageOptions={(currentPage) => {
          return {
            to: '.',
            search: (previous) =>
              updateLicenseFindingsTable(previous, license, identifier, {
                page: currentPage,
              }),
            ...KEEP_SCROLL_POSITION,
          };
        }}
        setPageSizeOptions={(size) => {
          return {
            to: '.',
            search: (previous) =>
              updateLicenseFindingsTable(previous, license, identifier, {
                pageSize: size,
              }),
            ...KEEP_SCROLL_POSITION,
          };
        }}
      />
    </section>
  );
};
