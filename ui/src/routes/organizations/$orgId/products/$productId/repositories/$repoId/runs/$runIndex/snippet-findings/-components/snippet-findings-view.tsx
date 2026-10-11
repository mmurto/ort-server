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

import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ExpandedState } from '@tanstack/react-table';
import { useState } from 'react';

import { SnippetFindingProvenance } from '@/api';
import {
  getRepositoryRunOptions,
  getRunSnippetFindingProvenancesOptions,
} from '@/api/@tanstack/react-query.gen';
import { BreakableString } from '@/components/breakable-string';
import { DataTableCards } from '@/components/data-table-cards/data-table-cards';
import { CopyableValue } from '@/components/data-table-cards/findings-cells';
import { SheetSection } from '@/components/page-header';
import { Sha1Component } from '@/components/sha1-component';
import {
  EMPTY_SORTING_STATE,
  updateColumnSorting,
} from '@/helpers/handle-multisort';
import { identifierToString } from '@/helpers/identifier-conversion';
import {
  createAppColumnHelper,
  selectNoTableState,
  useAppTable,
} from '@/hooks/use-app-table';
import { toastError } from '@/lib/toast';
import { ProvenanceSnippetFindingsTable } from './provenance-snippet-findings-table';
import {
  getSnippetFindingProvenancePageCount,
  getSnippetFindingProvenancesQuery,
} from './snippet-findings-state';

const provenanceColumnHelper =
  createAppColumnHelper<SnippetFindingProvenance>();
const defaultPageSize = 10;
const snippetFindingsRoutePath =
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/snippet-findings/';

const isValidRevision = (
  revision: string | null | undefined
): revision is string =>
  revision != null && revision !== '' && revision !== '.';

