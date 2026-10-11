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

import { SnippetSource } from '@/api';
import { getRunSnippetFindingSnippetsOptions } from '@/api/@tanstack/react-query.gen';
import { BreakableString } from '@/components/breakable-string';
import { DataTableCards } from '@/components/data-table-cards/data-table-cards';
import { CopyableValue } from '@/components/data-table-cards/findings-cells';
import { SpdxExpressionBadgeGroup } from '@/components/licenses';
import { LoadingIndicator } from '@/components/loading-indicator';
import {
  convertToBackendSorting,
  EMPTY_SORTING_STATE,
  updateColumnSorting,
} from '@/helpers/handle-multisort';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import { toastError } from '@/lib/toast';
import { formatLineRange } from '@/lib/utils';

const snippetColumnHelper = createAppColumnHelper<SnippetSource>();
const defaultPageSize = 10;
const snippetFindingsRoutePath =
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/snippet-findings/';

type SnippetFindingSnippetsTableProps = {
  runId: number;
  snippetFindingId: number;
};

const isValidRevision = (revision: string | null | undefined) =>
  revision != null && revision !== '' && revision !== '.';

const SnippetProvenance = ({ snippet }: { snippet: SnippetSource }) => {
  if (snippet.artifactUrl) {
    return (
      <a
        href={snippet.artifactUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='link'
      >
        <BreakableString text={snippet.artifactUrl} />
      </a>
    );
  }

  if (snippet.vcsUrl) {
    return (
      <div className='flex min-w-0 items-center'>
        <a
          href={snippet.vcsUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='link'
        >
          <BreakableString text={snippet.vcsUrl} />
        </a>
        {isValidRevision(snippet.vcsRevision) && (
          <span className='font-mono text-xs'>
            &nbsp;({snippet.vcsRevision})
          </span>
        )}
      </div>
    );
  }

  return <span className='text-muted-foreground'>N/A</span>;
};

export const SnippetFindingSnippetsTable = ({
  runId,
  snippetFindingId,
}: SnippetFindingSnippetsTableProps) => {
  const search = useSearch({ from: snippetFindingsRoutePath });
  const snippetsPageIndex = search.snippetsPage ? search.snippetsPage - 1 : 0;
  const snippetsPageSize = search.snippetsPageSize || defaultPageSize;

  const {
    data: snippets,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getRunSnippetFindingSnippetsOptions({
      path: {
        runId,
        snippetFindingId,
      },
      query: {
        limit: snippetsPageSize,
        offset: snippetsPageIndex * snippetsPageSize,
        sort: convertToBackendSorting(search.snippetsSortBy),
      },
    }),
  });

  const snippetColumns = snippetColumnHelper.columns([
    snippetColumnHelper.display({
      id: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <CopyableValue
          value={row.original.purl}
          className='font-mono text-xs font-medium'
        >
          <span title={row.original.purl}>{row.original.purl}</span>
        </CopyableValue>
      ),
    }),
    snippetColumnHelper.display({
      id: 'location',
      header: 'Path',
      cell: ({ row }) => (
        <div className='flex min-w-0 items-baseline gap-2'>
          <span
            className='truncate font-mono text-xs'
            title={row.original.path}
          >
            {row.original.path}
          </span>
          <span className='text-muted-foreground shrink-0 tabular-nums'>
            {formatLineRange(row.original.startLine, row.original.endLine)}
          </span>
        </div>
      ),
    }),
    snippetColumnHelper.display({
      id: 'licenseExpression',
      header: 'License',
      cell: ({ row }) => (
        <SpdxExpressionBadgeGroup expression={row.original.license} />
      ),
    }),
    snippetColumnHelper.display({
      id: 'scoreValue',
      header: 'Score',
      cell: ({ row }) => (
        <span className='font-semibold tabular-nums'>{row.original.score}</span>
      ),
    }),
    snippetColumnHelper.display({
      id: 'provenance',
      header: 'Provenance',
      cell: ({ row }) => <SnippetProvenance snippet={row.original} />,
    }),
    snippetColumnHelper.accessor('purl', {
      id: 'purl',
      header: 'PURL',
    }),
    snippetColumnHelper.accessor('license', {
      id: 'license',
      header: 'License',
    }),
    snippetColumnHelper.accessor('score', {
      id: 'score',
      header: 'Score',
    }),
  ]);

  const snippetsTable = useAppTable(
    {
      data: snippets?.data || [],
      columns: snippetColumns,
      pageCount: Math.ceil(
        (snippets?.pagination.totalCount ?? 0) / snippetsPageSize
      ),
      state: {
        pagination: {
          pageIndex: snippetsPageIndex,
          pageSize: snippetsPageSize,
        },
        sorting: search.snippetsSortBy ?? EMPTY_SORTING_STATE,
        columnVisibility: {
          purl: false,
          license: false,
          score: false,
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
    toastError('Unable to load data', error);
    return <></>;
  }

  return (
    <DataTableCards
      table={snippetsTable}
      aria-label='Snippets'
      globalShortcuts={false}
      layout={[
        {
          id: 'source',
          width: 'minmax(0,1.6fr)',
          sortBy: 'purl',
          mobile: 'main',
        },
        { id: 'location', width: 'minmax(0,1.6fr)', mobile: 'sub' },
        {
          id: 'licenseExpression',
          width: 'minmax(0,1fr)',
          sortBy: 'license',
          mobile: 'hidden',
        },
        {
          id: 'scoreValue',
          width: 'max-content',
          sortBy: 'score',
          mobile: 'end',
        },
        { id: 'provenance', width: 'minmax(0,1.4fr)', mobile: 'sub' },
      ]}
      setCurrentPageOptions={(currentPage) => {
        return {
          to: '.',
          search: {
            ...search,
            snippetsPage: currentPage,
          },
        };
      }}
      setPageSizeOptions={(size) => {
        return {
          to: '.',
          search: {
            ...search,
            snippetsPage: 1,
            snippetsPageSize: size,
          },
        };
      }}
      setSortingOptions={(sortBy) => {
        return {
          to: '.',
          search: {
            ...search,
            snippetsSortBy: updateColumnSorting(search.snippetsSortBy, sortBy),
          },
        };
      }}
    />
  );
};
