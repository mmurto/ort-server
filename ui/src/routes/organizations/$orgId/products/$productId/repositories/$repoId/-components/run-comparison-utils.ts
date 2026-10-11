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

import type { OrtRunStatistics, OrtRunSummary } from '@/api';

/**
 * How a count changed between two runs. For problems such as issues, more is worse; for other
 * counts such as packages the change carries no judgement.
 */
export type CountChangeTone = 'worse' | 'better' | 'neutral';

export type CountChange = {
  /** The signed difference, after minus before. */
  delta: number;
  /** The compact visible form, e.g. "+3", "−2" or "±0". */
  text: string;
  tone: CountChangeTone;
};

/** Formats a signed difference with a true minus sign, e.g. "+3", "−2" or "±0". */
export const formatCountDelta = (delta: number): string => {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return '±0';
};

/**
 * The change from one count to another, or undefined when either count is unknown.
 * @param isProblem Whether a higher count is worse, so increases are marked as such.
 */
export const getCountChange = (
  before: number | null | undefined,
  after: number | null | undefined,
  isProblem = true
): CountChange | undefined => {
  if (before == null || after == null) return undefined;

  const delta = after - before;

  return {
    delta,
    text: formatCountDelta(delta),
    tone:
      !isProblem || delta === 0 ? 'neutral' : delta > 0 ? 'worse' : 'better',
  };
};

/** Describes a change against an earlier run for assistive technology, e.g. "3 more than run 4". */
export const describeCountChange = (
  change: CountChange,
  previousRunIndex: number
): string => {
  if (change.delta === 0) return `Same as run ${previousRunIndex}`;

  return `${Math.abs(change.delta)} ${change.delta > 0 ? 'more' : 'fewer'} than run ${previousRunIndex}`;
};

/** The text colour for a change: err when worse, ok when better, muted otherwise. */
export const countChangeClassName = (change: CountChange): string =>
  change.tone === 'worse'
    ? 'text-err'
    : change.tone === 'better'
      ? 'text-ok'
      : 'text-muted-foreground';

export type RunStatisticsCategory = {
  key: 'issues' | 'vulnerabilities' | 'ruleViolations' | 'packages';
  label: string;
  isProblem: boolean;
  count: (statistics: OrtRunStatistics) => number | null | undefined;
  /** The job whose results the count comes from. */
  job: keyof OrtRunSummary['jobs'];
};

/** The counts compared between runs, in the order the run pages show them. */
export const runStatisticsCategories: readonly RunStatisticsCategory[] = [
  {
    key: 'issues',
    label: 'Issues',
    isProblem: true,
    count: (statistics) => statistics.issuesCount,
    job: 'analyzer',
  },
  {
    key: 'vulnerabilities',
    label: 'Vulnerabilities',
    isProblem: true,
    count: (statistics) => statistics.vulnerabilitiesCount,
    job: 'advisor',
  },
  {
    key: 'ruleViolations',
    label: 'Rule violations',
    isProblem: true,
    count: (statistics) => statistics.ruleViolationsCount,
    job: 'evaluator',
  },
  {
    key: 'packages',
    label: 'Packages',
    isProblem: false,
    count: (statistics) => statistics.packagesCount,
    job: 'analyzer',
  },
];

export type RunStatisticsComparisonRow = {
  key: RunStatisticsCategory['key'];
  label: string;
  before: number | null | undefined;
  after: number | null | undefined;
  change: CountChange | undefined;
};

/** Compares the counts of two runs per category. */
export const compareRunStatistics = (
  before: OrtRunStatistics | undefined,
  after: OrtRunStatistics | undefined
): RunStatisticsComparisonRow[] =>
  runStatisticsCategories.map((category) => {
    const beforeCount = before ? category.count(before) : undefined;
    const afterCount = after ? category.count(after) : undefined;

    return {
      key: category.key,
      label: category.label,
      before: beforeCount,
      after: afterCount,
      change: getCountChange(beforeCount, afterCount, category.isProblem),
    };
  });
