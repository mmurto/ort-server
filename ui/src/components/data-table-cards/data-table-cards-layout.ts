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

import type { RowData } from '@tanstack/react-table';

import type { AppReactTable } from '@/hooks/use-app-table';

/**
 * Where a cell goes on small screens, where a row is a two-line block:
 * - `lead`: first on the first line, e.g. the severity mark,
 * - `main`: the main identifier, taking the rest of the first line,
 * - `end`: after the main identifier on the first line,
 * - `sub`: a line of its own below the first one,
 * - `hidden`: not shown on small screens.
 */
export type DataTableCardsMobilePlacement =
  'lead' | 'main' | 'end' | 'sub' | 'hidden';

export type DataTableCardsColumn = {
  /** The id of the visible table column that renders the cells. */
  id: string;
  /** The label in the column header; defaults to the column's header. */
  label?: string;
  /** The CSS grid track of the column on wide screens, e.g. `minmax(0,2fr)`. */
  width?: string;
  /** The hidden columns whose filters are offered in this column's header. */
  filters?: string[];
  /** The hidden column that the label of this column sorts by. */
  sortBy?: string;
  /** Where the cells go on small screens; defaults to `end`. */
  mobile?: DataTableCardsMobilePlacement;
  /** Additional classes for the cells of this column. */
  className?: string;
};

export const mobilePlacementClasses: Record<
  DataTableCardsMobilePlacement,
  string
> = {
  lead: 'max-md:order-0 max-md:shrink-0',
  main: 'max-md:order-1 max-md:flex-1',
  end: 'max-md:order-2 max-md:shrink-0',
  sub: 'max-md:order-4 max-md:basis-full',
  hidden: 'max-md:hidden',
};

/** The layout of the grid, falling back to one column per visible column. */
export function resolveLayout<TData extends RowData>(
  table: AppReactTable<TData>,
  layout: DataTableCardsColumn[] | undefined
): DataTableCardsColumn[] {
  if (layout) return layout;

  return table.getVisibleLeafColumns().map((column) => ({
    id: column.id,
    label:
      typeof column.columnDef.header === 'string'
        ? column.columnDef.header
        : '',
    mobile: 'main',
  }));
}

/**
 * The CSS grid template of the columns, plus a trailing column for the row
 * actions and the sort menu.
 */
export function getGridTemplate(layout: DataTableCardsColumn[]) {
  return [
    ...layout.map((column) => column.width ?? 'minmax(0,1fr)'),
    'max-content',
  ].join(' ');
}
