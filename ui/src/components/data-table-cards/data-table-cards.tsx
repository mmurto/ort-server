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

import { LinkOptions } from '@tanstack/react-router';
import type { RowData } from '@tanstack/react-table';
import React, { useEffect, useId, useRef, useState } from 'react';

import { DataTableCardsHeader } from '@/components/data-table-cards/data-table-cards-header';
import {
  getGridTemplate,
  resolveLayout,
  type DataTableCardsColumn,
} from '@/components/data-table-cards/data-table-cards-layout';
import { DataTableCardsRows } from '@/components/data-table-cards/data-table-cards-rows';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import type {
  AppReactTable,
  AppRow,
  AppTableState,
} from '@/hooks/use-app-table';
import { cn } from '@/lib/utils';

export type { DataTableCardsColumn } from '@/components/data-table-cards/data-table-cards-layout';

const selectBodyState = (state: AppTableState) => ({
  columnFilters: state.columnFilters,
  columnVisibility: state.columnVisibility,
  expanded: state.expanded,
  pagination: state.pagination,
  sorting: state.sorting,
});

const selectPaginationState = (state: AppTableState) => ({
  columnFilters: state.columnFilters,
  pagination: state.pagination,
  sorting: state.sorting,
});

/** Whether a key event comes from a control the user types into. */
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.closest('input, textarea, select, [contenteditable="true"]') !==
      null);

interface DataTableCardsProps<
  TData extends RowData,
> extends React.HTMLAttributes<HTMLDivElement> {
  table: AppReactTable<TData>;
  /**
   * The columns of the findings grid, from left to right. Without a layout,
   * every visible column takes an equal share of the width.
   */
  layout?: DataTableCardsColumn[];
  renderSubComponent?: (props: { row: AppRow<TData> }) => React.ReactElement;
  noResultsContent?: React.ReactNode;
  setCurrentPageOptions: (page: number) => LinkOptions;
  setPageSizeOptions: (pageSize: number) => LinkOptions;
  setSortingOptions?: (sorting: {
    id: string;
    desc: boolean | undefined;
  }) => LinkOptions;
  /**
   * A function to provide `LinkOptions` for a link that marks a row in the URL.
   * When given, every row offers to copy a link to it.
   */
  setMarkedOptions?: (marked: string) => LinkOptions;
  /** Replaces the default toggling of a row's expansion. */
  onToggleExpanded?: (row: AppRow<TData>) => void;
  /**
   * Whether J and K step through the rows while nothing on the page has focus.
   * Turn this off for grids nested in the expanded rows of another one.
   */
  globalShortcuts?: boolean;
}