const ProvenanceDetails = ({
  provenance,
}: {
  provenance: SnippetFindingProvenance;
}) => {
  if (provenance.artifactUrl) {
    return (
      <div className='flex min-w-0 items-center gap-1'>
        <a
          href={provenance.artifactUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='link'
        >
          <BreakableString text={provenance.artifactUrl} />
        </a>
      </div>
    );
  }

  if (provenance.vcsUrl) {
    return (
      <div className='flex min-w-0 items-center gap-1'>
        <a
          href={provenance.vcsUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='link'
        >
          <BreakableString text={provenance.vcsUrl} />
        </a>
        {isValidRevision(provenance.vcsRevision) && (
          <Sha1Component sha1={provenance.vcsRevision} />
        )}
      </div>
    );
  }

  return <span className='text-muted-foreground'>N/A</span>;
};

export const SnippetFindingsView = () => {
  const params = useParams({ from: snippetFindingsRoutePath });
  const search = useSearch({ from: snippetFindingsRoutePath });
  const navigate = useNavigate({ from: snippetFindingsRoutePath });
  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : defaultPageSize;
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
  });

  const {
    data: provenances,
    isError,
    error,
  } = useSuspenseQuery({
    ...getRunSnippetFindingProvenancesOptions({
      path: { runId: ortRun.id },
      query: getSnippetFindingProvenancesQuery(
        pageIndex,
        pageSize,
        search.sortBy
      ),
    }),
  });

  const columns = provenanceColumnHelper.columns([
    provenanceColumnHelper.display({
      id: 'package',
      header: 'Package',
      cell: ({ row }) => {
        const identifier = identifierToString(row.original.identifier);

        return (
          <CopyableValue
            value={identifier}
            className='font-mono text-xs font-medium'
          >
            <span title={identifier}>{identifier}</span>
          </CopyableValue>
        );
      },
    }),
    provenanceColumnHelper.display({
      id: 'provenanceType',
      header: 'Provenance type',
      cell: ({ row }) => (
        <span className='label-caps text-foreground whitespace-nowrap'>
          {row.original.provenanceType}
        </span>
      ),
    }),
    provenanceColumnHelper.display({
      id: 'findings',
      header: 'Findings',
      cell: ({ row }) => (
        <span className='text-muted-foreground whitespace-nowrap tabular-nums'>
          {row.original.snippetFindingCount} finding
          {row.original.snippetFindingCount === 1 ? '' : 's'}
        </span>
      ),
    }),
    provenanceColumnHelper.display({
      id: 'provenance',
      header: 'Provenance',
      cell: ({ row }) => <ProvenanceDetails provenance={row.original} />,
    }),
    provenanceColumnHelper.accessor((row) => row.identifier.type, {
      id: 'type',
      header: 'Type',
    }),
    provenanceColumnHelper.accessor((row) => row.identifier.namespace, {
      id: 'namespace',
      header: 'Namespace',
    }),
    provenanceColumnHelper.accessor((row) => row.identifier.name, {
      id: 'name',
      header: 'Name',
    }),
    provenanceColumnHelper.accessor((row) => row.identifier.version, {
      id: 'version',
      header: 'Version',
    }),
  ]);

  const table = useAppTable(
    {
      data: provenances.data,
      columns,
      pageCount: getSnippetFindingProvenancePageCount(
        provenances.pagination.totalCount,
        pageSize
      ),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
        sorting: search.sortBy ?? EMPTY_SORTING_STATE,
        expanded,
        columnVisibility: {
          type: false,
          namespace: false,
          name: false,
          version: false,
        },
      },
      onExpandedChange: setExpanded,
      getRowCanExpand: () => true,
      manualPagination: true,
    },
    selectNoTableState
  );

  if (isError) {
    toastError('Unable to load data', error);
    return;
  }

  const scannerWasIncludedInRun = ortRun.jobs.scanner != null;
  const noResultsContent = !scannerWasIncludedInRun ? (
    <div className='text-muted-foreground text-[0.8125rem]'>
      No detected snippets are available because the scanner job was not enabled
      for this run.
    </div>
  ) : provenances.pagination.totalCount === 0 ? (
    <div className='text-muted-foreground text-[0.8125rem]'>
      No detected snippets were found for this run, or no snippet scanner was
      used.
    </div>
  ) : undefined;

  return (
    <SheetSection
      title='Detected snippets'
      meta={`${provenances.pagination.totalCount} package provenances with findings`}
    >
      <p className='text-muted-foreground -mt-2 text-[0.8125rem] max-md:line-clamp-1'>
        Snippet findings detected in package provenances by the configured
        scanners.
      </p>
      <DataTableCards
        table={table}
        aria-label='Package provenances with snippet findings'
        layout={[
          {
            id: 'package',
            width: 'minmax(0,2fr)',
            sortBy: 'name',
            mobile: 'main',
          },
          {
            id: 'provenanceType',
            width: 'max-content',
            sortBy: 'type',
            mobile: 'end',
          },
          { id: 'findings', width: 'max-content', mobile: 'end' },
          { id: 'provenance', width: 'minmax(0,2fr)', mobile: 'sub' },
        ]}
        onToggleExpanded={(row) => {
          const isOpening = !row.getIsExpanded();

          setExpanded(isOpening ? { [row.id]: true } : {});
          navigate({
            search: {
              ...search,
              findingsPage: 1,
              snippetsPage: 1,
            },
            replace: true,
          });
        }}
        noResultsContent={noResultsContent}
        renderSubComponent={({ row }) => (
          <ProvenanceSnippetFindingsTable
            runId={ortRun.id}
            provenance={row.original}
          />
        )}
        setCurrentPageOptions={(currentPage) => {
          return {
            to: '.',
            search: { ...search, page: currentPage },
          };
        }}
        setPageSizeOptions={(size) => {
          return {
            to: '.',
            search: { ...search, page: 1, pageSize: size },
          };
        }}
        setSortingOptions={(sortBy) => {
          return {
            to: '.',
            search: {
              ...search,
              sortBy: updateColumnSorting(search.sortBy, sortBy),
            },
          };
        }}
      />
    </SheetSection>
  );
};
