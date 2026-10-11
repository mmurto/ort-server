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

import { LinkOptions } from '@tanstack/react-router';
import { flexRender, type RowData } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import React, { Fragment } from 'react';

import {
  mobilePlacementClasses,
  type DataTableCardsColumn,
} from '@/components/data-table-cards/data-table-cards-layout';
import { MarkItems } from '@/components/data-table/mark-items';
import { NoResults } from '@/components/data-table/no-results';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { AppRow } from '@/hooks/use-app-table';
import { cn } from '@/lib/utils';

interface DataTableCardsRowsProps<TData extends RowData> {
  rows: AppRow<TData>[];
  layout: DataTableCardsColumn[];
  rowId: (index: number) => string;
  selectedIndex: number;
  /** The row whose details are open in a panel, or -1. */
  openIndex?: number;
  onSelect: (index: number) => void;
  /** Opens a row's details when the row is clicked. */
  onActivate?: (index: number) => void;
  onToggle: (row: AppRow<TData>) => void;
  renderSubComponent?: (props: { row: AppRow<TData> }) => React.ReactElement;
  setMarkedOptions?: (marked: string) => LinkOptions;
  noResultsContent?: React.ReactNode;
  filtersActive?: boolean;
  onClearFilters?: () => void;
  /** The ids of the rows checked for a bulk action, for selectable rows. */
  checkedIds?: ReadonlySet<string>;
  /** Checks or unchecks a row; `range` extends it from the last one. */
  onToggleChecked?: (index: number, range: boolean) => void;
}

// The row actions stay in the layout, so they do not shift the row, and in the
// tab order, so they can be reached with the keyboard. On wide screens they
// only show up while the row is hovered, focused, selected or expanded.
const actionsClassName =
  'flex items-center justify-end gap-0.5 max-md:order-3 md:opacity-0 md:group-hover/finding:opacity-100 md:group-focus-within/finding:opacity-100 md:group-data-[state=selected]/finding:opacity-100 md:group-aria-expanded/finding:opacity-100';

export function DataTableCardsRows<TData extends RowData>({
  rows,
  layout,
  rowId,
  selectedIndex,
  openIndex = -1,
  onSelect,
  onActivate,
  onToggle,
  renderSubComponent,
  setMarkedOptions,
  noResultsContent,
  filtersActive = false,
  onClearFilters,
  checkedIds,
  onToggleChecked,
}: DataTableCardsRowsProps<TData>) {
  // The rows keep their identity when a row is expanded or a column is hidden;
  // only their methods return the new state. React Compiler would reuse what
  // was rendered from them as long as the props stay the same and show
  // outdated rows, so this component must not be compiled.
  'use no memo';

  if (rows.length === 0) {
    return (
      <div role='row' className='border-b md:col-span-full'>
        <div
          role='gridcell'
          className='flex min-h-24 items-center justify-center px-2 text-center'
        >
          {noResultsContent ?? (
            <NoResults
              filtersActive={filtersActive}
              onClearFilters={onClearFilters}
            />
          )}
        </div>
      </div>
    );
  }

  return rows.map((row, index) => {
    const isSelected = index === selectedIndex;
    const canExpand = !!renderSubComponent && row.getCanExpand();
    const isExpanded = canExpand && row.getIsExpanded();
    const isChecked = checkedIds?.has(row.id) ?? false;
    const cells = new Map(
      row.getVisibleCells().map((cell) => [cell.column.id, cell])
    );

    return (
      <Fragment key={row.id}>
        <div
          role='row'
          id={rowId(index)}
          aria-selected={isSelected}
          aria-expanded={canExpand ? isExpanded : undefined}
          data-state={isSelected ? 'selected' : undefined}
          data-open={index === openIndex ? '' : undefined}
          data-checked={isChecked ? '' : undefined}
          className={cn(
            'group/finding hover:bg-muted/60 flex flex-wrap items-center border-b px-2 py-2 transition-colors max-md:gap-x-3 max-md:gap-y-1',
            'md:col-span-full md:grid md:min-h-9 md:grid-cols-subgrid md:py-1.5',
            'data-[state=selected]:bg-muted data-[state=selected]:shadow-[inset_2px_0_0_var(--brand)]',
            onActivate && 'data-open:bg-muted cursor-pointer',
            'data-checked:bg-muted/40'
          )}
          onClick={(event) => {
            // Links and buttons in the row keep their own action.
            if (
              event.target instanceof Element &&
              event.target.closest('a, button, input, [role="checkbox"]')
            ) {
              onSelect(index);
              return;
            }
            (onActivate ?? onSelect)(index);
          }}
          onFocus={() => onSelect(index)}
        >
          {onToggleChecked && (
            <div
              role='gridcell'
              className='flex items-center max-md:order-0 max-md:shrink-0'
            >
              <Checkbox
                aria-label={`Select item ${index + 1}`}
                checked={isChecked}
                onClick={(event) => {
                  // The checkbox follows the selection, which also handles
                  // ranges with Shift.
                  event.preventDefault();
                  onToggleChecked(index, event.shiftKey);
                }}
              />
            </div>
          )}
          {layout.map((column) => {
            const cell = cells.get(column.id);

            return (
              <div
                role='gridcell'
                key={column.id}
                className={cn(
                  'min-w-0',
                  mobilePlacementClasses[column.mobile ?? 'end'],
                  column.className
                )}
              >
                {cell
                  ? flexRender(cell.column.columnDef.cell, cell.getContext())
                  : null}
              </div>
            );
          })}
          <div role='gridcell' className={actionsClassName}>
            {setMarkedOptions && (
              <MarkItems row={row} setMarked={setMarkedOptions} />
            )}
            {canExpand && (
              <Button
                variant='ghost'
                size='sm'
                aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                aria-expanded={isExpanded}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(index);
                  onToggle(row);
                }}
              >
                <ChevronDown
                  className={cn(
                    'size-3.5 transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                />
              </Button>
            )}
          </div>
        </div>
        {renderSubComponent && isExpanded && (
          <div role='row' className='border-b md:col-span-full'>
            <div
              role='gridcell'
              className='min-w-0 px-2 pt-2 pb-4 md:pr-4 md:pl-6'
            >
              {renderSubComponent({ row })}
            </div>
          </div>
        )}
      </Fragment>
    );
  });
}
