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

import { LinkOptions, useNavigate, useRouter } from '@tanstack/react-router';
import type { ExpandedState, RowData } from '@tanstack/react-table';
import React, { useEffect, useId, useRef, useState } from 'react';

import { DataTableCardsHeader } from '@/components/data-table-cards/data-table-cards-header';
import {
  getGridTemplate,
  resolveLayout,
  type DataTableCardsColumn,
} from '@/components/data-table-cards/data-table-cards-layout';
import { DataTableCardsRows } from '@/components/data-table-cards/data-table-cards-rows';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import {
  getClearFilters,
  hasActiveFilters,
} from '@/components/data-table/filter-state';
import {
  FindingPanel,
  SIDE_PANEL_QUERY,
} from '@/components/finding-panel/finding-panel';
import { Button } from '@/components/ui/button';
import type {
  AppReactTable,
  AppRow,
  AppTableState,
} from '@/hooks/use-app-table';
import { useMediaQuery } from '@/hooks/use-media-query';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export type { DataTableCardsColumn } from '@/components/data-table-cards/data-table-cards-layout';

/** What the details of a row show: a heading, marks and the content. */
export type DataTableCardsDetails = {
  title: React.ReactNode;
  meta?: React.ReactNode;
  content: React.ReactNode;
};

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

const selectExpandedState = (state: AppTableState) => ({
  expanded: state.expanded,
});

/** The id of the one row whose details are open, if any. */
const getOpenRowId = (expanded: ExpandedState) =>
  expanded === true
    ? undefined
    : Object.keys(expanded).find((id) => expanded[id]);

/** Removes the marked row from links to other pages of the grid. */
const withoutMarked = (options: LinkOptions): LinkOptions =>
  typeof options.search === 'object'
    ? ({
        ...options,
        search: { ...options.search, marked: undefined },
      } as LinkOptions)
    : options;

const NO_ROWS: ReadonlySet<string> = new Set();

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focuses the target of the R shortcut in the open details: its element marked
 * with `data-autofocus`, or else its first control.
 */
const focusDetailsTarget = (selector: string) => {
  const target = document.querySelector<HTMLElement>(
    `[data-slot="finding-panel"] ${selector}`
  );
  if (!target) return false;
  const control =
    target.querySelector<HTMLElement>('[data-autofocus]') ??
    target.querySelector<HTMLElement>(FOCUSABLE) ??
    target;
  // Not every environment implements scrolling, e.g. jsdom in the tests.
  if ('scrollIntoView' in target) target.scrollIntoView({ block: 'nearest' });
  control.focus({ preventScroll: true });
  return true;
};

/**
 * Whether a key event comes from a dialog or menu other than the details,
 * which handle their own keys, or such a layer is open.
 */
const isInOtherLayer = (target: EventTarget | null) => {
  const layer =
    target instanceof Element
      ? target.closest('[role="dialog"], [role="alertdialog"], [role="menu"]')
      : null;
  if (layer && layer.getAttribute('data-slot') !== 'finding-panel') return true;
  return (
    document.querySelector(
      '[role="dialog"][data-state="open"]:not([data-slot="finding-panel"]), [role="alertdialog"][data-state="open"]'
    ) !== null
  );
};

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
  /** Shows the details of a row inline, below the row. */
  renderSubComponent?: (props: { row: AppRow<TData> }) => React.ReactElement;
  /**
   * Shows the details of a row in a panel: next to the grid on wide screens,
   * over the page on narrow ones. Clicking a row or pressing Enter opens them,
   * J and K move to the next and previous row, and Escape closes them. The
   * open row is the one expanded row of the table, and it is kept in the URL
   * through `setMarkedOptions`. Replaces `renderSubComponent`.
   */
  renderDetails?: (props: { row: AppRow<TData> }) => DataTableCardsDetails;
  noResultsContent?: React.ReactNode;
  /**
   * Clears every filter of the table. The default empty content offers it when
   * the filters match nothing. Without it, the table's own column filter state
   * is reset, which only has an effect when the table handles filter changes.
   */
  onClearFilters?: () => void;
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
  /**
   * Lets the user check rows for an action on several of them: a checkbox
   * starts every row, the header one checks the whole page, Shift-click checks
   * a range and X checks the selected row. The checked rows are cleared when
   * the data changes, e.g. on another page or with other filters. While rows
   * are checked, a bar shows their number, these actions and a way to clear
   * them.
   */
  bulkActions?: (props: {
    rows: AppRow<TData>[];
    clear: () => void;
  }) => React.ReactNode;
  /**
   * A selector of the part of the details that R focuses, e.g. a resolution
   * form. R opens the details of the selected row first.
   */
  resolveTarget?: string;
}

