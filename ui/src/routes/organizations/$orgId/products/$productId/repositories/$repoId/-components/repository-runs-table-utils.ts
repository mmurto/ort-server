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

import type { OrtRunSummary } from '@/api';

/** The runs picked for a comparison, by index. Either may still be unset. */
export type RunComparisonSelection = {
  baseRunIndex?: number;
  comparedRunIndex?: number;
  isDialogOpen: boolean;
};

export const emptyRunComparisonSelection: RunComparisonSelection = {
  isDialogOpen: false,
};

/**
 * The run listed after the given one in a list sorted by descending index, which is the run before
 * it. Returns undefined when the run is the last one of the list.
 */
export const getPreviousRun = (
  runs: readonly OrtRunSummary[],
  runIndex: number
): OrtRunSummary | undefined => {
  const position = runs.findIndex((run) => run.index === runIndex);

  return position === -1 ? undefined : runs[position + 1];
};

/**
 * Open a comparison of a run with the run before it: the previous run is the base ("before") and
 * the run itself the compared one ("after").
 */
export const compareWithPreviousRun = (
  runs: readonly OrtRunSummary[],
  runIndex: number
): RunComparisonSelection => ({
  baseRunIndex: getPreviousRun(runs, runIndex)?.index,
  comparedRunIndex: runIndex,
  isDialogOpen: true,
});
