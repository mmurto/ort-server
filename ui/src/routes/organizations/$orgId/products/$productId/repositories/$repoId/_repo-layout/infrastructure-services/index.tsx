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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { EditIcon, PlusIcon } from 'lucide-react';

import { InfrastructureService } from '@/api';
import {
  deleteRepositoryInfrastructureServiceMutation,
  getRepositoryInfrastructureServicesOptions,
  getRepositoryInfrastructureServicesQueryKey,
  getRepositoryOptions,
} from '@/api/@tanstack/react-query.gen';
import { DataTable } from '@/components/data-table/data-table';
import { DeleteDialog } from '@/components/delete-dialog';
import { DeleteIconButton } from '@/components/delete-icon-button';
import { LoadingIndicator } from '@/components/loading-indicator';
import { PageHeader, SheetSection } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { selectNoTableState, useAppTable } from '@/hooks/use-app-table';
import type { AppCellContext, AppColumnDef } from '@/hooks/use-app-table';
import { ApiError } from '@/lib/api-error';
import { toast, toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { paginationSearchParameterSchema } from '@/schemas';

const defaultPageSize = 10;

const ActionCell = ({
  row,
}: AppCellContext<InfrastructureService, unknown>) => {
  const params = Route.useParams();
  const queryClient = useQueryClient();

  const { mutateAsync: delService } = useMutation({
    ...deleteRepositoryInfrastructureServiceMutation(),
    onSuccess() {
      toast.info('Delete Infrastructure Service', {
        description: `Infrastructure service "${row.original.name}" deleted successfully.`,
      });
      queryClient.invalidateQueries({
        queryKey: getRepositoryInfrastructureServicesQueryKey({
          path: {
            repositoryId: Number.parseInt(params.repoId),
          },
        }),
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  return (
    <div className='flex justify-end gap-1'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to='/organizations/$orgId/products/$productId/repositories/$repoId/infrastructure-services/$serviceName/edit'
            params={{
              orgId: params.orgId,
              productId: params.productId,
              repoId: params.repoId,
              serviceName: row.original.name,
            }}
            className={cn(buttonVariants({ variant: 'outline' }), 'h-8 px-2')}
          >
            <span className='sr-only'>Edit</span>
            <EditIcon size={16} />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Edit this infrastructure service</TooltipContent>
      </Tooltip>

      <DeleteDialog
        thingName={'infrastructure service'}
        uiComponent={<DeleteIconButton />}
        onDelete={() =>
          delService({
            path: {
              repositoryId: Number.parseInt(params.repoId),
              serviceName: row.original.name,
            },
          })
        }
      />
    </div>
  );
};

const InfrastructureServices = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : defaultPageSize;

  const {
    data: repository,
    error: repositoryError,
    isPending: repositoryIsPending,
    isError: repositoryIsError,
  } = useQuery({
    ...getRepositoryOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
      },
    }),
  });

  const {
    data: infraServices,
    error: infraError,
    isPending: infraIsPending,
    isError: infraIsError,
  } = useQuery({
    ...getRepositoryInfrastructureServicesOptions({
      path: { repositoryId: Number.parseInt(params.repoId) },
      query: { limit: pageSize, offset: pageIndex * pageSize },
    }),
  });

  const columns: AppColumnDef<InfrastructureService>[] = [
    {
      accessorKey: 'details',
      header: undefined,
      cell: ({ row }) => (
        <div className='flex min-w-0 flex-col gap-0.5'>
          <div className='font-medium'>{row.original.name}</div>
          {row.original.description && (
            <div className='text-muted-foreground text-[0.8125rem]'>
              {row.original.description}
            </div>
          )}
          <div className='font-mono text-xs break-all'>{row.original.url}</div>
        </div>
      ),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'usernameSecretRef',
      header: 'Username Secret',
      cell: ({ row }) => (
        <div className='flex items-baseline font-mono text-xs'>
          {row.original.usernameSecretRef}
        </div>
      ),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'passwordSecretRef',
      header: 'Password Secret',
      cell: ({ row }) => (
        <div className='flex items-baseline font-mono text-xs'>
          {row.original.passwordSecretRef}
        </div>
      ),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'credentialsTypes',
      header: 'Credentials Included In Files',
      cell: ({ row }) => {
        const inFiles = row.original.credentialsTypes?.map((type) => {
          if (type === 'NETRC_FILE') return 'Netrc File';
          if (type === 'GIT_CREDENTIALS_FILE') return 'Git Credentials File';
        });

        return (
          <span className='text-muted-foreground text-[0.8125rem]'>
            {inFiles?.join(', ')}
          </span>
        );
      },
      enableColumnFilter: false,
    },
    {
      id: 'actions',
      cell: ActionCell,
      enableColumnFilter: false,
    },
  ];

  const table = useAppTable(
    {
      data: infraServices?.data || [],
      columns,
      pageCount: Math.ceil(
        (infraServices?.pagination.totalCount ?? 0) / pageSize
      ),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
      },
      manualPagination: true,
    },
    selectNoTableState
  );

  if (repositoryIsPending || infraIsPending) {
    return <LoadingIndicator />;
  }

  if (repositoryIsError || infraIsError) {
    toastError('Unable to load data', repositoryError || infraError);
    return;
  }

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Infrastructure Services'
        description={`Manage infrastructure services for ${repository.url}`}
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild>
                <Link
                  to='/organizations/$orgId/products/$productId/repositories/$repoId/infrastructure-services/create'
                  params={{
                    orgId: params.orgId,
                    productId: params.productId,
                    repoId: params.repoId,
                  }}
                >
                  <PlusIcon />
                  Add infrastructure service
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Create a new infrastructure service for this repository.
            </TooltipContent>
          </Tooltip>
        }
      />
      <SheetSection
        title='All infrastructure services'
        meta={`${infraServices.pagination.totalCount} in total`}
      >
        <DataTable
          table={table}
          setCurrentPageOptions={(currentPage) => {
            return {
              to: Route.to,
              search: { ...search, page: currentPage },
            };
          }}
          setPageSizeOptions={(size) => {
            return {
              to: Route.to,
              search: { ...search, page: 1, pageSize: size },
            };
          }}
        />
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/infrastructure-services/'
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
        ...getRepositoryInfrastructureServicesOptions({
          path: { repositoryId: Number.parseInt(params.repoId) },
          query: {
            limit: pageSize || defaultPageSize,
            offset: page ? (page - 1) * (pageSize || defaultPageSize) : 0,
          },
        }),
      }),
    ]);
  },
  component: InfrastructureServices,
  pendingComponent: LoadingIndicator,
});
