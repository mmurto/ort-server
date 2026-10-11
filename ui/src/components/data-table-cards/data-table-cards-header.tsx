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

import { Link, LinkOptions } from '@tanstack/react-router';
import type { RowData } from '@tanstack/react-table';
import { ArrowDown, ArrowUp } from 'lucide-react';

import type { DataTableCardsColumn } from '@/components/data-table-cards/data-table-cards-layout';
import { DataTableCardsSort } from '@/components/data-table-cards/data-table-cards-sort';
import { DataTableFilter } from '@/components/data-table/data-table-filter';
import type {
  AppColumn,
  AppReactTable,
  AppTableState,
} from '@/hooks/use-app-table';
import { cn } from '@/lib/utils';

const selectHeaderState = (state: AppTableState) => ({
  columnFilters: state.columnFilters,
  columnVisibility: state.columnVisibility,
  sorting: state.sorting,
});

type SortingOptions = (sorting: {
  id: string;
  desc: boolean | undefined;
}) => LinkOptions;

interface DataTableCardsHeaderProps<TData extends RowData> {
  table: AppReactTable<TData>;
  /** The columns of the grid. Without them, only the trailing cell is shown. */
  layout?: DataTableCardsColumn[];
  setSortingOptions?: SortingOptions;
}

// The filter buttons carry the column title for small screens, where the
// column labels are hidden. On wide screens, the label names the column, so the
// title is only kept for assistive technology.
const filterClassName =
  'flex items-center md:[&_button>span]:sr-only [&_button]:h-6';

function HeaderFilters<TData extends RowData>({
  columns,
}: {
  columns: AppColumn<TData, unknown>[];
}) {
  return columns.map((column) => (
    <div className={filterClassName} key={column.id}>
      <DataTableFilter column={column} showTitle />
    </div>
  ));
}

function SortLabel<TData extends RowData>({
  label,
  column,
  setSortingOptions,
}: {
  label: string;
  column: AppColumn<TData, unknown>;
  setSortingOptions: SortingOptions;
}) {
  // The column keeps its identity when it is sorted; only its methods return
  // the new state, so this component must not be compiled.
  'use no memo';

  const isSorted = column.getIsSorted();

  return (
    <Link
      {...setSortingOptions({
        id: column.id,
        desc: isSorted === 'desc' ? undefined : isSorted === 'asc',
      })}
      className={cn(
        'hover:text-foreground flex min-w-0 items-center gap-1',
        isSorted && 'text-foreground'
      )}
      aria-label={`${label}, ${
        isSorted === 'asc'
          ? 'sorted ascending'
          : isSorted === 'desc'
            ? 'sorted descending'
            : 'not sorted'
      }`}
    >
      <span className='truncate'>{label}</span>
      {isSorted === 'asc' && <ArrowUp className='size-3 shrink-0' />}
      {isSorted === 'desc' && <ArrowDown className='size-3 shrink-0' />}
    </Link>
  );
}

export function DataTableCardsHeader<TData extends RowData>({
  table,
  layout = [],
  setSortingOptions,
}: DataTableCardsHeaderProps<TData>) {
  return (
    <table.Subscribe selector={selectHeaderState}>
      {() => {
        const filterable = (id: string) => {
          const column = table.getColumn(id);
          return column && !column.getIsVisible() && column.getCanFilter()
            ? [column]
            : [];
        };
        const claimed = new Set(layout.flatMap((column) => column.filters));
        // Hidden filtering columns that no column header offers are shown in
        // the trailing header cell, next to the sort menu.
        const unclaimed = table
          .getAllColumns()
          .filter(
            (column) =>
              !claimed.has(column.id) &&
              !column.getIsVisible() &&
              column.getCanFilter()
          );

        return (
          <div
            role='row'
            className='border-foreground border-b-border flex min-h-9 flex-wrap items-center border-t border-b px-2 py-1 max-md:justify-end max-md:gap-x-3 md:col-span-full md:grid md:grid-cols-subgrid md:py-0'
          >
            {layout.map((column) => {
              const sortColumn = column.sortBy
                ? table.getColumn(column.sortBy)
                : undefined;
              const label =
                column.label ??
                table.getColumn(column.id)?.columnDef.header?.toString() ??
                '';

              return (
                <div
                  role='columnheader'
                  key={column.id}
                  className='label-caps flex min-w-0 items-center gap-1 max-md:contents'
                >
                  <span className='flex min-w-0 items-center max-md:hidden'>
                    {sortColumn?.getCanSort() && setSortingOptions ? (
                      <SortLabel
                        label={label}
                        column={sortColumn}
                        setSortingOptions={setSortingOptions}
                      />
                    ) : (
                      <span className='truncate'>{label}</span>
                    )}
                  </span>
                  <HeaderFilters
                    columns={(column.filters ?? []).flatMap(filterable)}
                  />
                </div>
              );
            })}
            <div
              role='columnheader'
              className='flex items-center justify-end gap-3'
            >
              {unclaimed.map((column) => (
                <div className='flex items-center gap-2' key={column.id}>
                  <DataTableFilter column={column} showTitle />
                </div>
              ))}
              <DataTableCardsSort
                table={table}
                setSortingOptions={setSortingOptions}
              />
            </div>
          </div>
        );
      }}
    </table.Subscribe>
  );
}
