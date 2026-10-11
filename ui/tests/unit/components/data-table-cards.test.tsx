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

import type { LinkOptions } from '@tanstack/react-router';
import type { SortingState } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DataTableCardsHeader } from '@/components/data-table-cards/data-table-cards-header';
import { DataTableCardsSort } from '@/components/data-table-cards/data-table-cards-sort';
import { CopyableValue } from '@/components/data-table-cards/findings-cells';
import {
  selectCountsByResolution,
  sumCounts,
} from '@/components/data-table-cards/findings-counts';
import { FindingsFilterChips } from '@/components/data-table-cards/findings-filter-chips';
import {
  selectNoTableState,
  useAppTable,
  type AppColumnDef,
  type AppReactTable,
} from '@/hooks/use-app-table';

type TestRow = {
  filter: string;
  sort: string;
};

type TableHarnessOptions = {
  columns: AppColumnDef<TestRow>[];
  columnVisibility: Record<string, boolean>;
  sorting: SortingState | undefined;
};

const data: TestRow[] = [{ filter: 'filter value', sort: 'sort value' }];

const hiddenFilterColumn: AppColumnDef<TestRow> = {
  accessorKey: 'filter',
  header: 'Hidden filter',
  enableSorting: false,
  meta: {
    filter: {
      filterVariant: 'text',
      setFilterValue: () => {},
    },
  },
};

const hiddenSortColumn: AppColumnDef<TestRow> = {
  accessorKey: 'sort',
  header: 'Hidden sort',
  enableColumnFilter: false,
};

const setSortingOptions = (): LinkOptions => ({ to: '/' });

function renderWithTable(
  children: (table: AppReactTable<TestRow>) => ReactNode,
  { columns, columnVisibility, sorting }: TableHarnessOptions
) {
  function TableHarness() {
    const table = useAppTable(
      {
        data,
        columns,
        state: {
          columnVisibility,
          sorting,
        },
      },
      selectNoTableState
    );

    return children(table);
  }

  return renderToStaticMarkup(<TableHarness />);
}

describe('DataTableCardsHeader', () => {
  it('renders hidden column filters and sorting controls', () => {
    const markup = renderWithTable(
      (table) => (
        <DataTableCardsHeader
          table={table}
          setSortingOptions={setSortingOptions}
        />
      ),
      {
        columns: [hiddenFilterColumn, hiddenSortColumn],
        columnVisibility: { filter: false, sort: false },
        sorting: [],
      }
    );

    expect(markup).toContain('Hidden filter');
    expect(markup).toContain('>Sort<');
  });
});

// Dropdown content stays closed during static rendering, so its real Link
// descendants are not mounted and do not require a router or a Link mock.
describe('DataTableCardsSort', () => {
  it('renders nothing without sorting link options', () => {
    const markup = renderWithTable(
      (table) => <DataTableCardsSort table={table} />,
      {
        columns: [hiddenSortColumn],
        columnVisibility: { sort: false },
        sorting: [],
      }
    );

    expect(markup).toBe('');
  });

  it('renders nothing without sortable hidden columns', () => {
    const markup = renderWithTable(
      (table) => (
        <DataTableCardsSort
          table={table}
          setSortingOptions={setSortingOptions}
        />
      ),
      {
        columns: [hiddenFilterColumn],
        columnVisibility: { filter: false },
        sorting: [],
      }
    );

    expect(markup).toBe('');
  });

  it('renders the sort trigger for a sortable hidden column', () => {
    const markup = renderWithTable(
      (table) => (
        <DataTableCardsSort
          table={table}
          setSortingOptions={setSortingOptions}
        />
      ),
      {
        columns: [hiddenSortColumn],
        columnVisibility: { sort: false },
        sorting: [],
      }
    );

    expect(markup).toContain('>Sort<');
  });

  it('renders with undefined sorting state', () => {
    const markup = renderWithTable(
      (table) => (
        <DataTableCardsSort
          table={table}
          setSortingOptions={setSortingOptions}
        />
      ),
      {
        columns: [hiddenSortColumn],
        columnVisibility: { sort: false },
        sorting: undefined,
      }
    );

    expect(markup).toContain('>Sort<');
  });
});

describe('CopyableValue', () => {
  it('renders a dash and no copy button without a value', () => {
    const markup = renderToStaticMarkup(<CopyableValue value='' />);

    expect(markup).toContain('—');
    expect(markup).not.toContain('<button');
  });

  it('renders the value with a copy button', () => {
    const markup = renderToStaticMarkup(
      <CopyableValue value='pkg:npm/example@1.0' />
    );

    expect(markup).toContain('pkg:npm/example@1.0');
    expect(markup).toContain('aria-label="Copy to clipboard"');
  });
});

describe('FindingsFilterChips', () => {
  const chips = [
    { value: 'ERROR', label: 'Error', colorClass: 'bg-err', count: 3 },
    { value: 'HINT', label: 'Hint', colorClass: 'bg-ok', count: 2 },
  ];

  it('shows the counts and presses the selected chip', () => {
    const markup = renderToStaticMarkup(
      <FindingsFilterChips
        label='Filter by severity'
        chips={chips}
        total={5}
        selected={['ERROR']}
        onSelect={() => {}}
      />
    );

    expect(markup).toMatch(/aria-pressed="false"[^>]*>All<span[^>]*>5</);
    expect(markup).toMatch(/aria-pressed="true"[^>]*>.*Error<span[^>]*>3</);
  });
});

describe('selectCountsByResolution', () => {
  const all = { ERROR: 3, HINT: 2 };
  const unresolved = { ERROR: 1, HINT: 2 };

  it('selects the counts that match the resolution filter', () => {
    expect(selectCountsByResolution(all, unresolved, undefined)).toEqual(all);
    expect(selectCountsByResolution(all, unresolved, ['Unresolved'])).toEqual(
      unresolved
    );
    expect(selectCountsByResolution(all, unresolved, ['Resolved'])).toEqual({
      ERROR: 2,
      HINT: 0,
    });
    expect(sumCounts(all)).toBe(5);
  });
});
