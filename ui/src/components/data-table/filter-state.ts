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

import type { Filter } from '@/components/data-table/data-table-types';
import type { AppReactTable } from '@/hooks/use-app-table';

/** Whether any column filter holds a value that narrows the rows. */
export const hasActiveFilters = (
  columnFilters: { id: string; value: unknown }[] | undefined
) =>
  (columnFilters ?? []).some(
    ({ value }) =>
      value !== undefined &&
      value !== null &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0)
  );

/** Clears the filter of a single column through its own filter callback. */
const clearColumnFilter = (filter: Filter<unknown>) => {
  switch (filter.filterVariant) {
    case 'text':
    case 'regex':
      return filter.setFilterValue(undefined);
    case 'select':
    case 'infinite-select':
      return filter.setSelected([]);
    case 'single-select':
      return filter.setSelected(undefined);
  }
};

/**
 * How to clear the filters of a table: the caller's own way, resetting the
 * table's filter state when the table handles filter changes itself, or the
 * filter callback of the only filtered column. Filters kept in the URL are set
 * through each column's callback, and those callbacks do not see each other's
 * changes, so a table that filters by several columns must pass its own way.
 */
export const getClearFilters = <TData extends RowData>(
  table: AppReactTable<TData>,
  columnFilters: { id: string; value: unknown }[] | undefined,
  onClearFilters: (() => void) | undefined
) => {
  if (onClearFilters) return onClearFilters;
  if (table.options.onColumnFiltersChange) {
    return () => table.resetColumnFilters(true);
  }
  const active = (columnFilters ?? []).filter((filter) =>
    hasActiveFilters([filter])
  );
  const filter =
    active.length === 1 && active[0]
      ? table.getColumn(active[0].id)?.columnDef.meta?.filter
      : undefined;
  return filter ? () => clearColumnFilter(filter) : undefined;
};
