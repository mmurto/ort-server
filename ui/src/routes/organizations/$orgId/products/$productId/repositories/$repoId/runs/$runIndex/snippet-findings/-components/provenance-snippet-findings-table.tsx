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
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ExpandedState } from '@tanstack/react-table';
import { useState } from 'react';

import { SnippetFinding, SnippetFindingProvenance } from '@/api';
import { getRunProvenanceSnippetFindingsOptions } from '@/api/@tanstack/react-query.gen';
import { DataTableCards } from '@/components/data-table-cards/data-table-cards';
import { LoadError } from '@/components/load-error';
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
import { formatLineRange } from '@/lib/utils';
import { SnippetFindingSnippetsTable } from './snippet-finding-snippets-table';

const findingColumnHelper = createAppColumnHelper<SnippetFinding>();
const defaultPageSize = 10;
const snippetFindingsRoutePath =
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/snippet-findings/';

type ProvenanceSnippetFindingsTableProps = {
  runId: number;
  provenance: SnippetFindingProvenance;
};

export const ProvenanceSnippetFindingsTable = ({
  runId,
  provenance,
}: ProvenanceSnippetFindingsTableProps) => {
  const search = useSearch({ from: snippetFindingsRoutePath });
  const navigate = useNavigate({ from: snippetFindingsRoutePath });
  const findingsPageIndex = search.findingsPage ? search.findingsPage - 1 : 0;
  const findingsPageSize = search.findingsPageSize || defaultPageSize;
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const {
    data: findings,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getRunProvenanceSnippetFindingsOptions({
      path: {
        runId,
        provenanceId: provenance.id,
      },
      query: {
        limit: findingsPageSize,
        offset: findingsPageIndex * findingsPageSize,
        sort: convertToBackendSorting(search.findingsSortBy),
      },
    }),
  });

  const findingColumns = findingColumnHelper.columns([
    findingColumnHelper.accessor('path', {
      id: 'path',
      header: 'Path',
      cell: ({ row }) => (
        <span className='font-mono text-xs break-all'>{row.original.path}</span>
      ),
    }),
    findingColumnHelper.accessor('startLine', {
      id: 'startLine',
      header: 'Line Range',
      enableSorting: false,
      cell: ({ row }) => (
        <span className='text-muted-foreground whitespace-nowrap tabular-nums'>
          {formatLineRange(row.original.startLine, row.original.endLine)}
        </span>
      ),
    }),
    findingColumnHelper.accessor('snippetCount', {
      id: 'snippetCount',
      header: 'Snippet Count',
      cell: ({ row }) => (
        <span className='whitespace-nowrap tabular-nums'>
          {row.original.snippetCount}
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
        sorting: search.findingsSortBy ?? EMPTY_SORTING_STATE,
        expanded,
      },
      onExpandedChange: setExpanded,
      getRowCanExpand: () => true,
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
    <DataTableCards
      table={findingsTable}
      aria-label='Snippet findings'
      globalShortcuts={false}
      layout={[
        {
          id: 'path',
          width: 'minmax(0,1fr)',
          sortBy: 'path',
          mobile: 'main',
        },
        { id: 'startLine', width: 'max-content', mobile: 'end' },
        {
          id: 'snippetCount',
          width: 'max-content',
          sortBy: 'snippetCount',
          mobile: 'end',
        },
      ]}
      onToggleExpanded={(row) => {
        const isOpening = !row.getIsExpanded();

        setExpanded(isOpening ? { [row.id]: true } : {});
        navigate({
          search: (previous) => ({
            ...previous,
            snippetsPage: 1,
          }),
          replace: true,
          resetScroll: false,
        });
      }}
      renderSubComponent={({ row }) => (
        <SnippetFindingSnippetsTable
          runId={runId}
          snippetFindingId={row.original.id}
        />
      )}
      // The search is updated from the latest one, so the open details stay.
      setCurrentPageOptions={(currentPage) => {
        return {
          to: '.',
          search: (previous) => ({
            ...previous,
            findingsPage: currentPage,
          }),
          resetScroll: false,
        };
      }}
      setPageSizeOptions={(size) => {
        return {
          to: '.',
          search: (previous) => ({
            ...previous,
            findingsPage: 1,
            findingsPageSize: size,
          }),
          resetScroll: false,
        };
      }}
      setSortingOptions={(sortBy) => {
        return {
          to: '.',
          search: (previous) => ({
            ...previous,
            findingsSortBy: updateColumnSorting(
              previous.findingsSortBy,
              sortBy
            ),
          }),
          resetScroll: false,
        };
      }}
    />
  );
};
