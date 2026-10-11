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

import { useQueries, useQuery } from '@tanstack/react-query';

import type { OrtRunStatus } from '@/api';
import {
  getProductRepositoriesOptions,
  getRepositoryRunsOptions,
} from '@/api/@tanstack/react-query.gen';
import { StatusMark } from '@/components/status-mark';
import { TimestampWithUTC } from '@/components/timestamp-with-utc';

/** The order in which the statuses of the latest runs are listed. */
const STATUS_ORDER: OrtRunStatus[] = [
  'FAILED',
  'FINISHED_WITH_ISSUES',
  'ACTIVE',
  'CREATED',
  'FINISHED',
];

/** The latest run of each repository of a product, at most 100 of them. */
const useProductLatestRuns = (productId: number) => {
  const { data: repositories } = useQuery({
    ...getProductRepositoriesOptions({
      path: { productId },
      query: { limit: 100 },
    }),
  });

  return useQueries({
    queries: (repositories?.data ?? []).map((repository) =>
      getRepositoryRunsOptions({
        path: { repositoryId: repository.id },
        query: { limit: 1, sort: '-index' },
      })
    ),
    combine: (results) => ({
      isPending: repositories === undefined || results.some((r) => r.isPending),
      runs: results.flatMap((result) => result.data?.data ?? []),
    }),
  });
};

/**
 * How the latest runs of the repositories of a product went, e.g. "2 Failed,
 * 3 Finished", for products with more than one repository.
 */
export const ProductLatestRunStatuses = ({
  productId,
  repositoryCount,
}: {
  productId: number;
  repositoryCount: number;
}) => {
  const { isPending, runs } = useProductLatestRuns(productId);

  if (isPending) {
    return (
      <span className='text-muted-foreground text-[0.8125rem]'>
        {repositoryCount} repositories
      </span>
    );
  }

  const counts = new Map<OrtRunStatus, number>();
  for (const run of runs) {
    counts.set(run.status, (counts.get(run.status) ?? 0) + 1);
  }
  const withoutRuns = repositoryCount - runs.length;

  return (
    <div
      className='flex flex-wrap items-center gap-x-2 gap-y-1'
      title={`Latest runs of ${repositoryCount} repositories`}
    >
      {STATUS_ORDER.filter((status) => counts.has(status)).map((status) => (
        <span key={status} className='inline-flex items-center gap-1'>
          <span className='text-[0.8125rem] font-medium tabular-nums'>
            {counts.get(status)}
          </span>
          <StatusMark status={status} />
        </span>
      ))}
      {withoutRuns > 0 && (
        <span className='text-muted-foreground text-[0.8125rem]'>
          {withoutRuns} without runs
        </span>
      )}
    </div>
  );
};

/** When the most recent of the latest runs of a product's repositories ran. */
export const ProductLatestRunDate = ({ productId }: { productId: number }) => {
  const { isPending, runs } = useProductLatestRuns(productId);

  if (isPending || runs.length === 0) return null;

  const latest = runs.reduce((newest, run) =>
    run.createdAt > newest.createdAt ? run : newest
  );

  return (
    <div className='flex min-h-10 flex-col items-start text-[0.8125rem]'>
      <TimestampWithUTC timestamp={latest.finishedAt ?? latest.createdAt} />
      <span className='text-muted-foreground'>
        Most recent of {runs.length} repositories
      </span>
    </div>
  );
};
