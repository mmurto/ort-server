/*
 * Copyright (C) 2024 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
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

import { describe, expect, it } from 'vitest';

import type { OrtRunSummary } from '@/api';
import {
  compareWithPreviousRun,
  emptyRunComparisonSelection,
  getPreviousRun,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/repository-runs-table-utils';

const runSummary = (index: number) => ({ index }) as OrtRunSummary;

// Sorted like the runs table, newest first; run 3 was deleted.
const runs = [runSummary(5), runSummary(4), runSummary(2)];

describe('getPreviousRun', () => {
  it('returns the run listed after the given one', () => {
    expect(getPreviousRun(runs, 5)).toBe(runs[1]);
    expect(getPreviousRun(runs, 4)).toBe(runs[2]);
  });

  it('returns nothing for the last listed run or an unknown run', () => {
    expect(getPreviousRun(runs, 2)).toBeUndefined();
    expect(getPreviousRun(runs, 9)).toBeUndefined();
  });
});

describe('compareWithPreviousRun', () => {
  it('compares a run with the run before it and opens the dialog', () => {
    expect(compareWithPreviousRun(runs, 4)).toEqual({
      baseRunIndex: 2,
      comparedRunIndex: 4,
      isDialogOpen: true,
    });
  });

  it('leaves the base run open when there is no run before it', () => {
    expect(compareWithPreviousRun(runs, 2)).toEqual({
      baseRunIndex: undefined,
      comparedRunIndex: 2,
      isDialogOpen: true,
    });
  });

  it('starts closed without runs', () => {
    expect(emptyRunComparisonSelection).toEqual({ isDialogOpen: false });
  });
});