export function DataTableCards<TData extends RowData>({
  table,
  layout,
  renderSubComponent,
  noResultsContent,
  className,
  setCurrentPageOptions,
  setPageSizeOptions,
  setSortingOptions,
  setMarkedOptions,
  onToggleExpanded,
  globalShortcuts = true,
  'aria-label': ariaLabel,
  ...props
}: DataTableCardsProps<TData>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridId = useId();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const columns = resolveLayout(table, layout);
  const rowId = (index: number) => `${gridId}-row-${index}`;

  const toggleRow = (row: AppRow<TData>) => {
    if (!row.getCanExpand()) return;
    if (onToggleExpanded) {
      onToggleExpanded(row);
    } else {
      row.toggleExpanded();
    }
  };

  const step = (delta: number) => {
    const count = table.getRowModel().rows.length;
    if (count === 0) return;
    setSelectedIndex((index) =>
      index < 0
        ? delta > 0
          ? 0
          : count - 1
        : Math.min(Math.max(index + delta, 0), count - 1)
    );
  };

  // Keep the selected row in view while stepping through the rows.
  useEffect(() => {
    if (selectedIndex < 0) return;
    const row = document.getElementById(`${gridId}-row-${selectedIndex}`);
    // Not every environment implements scrolling, e.g. jsdom in the tests.
    if (row && 'scrollIntoView' in row)
      row.scrollIntoView({ block: 'nearest' });
  }, [gridId, selectedIndex]);

  // J and K also work while nothing on the page has focus, e.g. after reading
  // the page. The grid takes the focus, so the arrow keys work afterwards.
  useEffect(() => {
    if (!globalShortcuts) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey) return;
      if (event.metaKey) return;
      const active = document.activeElement;
      if (active !== null && active !== document.body) return;
      const key = event.key.toLowerCase();
      if (key !== 'j' && key !== 'k') return;
      const count = table.getRowModel().rows.length;
      if (count === 0) return;

      event.preventDefault();
      setSelectedIndex((index) =>
        index < 0
          ? key === 'j'
            ? 0
            : count - 1
          : Math.min(Math.max(index + (key === 'j' ? 1 : -1), 0), count - 1)
      );
      gridRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [globalShortcuts, table]);

  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Events from portals (menus, dialogs) bubble through the React tree, but
    // are not part of the grid.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (isTypingTarget(event.target)) return;

    const onGrid = event.target === event.currentTarget;
    // The arrow keys only step through the rows from the grid or a row, so
    // they keep working in the expanded details, e.g. in an accordion.
    const onRow =
      onGrid ||
      (event.target as HTMLElement)
        .closest('[role="row"]')
        ?.hasAttribute('aria-selected') === true;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (!onRow) return;
        event.preventDefault();
        event.stopPropagation();
        step(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'j':
      case 'J':
      case 'k':
      case 'K':
        event.preventDefault();
        event.stopPropagation();
        step(event.key.toLowerCase() === 'j' ? 1 : -1);
        break;
      case 'Enter':
      case ' ': {
        // On the controls in a row, the keys keep activating the control.
        if (!onGrid) return;
        const row = table.getRowModel().rows[selectedIndex];
        if (!row) return;
        event.preventDefault();
        event.stopPropagation();
        toggleRow(row);
        break;
      }
    }
  };

  return (
    <div className={cn('flex w-full flex-col gap-3', className)} {...props}>
      <div
        ref={gridRef}
        role='grid'
        aria-label={ariaLabel}
        aria-activedescendant={
          selectedIndex >= 0 ? rowId(selectedIndex) : undefined
        }
        tabIndex={0}
        className='w-full text-[0.8125rem] outline-none md:grid md:grid-cols-(--findings-cols) md:gap-x-4'
        style={
          {
            '--findings-cols': getGridTemplate(columns),
          } as React.CSSProperties
        }
        onKeyDown={onGridKeyDown}
        onFocus={(event) => {
          // Entering the grid with the keyboard selects its first row.
          if (event.target !== event.currentTarget || selectedIndex >= 0) {
            return;
          }
          if (table.getRowModel().rows.length > 0) setSelectedIndex(0);
        }}
      >
        <DataTableCardsHeader
          table={table}
          layout={columns}
          setSortingOptions={setSortingOptions}
        />
        <table.Subscribe selector={selectBodyState}>
          {() => (
            <DataTableCardsRows
              rows={table.getRowModel().rows}
              layout={columns}
              rowId={rowId}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onToggle={toggleRow}
              renderSubComponent={renderSubComponent}
              setMarkedOptions={setMarkedOptions}
              noResultsContent={noResultsContent}
            />
          )}
        </table.Subscribe>
      </div>
      <table.Subscribe selector={selectPaginationState}>
        {({ pagination }) => {
          if (table.getRowModel().rows.length === 0) return null;

          return (
            <DataTablePagination
              currentPage={pagination.pageIndex + 1}
              pageSize={pagination.pageSize}
              totalPages={table.getPageCount()}
              setCurrentPageOptions={setCurrentPageOptions}
              setPageSizeOptions={setPageSizeOptions}
            />
          );
        }}
      </table.Subscribe>
    </div>
  );
}
