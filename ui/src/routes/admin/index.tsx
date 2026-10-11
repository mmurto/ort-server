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

import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';

import {
  getOrganizationsOptions,
  getRunsOptions,
} from '@/api/@tanstack/react-query.gen';
import { zOrtRunStatus } from '@/api/zod.gen';
import { PageHeader } from '@/components/page-header';
import { StatisticsCard, StatisticsRow } from '@/components/statistics-card';
import { Skeleton } from '@/components/ui/skeleton';
import { toastError } from '@/lib/toast';

const figure = (
  isLoading: boolean,
  isError: boolean,
  count: number | undefined
) =>
  isLoading ? (
    <>
      <span className='sr-only'>Loading...</span>
      <Skeleton className='h-8 w-12' />
    </>
  ) : isError ? (
    <span className='text-err text-[0.8125rem]'>Error fetching data</span>
  ) : (
    count
  );

const OverviewContent = () => {
  const {
    data: orgs,
    isLoading: orgsIsLoading,
    error: orgIsError,
  } = useQuery({
    ...getOrganizationsOptions({ query: { limit: 1 } }),
  });

  const {
    data: runs,
    isLoading: runsIsLoading,
    error: runsIsError,
  } = useQuery({
    ...getRunsOptions({ query: { limit: 1 } }),
  });

  const {
    data: activeRuns,
    isLoading: activeRunsIsLoading,
    error: activeRunsIsError,
  } = useQuery({
    ...getRunsOptions({
      query: { limit: 1, status: 'active' },
    }),
  });

  if (orgIsError || runsIsError || activeRunsIsError) {
    toastError(
      'Unable to load data',
      orgIsError || runsIsError || activeRunsIsError
    );
  }

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Administration'
        description='Server-wide figures, users, plugins and branding'
      />
      <StatisticsRow className='[&>a:hover]:bg-muted/60'>
        <Link to='/organizations'>
          <StatisticsCard
            title='Organizations'
            value={figure(
              orgsIsLoading,
              !!orgIsError,
              orgs?.pagination.totalCount
            )}
          />
        </Link>
        <Link to='/admin/runs'>
          <StatisticsCard
            title='Runs'
            value={figure(
              runsIsLoading,
              !!runsIsError,
              runs?.pagination.totalCount
            )}
          />
        </Link>
        <Link to='/admin/runs' search={{ status: [zOrtRunStatus.enum.ACTIVE] }}>
          <StatisticsCard
            title='Active runs'
            value={figure(
              activeRunsIsLoading,
              !!activeRunsIsError,
              activeRuns?.pagination.totalCount
            )}
          />
        </Link>
      </StatisticsRow>
    </div>
  );
};

export const Route = createFileRoute('/admin/')({
  component: OverviewContent,
});
