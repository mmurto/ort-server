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
import { Button } from '@/components/ui/button';
import type { AppRow } from '@/hooks/use-app-table';
import { cn } from '@/lib/utils';

interface DataTableCardsRowsProps<TData extends RowData> {
  rows: AppRow<TData>[];
  layout: DataTableCardsColumn[];
  rowId: (index: number) => string;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onToggle: (row: AppRow<TData>) => void;
  renderSubComponent?: (props: { row: AppRow<TData> }) => React.ReactElement;
  setMarkedOptions?: (marked: string) => LinkOptions;
  noResultsContent?: React.ReactNode;
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
  onSelect,
  onToggle,
  renderSubComponent,
  setMarkedOptions,
  noResultsContent,
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
            <div className='text-muted-foreground text-[0.8125rem]'>
              Nothing matches the current filters.
            </div>
          )}
        </div>
      </div>
    );
  }

  return rows.map((row, index) => {
    const isSelected = index === selectedIndex;
    const canExpand = !!renderSubComponent && row.getCanExpand();
    const isExpanded = canExpand && row.getIsExpanded();
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
          className={cn(
            'group/finding hover:bg-muted/60 flex flex-wrap items-center border-b px-2 py-2 transition-colors max-md:gap-x-3 max-md:gap-y-1',
            'md:col-span-full md:grid md:min-h-9 md:grid-cols-subgrid md:py-1.5',
            'data-[state=selected]:bg-muted data-[state=selected]:shadow-[inset_2px_0_0_var(--brand)]'
          )}
          onClick={() => onSelect(index)}
          onFocus={() => onSelect(index)}
        >
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