export function DataTableCards<TData extends RowData>({
  table,
  layout,
  renderSubComponent,
  renderDetails,
  noResultsContent,
  onClearFilters,
  className,
  setCurrentPageOptions,
  setPageSizeOptions,
  setSortingOptions,
  setMarkedOptions,
  onToggleExpanded,
  globalShortcuts = true,
  bulkActions,
  resolveTarget,
  'aria-label': ariaLabel,
  ...props
}: DataTableCardsProps<TData>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridId = useId();
  const navigate = useNavigate();
  const router = useRouter();
  const isWide = useMediaQuery(SIDE_PANEL_QUERY);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const rowId = (index: number) => `${gridId}-row-${index}`;
  const hasDetails = renderDetails !== undefined;
  const selectable = bulkActions !== undefined;

  // The rows checked for a bulk action, by id. Row ids are only unique within
  // one set of data, so the check marks are cleared when the data changes.
  const data = table.options.data;
  const [checkedData, setCheckedData] = useState(data);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(NO_ROWS);
  const [checkAnchor, setCheckAnchor] = useState(-1);
  if (checkedData !== data) {
    setCheckedData(data);
    setCheckedIds(NO_ROWS);
    setCheckAnchor(-1);
  }
  const [resolveRequest, setResolveRequest] = useState(0);

  const clearChecked = () => {
    setCheckedIds(NO_ROWS);
    setCheckAnchor(-1);
  };

  const toggleChecked = (index: number, range: boolean) => {
    const rows = table.getRowModel().rows;
    const row = rows[index];
    if (!row) return;
    const check = !checkedIds.has(row.id);
    const from =
      range && checkAnchor >= 0 ? Math.min(checkAnchor, index) : index;
    const to = range && checkAnchor >= 0 ? Math.max(checkAnchor, index) : index;
    const next = new Set(checkedIds);
    for (const current of rows.slice(from, to + 1)) {
      if (check) next.add(current.id);
      else next.delete(current.id);
    }
    setCheckedIds(next);
    setCheckAnchor(index);
  };

  const toggleAllChecked = () => {
    const rows = table.getRowModel().rows;
    const allChecked =
      rows.length > 0 && rows.every((row) => checkedIds.has(row.id));
    setCheckedIds(allChecked ? NO_ROWS : new Set(rows.map((row) => row.id)));
    setCheckAnchor(-1);
  };

  /** Opens the details of a row, or closes them without a row. */
  const openDetails = (row: AppRow<TData> | undefined) => {
    table.setExpanded(row ? { [row.id]: true } : {});
    if (setMarkedOptions) {
      void navigate({
        ...setMarkedOptions(row?.id ?? ''),
        replace: true,
        resetScroll: false,
      });
    }
  };

  const toggleRow = (row: AppRow<TData>) => {
    if (hasDetails) {
      openDetails(row.getIsExpanded() ? undefined : row);
      return;
    }
    if (!row.getCanExpand()) return;
    if (onToggleExpanded) {
      onToggleExpanded(row);
    } else {
      row.toggleExpanded();
    }
  };

  const activateRow = (index: number) => {
    setSelectedIndex(index);
    const row = table.getRowModel().rows[index];
    if (hasDetails && row && !row.getIsExpanded()) openDetails(row);
  };

  const step = (delta: number) => {
    const rows = table.getRowModel().rows;
    if (rows.length === 0) return;
    const openIndex = rows.findIndex((row) => row.getIsExpanded());
    const current = selectedIndex >= 0 ? selectedIndex : openIndex;
    const next =
      current < 0
        ? delta > 0
          ? 0
          : rows.length - 1
        : Math.min(Math.max(current + delta, 0), rows.length - 1);
    setSelectedIndex(next);
    // While the details are open, they follow the selected row.
    if (hasDetails && openIndex >= 0 && next !== openIndex) {
      openDetails(rows[next]);
    }
  };

  const copyLink = async (row: AppRow<TData>) => {
    if (!setMarkedOptions) return;
    const location = router.buildLocation(setMarkedOptions(row.id));
    await navigator.clipboard.writeText(
      `${window.location.origin}${location.href}`
    );
    toast.info('Link copied');
  };

  /** The row the keyboard works on: the selected one, or the open one. */
  const getCurrentIndex = () => {
    if (selectedIndex >= 0) return selectedIndex;
    return table.getRowModel().rows.findIndex((row) => row.getIsExpanded());
  };

  const resolveCurrent = () => {
    const index = getCurrentIndex();
    const row = table.getRowModel().rows[index];
    if (!row || !hasDetails) return false;
    setSelectedIndex(index);
    if (!row.getIsExpanded()) openDetails(row);
    setResolveRequest((request) => request + 1);
    return true;
  };

  const toggleCurrentChecked = () => {
    const index = getCurrentIndex();
    if (index < 0) return false;
    toggleChecked(index, false);
    return true;
  };

  // The document-wide shortcuts call the latest handlers.
  const stepRef = useRef(step);
  const closeRef = useRef(() => openDetails(undefined));
  const resolveRef = useRef(resolveCurrent);
  const toggleCheckedRef = useRef(toggleCurrentChecked);
  useEffect(() => {
    stepRef.current = step;
    closeRef.current = () => openDetails(undefined);
    resolveRef.current = resolveCurrent;
    toggleCheckedRef.current = toggleCurrentChecked;
  });

  // R focuses the target in the details once they show the row.
  useEffect(() => {
    if (resolveRequest === 0 || !resolveTarget) return;
    if (focusDetailsTarget(resolveTarget)) return;
    // The details may take a frame to show up, e.g. in a sheet.
    const frame = requestAnimationFrame(() =>
      focusDetailsTarget(resolveTarget)
    );
    return () => cancelAnimationFrame(frame);
  }, [resolveRequest, resolveTarget]);

  // Keep the selected row in view while stepping through the rows.
  useEffect(() => {
    if (selectedIndex < 0) return;
    const row = document.getElementById(`${gridId}-row-${selectedIndex}`);
    // Not every environment implements scrolling, e.g. jsdom in the tests.
    if (row && 'scrollIntoView' in row)
      row.scrollIntoView({ block: 'nearest' });
  }, [gridId, selectedIndex]);

  // J and K also work while nothing on the page has focus, e.g. after reading
  // the page or from the details. The grid takes the focus, so the arrow keys
  // work afterwards. Escape closes the details next to the grid.
  useEffect(() => {
    if (!globalShortcuts && !hasDetails && !selectable) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey) return;
      if (event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      // Other dialogs and menus handle their own keys.
      if (isInOtherLayer(event.target)) return;
      const active = document.activeElement;
      const inDetails =
        active instanceof Element &&
        active.closest('[data-slot="finding-panel"]') !== null;
      const onPage = active === null || active === document.body || inDetails;
      const inGrid =
        active instanceof Node && gridRef.current?.contains(active) === true;
      const key = event.key.toLowerCase();

      if (key === 'r' && resolveTarget && (onPage || inGrid)) {
        if (resolveRef.current()) event.preventDefault();
        return;
      }
      if (key === 'x' && selectable && (onPage || inGrid)) {
        if (toggleCheckedRef.current()) event.preventDefault();
        return;
      }

      if (key === 'escape' && hasDetails) {
        if (!table.getRowModel().rows.some((row) => row.getIsExpanded())) {
          return;
        }
        event.preventDefault();
        closeRef.current();
        gridRef.current?.focus({ preventScroll: true });
        return;
      }
      if (!globalShortcuts || !onPage) return;
      if (key !== 'j' && key !== 'k') return;
      if (table.getRowModel().rows.length === 0) return;

      event.preventDefault();
      stepRef.current(key === 'j' ? 1 : -1);
      if (!inDetails) gridRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [globalShortcuts, hasDetails, resolveTarget, selectable, table]);

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
    <table.Subscribe selector={selectExpandedState}>
      {({ expanded }) => {
        const rows = table.getRowModel().rows;
        const openId = hasDetails ? getOpenRowId(expanded) : undefined;
        const openIndex =
          openId === undefined
            ? -1
            : rows.findIndex((row) => row.id === openId);
        const openRow = openIndex >= 0 ? rows[openIndex] : undefined;
        const besideGrid = openRow !== undefined && isWide;
        const allColumns = resolveLayout(table, layout);
        const columns = besideGrid
          ? allColumns.filter((column) => column.withDetails !== false)
          : allColumns;
        const shownIndex = selectedIndex >= 0 ? selectedIndex : openIndex;
        const checkedRows = selectable
          ? rows.filter((row) => checkedIds.has(row.id))
          : [];
        const allChecked =
          rows.length > 0 && checkedRows.length === rows.length;

        return (
          <div
            className={cn('flex w-full flex-col gap-3', className)}
            {...props}
          >
            <div
              className={cn(
                besideGrid &&
                  'grid grid-cols-[minmax(0,1fr)_minmax(24rem,42%)] items-start gap-4'
              )}
            >
              <div className='flex min-w-0 flex-col gap-3'>
                <div
                  ref={gridRef}
                  role='grid'
                  aria-label={ariaLabel}
                  aria-activedescendant={
                    shownIndex >= 0 ? rowId(shownIndex) : undefined
                  }
                  tabIndex={0}
                  className='w-full text-[0.8125rem] outline-none md:grid md:grid-cols-(--findings-cols) md:gap-x-4'
                  style={
                    {
                      '--findings-cols': getGridTemplate(columns, selectable),
                    } as React.CSSProperties
                  }
                  onKeyDown={onGridKeyDown}
                  onFocus={(event) => {
                    // Entering the grid with the keyboard selects its first row.
                    if (
                      event.target !== event.currentTarget ||
                      shownIndex >= 0
                    ) {
                      return;
                    }
                    if (rows.length > 0) setSelectedIndex(0);
                  }}
                >
                  <DataTableCardsHeader
                    table={table}
                    layout={columns}
                    setSortingOptions={setSortingOptions}
                    selectAll={
                      selectable
                        ? {
                            checked: allChecked
                              ? true
                              : checkedRows.length > 0
                                ? 'indeterminate'
                                : false,
                            disabled: rows.length === 0,
                            onToggle: toggleAllChecked,
                          }
                        : undefined
                    }
                  />
                  <table.Subscribe selector={selectBodyState}>
                    {({ columnFilters }) => (
                      <DataTableCardsRows
                        rows={table.getRowModel().rows}
                        layout={columns}
                        rowId={rowId}
                        selectedIndex={shownIndex}
                        openIndex={openIndex}
                        onSelect={setSelectedIndex}
                        onActivate={hasDetails ? activateRow : undefined}
                        onToggle={toggleRow}
                        renderSubComponent={
                          hasDetails ? undefined : renderSubComponent
                        }
                        setMarkedOptions={
                          hasDetails ? undefined : setMarkedOptions
                        }
                        noResultsContent={noResultsContent}
                        filtersActive={hasActiveFilters(columnFilters)}
                        onClearFilters={getClearFilters(
                          table,
                          columnFilters,
                          onClearFilters
                        )}
                        checkedIds={selectable ? checkedIds : undefined}
                        onToggleChecked={selectable ? toggleChecked : undefined}
                      />
                    )}
                  </table.Subscribe>
                </div>
                {bulkActions && checkedRows.length > 0 && (
                  <div
                    role='toolbar'
                    aria-label='Bulk actions'
                    className='bg-background sticky bottom-2 z-10 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm border px-3 py-1.5 text-[0.8125rem]'
                  >
                    <span
                      className='font-medium tabular-nums'
                      aria-live='polite'
                    >
                      {checkedRows.length} selected
                    </span>
                    <span aria-hidden className='text-muted-foreground'>
                      ·
                    </span>
                    {bulkActions({ rows: checkedRows, clear: clearChecked })}
                    <span aria-hidden className='text-muted-foreground'>
                      ·
                    </span>
                    <Button variant='ghost' size='sm' onClick={clearChecked}>
                      Clear
                    </Button>
                  </div>
                )}
                <table.Subscribe selector={selectPaginationState}>
                  {({ pagination }) => {
                    if (table.getRowModel().rows.length === 0) return null;

                    return (
                      <DataTablePagination
                        currentPage={pagination.pageIndex + 1}
                        pageSize={pagination.pageSize}
                        totalPages={table.getPageCount()}
                        // Nested grids keep the row marked in the outer grid.
                        setCurrentPageOptions={(page) =>
                          globalShortcuts
                            ? withoutMarked(setCurrentPageOptions(page))
                            : setCurrentPageOptions(page)
                        }
                        setPageSizeOptions={(size) =>
                          globalShortcuts
                            ? withoutMarked(setPageSizeOptions(size))
                            : setPageSizeOptions(size)
                        }
                      />
                    );
                  }}
                </table.Subscribe>
              </div>
              {openRow && renderDetails && (
                <DataTableCardsDetailsPanel
                  row={openRow}
                  renderDetails={renderDetails}
                  position={`${openIndex + 1} of ${rows.length}`}
                  onClose={() => {
                    openDetails(undefined);
                    gridRef.current?.focus({ preventScroll: true });
                  }}
                  onPrevious={openIndex > 0 ? () => step(-1) : undefined}
                  onNext={
                    openIndex < rows.length - 1 ? () => step(1) : undefined
                  }
                  onCopyLink={
                    setMarkedOptions ? () => void copyLink(openRow) : undefined
                  }
                />
              )}
            </div>
          </div>
        );
      }}
    </table.Subscribe>
  );
}

function DataTableCardsDetailsPanel<TData extends RowData>({
  row,
  renderDetails,
  ...panel
}: {
  row: AppRow<TData>;
  renderDetails: (props: { row: AppRow<TData> }) => DataTableCardsDetails;
  position: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onCopyLink?: () => void;
}) {
  // The row keeps its identity while its data changes, see the rows.
  'use no memo';

  const details = renderDetails({ row });

  return (
    <FindingPanel
      key={row.id}
      title={details.title}
      meta={details.meta}
      {...panel}
    >
      {details.content}
    </FindingPanel>
  );
}
