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

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import type { JobSummary, OrtRunStatistics, OrtRunSummary } from '@/api';
import { getRunStatisticsOptions } from '@/api/@tanstack/react-query.gen';
import { ItemCounts, ItemCountsSkeleton } from '@/components/item-counts';
import { QueryBoundary } from '@/components/query-boundary';
import { config } from '@/config';
import { isJobFinished } from '@/helpers/job-helpers';
import { cn } from '@/lib/utils';
import {
  countChangeClassName,
  describeCountChange,
  getCountChange,
  runStatisticsCategories,
} from './run-comparison-utils';

const showBadge = (jobSummary: JobSummary | null | undefined) => {
  return jobSummary != null && isJobFinished(jobSummary.status);
};

type RunItemCountsProps = {
  summary: OrtRunSummary;
  /** The run before this one, to show how the counts changed since then. */
  previous?: OrtRunSummary;
};

export const RunItemCounts = ({ summary, previous }: RunItemCountsProps) => (
  <QueryBoundary fallback={<ItemCountsSkeleton wide />} resetKey={summary.id}>
    <RunItemCountsInner summary={summary} previous={previous} />
  </QueryBoundary>
);

// The categories shown as badges; their columns match the badges of `ItemCounts`.
const badgeCategories = runStatisticsCategories.filter(
  (category) => category.key !== 'packages'
);

const badgeColumns = ['col-start-1', 'col-start-2', 'col-start-3'];

/** The change of each count since the previous run, set under the badges. */
const RunItemDeltas = ({
  summary,
  previous,
  statistics,
  previousStatistics,
}: {
  summary: OrtRunSummary;
  previous: OrtRunSummary;
  statistics: OrtRunStatistics;
  previousStatistics: OrtRunStatistics;
}) => {
  const changes = badgeCategories.map((category, position) => {
    const isComparable =
      showBadge(summary.jobs[category.job]) &&
      showBadge(previous.jobs[category.job]);
    const change = isComparable
      ? getCountChange(
          category.count(previousStatistics),
          category.count(statistics),
          category.isProblem
        )
      : undefined;

    return { key: category.key, column: badgeColumns[position], change };
  });

  if (changes.every(({ change }) => change === undefined)) return null;

  return (
    <div className='grid grid-cols-3 gap-1 text-xs leading-4 tabular-nums'>
      {changes.map(
        ({ key, column, change }) =>
          change && (
            <span
              key={key}
              data-testid={`run-item-delta-${key}`}
              className={cn('w-14 pl-[1.4375rem]', column)}
            >
              <span aria-hidden className={countChangeClassName(change)}>
                {change.text}
              </span>
              <span className='sr-only'>
                {describeCountChange(change, previous.index)}
              </span>
            </span>
          )
      )}
    </div>
  );
};

const RunItemCountsInner = ({ summary, previous }: RunItemCountsProps) => {
  const statistics = useSuspenseQuery({
    ...getRunStatisticsOptions({
      path: { runId: summary.id },
    }),
    refetchInterval: config.pollInterval,
  });

  // The previous run is usually another row of the same page, which loads these statistics
  // already; the change is left out until they are there rather than holding up the counts.
  const previousStatistics = useQuery({
    ...getRunStatisticsOptions({
      path: { runId: previous?.id ?? 0 },
    }),
    enabled: previous !== undefined,
  });

  return (
    <div className='flex flex-col gap-0.5'>
      <ItemCounts
        statistics={statistics.data}
        wide
        showIssues={showBadge(summary.jobs.analyzer)}
        showVulnerabilities={showBadge(summary.jobs.advisor)}
        showRuleViolations={showBadge(summary.jobs.evaluator)}
        link={{
          params: {
            orgId: summary.organizationId.toString(),
            productId: summary.productId.toString(),
            repoId: summary.repositoryId.toString(),
            runIndex: summary.index.toString(),
          },
          issuesSearch: {
            sortBy: [{ id: 'severity', desc: true }],
            itemResolved: ['Unresolved'],
          },
          vulnerabilitiesSearch: {
            sortBy: [{ id: 'rating', desc: true }],
            itemResolved: ['Unresolved'],
          },
          ruleViolationsSearch: {
            sortBy: [{ id: 'severity', desc: true }],
            itemResolved: ['Unresolved'],
          },
        }}
      />
      {previous && previousStatistics.data && (
        <RunItemDeltas
          summary={summary}
          previous={previous}
          statistics={statistics.data}
          previousStatistics={previousStatistics.data}
        />
      )}
    </div>
  );
};
