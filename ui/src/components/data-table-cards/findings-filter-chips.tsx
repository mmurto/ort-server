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

import { Fragment } from 'react';

import { cn } from '@/lib/utils';

export type FindingsFilterChip<TValue extends string> = {
  value: TValue;
  label: string;
  /** The colour class of the severity square. */
  colorClass: string;
  /** The number of findings, if known. */
  count?: number;
};

interface FindingsFilterChipsProps<TValue extends string> {
  /** The accessible name of the group, e.g. "Filter by severity". */
  label: string;
  chips: FindingsFilterChip<TValue>[];
  selected: TValue[] | undefined;
  /** The number of all findings, if known. */
  total?: number;
  /**
   * What the counts include, shown as the title of the chips that have one,
   * e.g. that they count the whole run regardless of the other filters.
   */
  countsTitle?: string;
  /** Set the selected values; `undefined` shows all findings. */
  onSelect: (selected: TValue[] | undefined) => void;
}

const chipClassName =
  'hover:text-foreground flex h-6 items-center gap-1.5 rounded-xs px-1.5 transition-colors aria-pressed:bg-muted aria-pressed:text-foreground aria-pressed:font-medium';

/**
 * Chips that filter the findings by one severity, with the number of findings
 * per severity where it is known. The counts may ignore the other filters;
 * `countsTitle` then says what they count. The chips drive the same search
 * parameter as the severity filter in the column header.
 */
export function FindingsFilterChips<TValue extends string>({
  label,
  chips,
  selected,
  total,
  countsTitle,
  onSelect,
}: FindingsFilterChipsProps<TValue>) {
  const noneSelected = !selected || selected.length === 0;

  return (
    <div
      role='group'
      aria-label={label}
      className='text-muted-foreground flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[0.8125rem]'
    >
      <button
        type='button'
        aria-pressed={noneSelected}
        title={total !== undefined ? countsTitle : undefined}
        className={chipClassName}
        onClick={() => onSelect(undefined)}
      >
        All
        {total !== undefined && <span className='tabular-nums'>{total}</span>}
      </button>
      {chips.map((chip) => {
        const isSelected = !noneSelected && selected.includes(chip.value);
        const isOnlySelected = isSelected && selected.length === 1;

        return (
          <Fragment key={chip.value}>
            <span aria-hidden className='px-0.5'>
              ·
            </span>
            <button
              type='button'
              aria-pressed={isSelected}
              title={chip.count !== undefined ? countsTitle : undefined}
              className={chipClassName}
              onClick={() =>
                onSelect(isOnlySelected ? undefined : [chip.value])
              }
            >
              <span aria-hidden className={cn('size-2', chip.colorClass)} />
              {chip.label}
              {chip.count !== undefined && (
                <span className='tabular-nums'>{chip.count}</span>
              )}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
