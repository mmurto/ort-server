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

import {
  getResolutionIdentifier,
  isRuleViolationItem,
  type ItemWithResolutions,
  type ResolutionItemType,
} from '@/helpers/resolutions';
import { getErrorMessage } from '@/lib/error-message';

export const nouns: Record<ResolutionItemType, [string, string]> = {
  vulnerability: ['vulnerability', 'vulnerabilities'],
  'rule-violation': ['rule violation', 'rule violations'],
  issue: ['issue', 'issues'],
};

/** "1 issue", "3 issues". */
export const countItems = (count: number, itemType: ResolutionItemType) =>
  `${count} ${nouns[itemType][count === 1 ? 0 : 1]}`;

/** A short name of an item for the list of failures. */
export const getItemName = (item: ItemWithResolutions) => {
  const identifier = getResolutionIdentifier(item).split('\n')[0] ?? '';
  return isRuleViolationItem(item) ? `${item.rule}: ${identifier}` : identifier;
};

export type BulkResolveFailure = {
  item: ItemWithResolutions;
  message: string;
};

/**
 * Applies `apply` to the items one after the other, as the calls are
 * independent of each other, and collects the failures instead of stopping.
 */
export async function applySequentially(
  items: ItemWithResolutions[],
  apply: (item: ItemWithResolutions) => Promise<unknown>,
  onProgress: (current: number) => void
): Promise<BulkResolveFailure[]> {
  const failures: BulkResolveFailure[] = [];
  for (const [index, item] of items.entries()) {
    onProgress(index + 1);
    try {
      await apply(item);
    } catch (error) {
      failures.push({ item, message: getErrorMessage(error) });
    }
  }
  return failures;
}
