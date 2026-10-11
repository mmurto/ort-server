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
import { ExternalLink, History, PlusIcon, Settings } from 'lucide-react';

import {
  getRepositoryOptions,
  getRepositoryRunsOptions,
} from '@/api/@tanstack/react-query.gen';
import { JobDurations } from '@/components/charts/job-durations';
import { RepositoryFavoriteButton } from '@/components/favorite-button';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator';
import { PageHeader, SheetSection } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRepositoryPermission } from '@/hooks/use-authorization';
import { getRepositoryTypeLabel } from '@/lib/types';
import { RepositoryRunsTable } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components';
import { paginationSearchParameterSchema } from '@/schemas';
import { useTablePrefsStore } from '@/store/table-prefs.store';

const defaultPageSize = useTablePrefsStore.getState().runPageSize;

const RepositoryRunsComponent = () => {
  const runPageSize = useTablePrefsStore((state) => state.runPageSize);
  const params = Route.useParams();
  const search = Route.useSearch();
  const { isAllowed: canTriggerRun } = useRepositoryPermission(
    Number.parseInt(params.repoId),
    'TRIGGER_ORT_RUN'
  );
  const { isAllowed: canWrite } = useRepositoryPermission(
    Number.parseInt(params.repoId),
    'WRITE'
  );
  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : runPageSize;

  const {
    data: repo,
    error: repoError,
    isPending: repoIsPending,
    isError: repoIsError,
  } = useQuery({
    ...getRepositoryOptions({
      path: { repositoryId: Number.parseInt(params.repoId) },
    }),
  });

  // The newest run, which the header offers to open directly.
  const { data: latestRuns } = useQuery({
    ...getRepositoryRunsOptions({
      path: { repositoryId: Number.parseInt(params.repoId) },
      query: { limit: 1, sort: '-index' },
    }),
  });
  const latestRun = latestRuns?.data[0];

  if (repoIsPending) {
    return <LoadingIndicator />;
  }

  if (repoIsError) {
    return <LoadError error={repoError} />;
  }

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title={
          <Link
            className='link inline-flex max-w-full min-w-0 items-center gap-2 font-semibold'
            to={repo.url}
            target='_blank'
            title={repo.url}
          >
            <span className='truncate'>{repo.url}</span>
            <ExternalLink className='text-muted-foreground size-4 shrink-0' />
          </Link>
        }
        adornment={
          <RepositoryFavoriteButton
            organizationId={params.orgId}
            productId={params.productId}
            repository={repo}
            size='xs'
            variant='ghost'
            className='size-6 p-0'
          />
        }
        description={
          <span className='flex flex-col gap-1'>
            <span className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
              <span className='text-foreground font-medium'>
                {getRepositoryTypeLabel(repo.type)} repository
              </span>
              {repo.name && <span>{repo.name}</span>}
              <span className='tabular-nums'>
                Repository ID{' '}
                <span className='text-foreground font-medium'>{repo.id}</span>
              </span>
            </span>
            {repo.description && <span>{repo.description}</span>}
          </span>
        }
        actions={
          <>
            {latestRun && (
              <Button asChild variant='outline'>
                <Link
                  to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex'
                  params={{
                    orgId: params.orgId,
                    productId: params.productId,
                    repoId: params.repoId,
                    runIndex: latestRun.index.toString(),
                  }}
                >
                  <History />
                  Latest run
                  <span className='text-muted-foreground tabular-nums'>
                    {latestRun.index}
                  </span>
                </Link>
              </Button>
            )}
            {canWrite && (
              <Button asChild variant='outline'>
                <Link
                  to='/organizations/$orgId/products/$productId/repositories/$repoId/settings'
                  params={{
                    orgId: params.orgId,
                    productId: params.productId,
                    repoId: params.repoId,
                  }}
                >
                  <Settings />
                  Settings
                </Link>
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className='inline-flex'
                  tabIndex={canTriggerRun === false ? 0 : undefined}
                >
                  <Button asChild disabled={canTriggerRun === false}>
                    <Link
                      to='/organizations/$orgId/products/$productId/repositories/$repoId/create-run'
                      params={{
                        orgId: params.orgId,
                        productId: params.productId,
                        repoId: params.repoId,
                      }}
                    >
                      <PlusIcon />
                      New run
                    </Link>
                  </Button>
                </span>
              </TooltipTrigger>
              {canTriggerRun === false && (
                <TooltipContent>Insufficient permissions.</TooltipContent>
              )}
            </Tooltip>
          </>
        }
      />
      <JobDurations
        repoId={params.repoId}
        pageIndex={pageIndex}
        pageSize={pageSize}
      />
      <SheetSection title='Runs'>
        <RepositoryRunsTable
          orgId={params.orgId}
          productId={params.productId}
          repoId={params.repoId}
          pageIndex={pageIndex}
          pageSize={pageSize}
          search={search}
        />
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/runs/'
)({
  validateSearch: paginationSearchParameterSchema,
  loaderDeps: ({ search: { page, pageSize } }) => ({ page, pageSize }),
  loader: async ({
    context: { queryClient },
    params,
    deps: { page, pageSize },
  }) => {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        ...getRepositoryOptions({
          path: { repositoryId: Number.parseInt(params.repoId) },
        }),
      }),
      queryClient.prefetchQuery({
        ...getRepositoryRunsOptions({
          path: { repositoryId: Number.parseInt(params.repoId) },
          query: {
            limit: pageSize || defaultPageSize,
            offset: page ? (page - 1) * (pageSize || defaultPageSize) : 0,
            sort: '-index',
          },
        }),
      }),
    ]);
  },
  component: RepositoryRunsComponent,
  pendingComponent: LoadingIndicator,
});
