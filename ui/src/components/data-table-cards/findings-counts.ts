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

import type { ItemResolved } from '@/schemas';

/**
 * Select the counts per severity that match the resolution filter, from the
 * counts of all findings and of the unresolved ones in the run statistics.
 */
export function selectCountsByResolution(
  all: Record<string, number> | null | undefined,
  unresolved: Record<string, number> | null | undefined,
  itemResolved: ItemResolved[] | undefined
): Record<string, number> | undefined {
  const only = itemResolved?.length === 1 ? itemResolved[0] : undefined;

  if (only === 'Unresolved') return unresolved ?? undefined;
  if (only === 'Resolved') {
    if (!all || !unresolved) return undefined;
    return Object.fromEntries(
      Object.entries(all).map(([key, count]) => [
        key,
        count - (unresolved[key] ?? 0),
      ])
    );
  }

  return all ?? undefined;
}

/** The sum of the counts, if they are known. */
export const sumCounts = (counts: Record<string, number> | undefined) =>
  counts
    ? Object.values(counts).reduce((sum, count) => sum + count, 0)
    : undefined;
