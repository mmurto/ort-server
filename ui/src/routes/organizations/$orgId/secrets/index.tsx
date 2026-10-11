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

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { EditIcon, PlusIcon } from 'lucide-react';

import { Secret } from '@/api';
import {
  deleteOrganizationSecretMutation,
  getOrganizationOptions,
  getOrganizationSecretsOptions,
  getOrganizationSecretsQueryKey,
} from '@/api/@tanstack/react-query.gen';
import { DataTable } from '@/components/data-table/data-table';
import { DeleteDialog } from '@/components/delete-dialog';
import { DeleteIconButton } from '@/components/delete-icon-button';
import { LoadError } from '@/components/load-error';
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

const ActionCell = ({ row }: AppCellContext<Secret, unknown>) => {
  const params = Route.useParams();
  const queryClient = useQueryClient();

  const { data: organization } = useSuspenseQuery({
    ...getOrganizationOptions({
      path: { organizationId: Number.parseInt(params.orgId) },
    }),
  });

  const { mutateAsync: delSecret } = useMutation({
    ...deleteOrganizationSecretMutation(),
    onSuccess() {
      toast.info('Delete Secret', {
        description: `Secret "${row.original.name}" deleted successfully.`,
      });
      queryClient.invalidateQueries({
        queryKey: getOrganizationSecretsQueryKey({
          path: { organizationId: organization.id },
        }),
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  return (
    <div className='flex items-center justify-end gap-1'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to='/organizations/$orgId/secrets/$secretName/edit'
            params={{ orgId: params.orgId, secretName: row.original.name }}
            className={cn(buttonVariants({ variant: 'outline' }), 'h-8 px-2')}
          >
            <span className='sr-only'>Edit</span>
            <EditIcon size={16} />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Edit this secret</TooltipContent>
      </Tooltip>
      <DeleteDialog
        thingName={'secret'}
        thingLabel={row.original.name}
        uiComponent={<DeleteIconButton />}
        onDelete={async () =>
          await delSecret({
            path: {
              organizationId: organization.id,
              secretName: row.original.name,
            },
          })
        }
      />
    </div>
  );
};

const columns: AppColumnDef<Secret>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
    enableColumnFilter: false,
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className='text-muted-foreground text-[0.8125rem]'>
        {row.original.description}
      </span>
    ),
    enableColumnFilter: false,
  },
  {
    id: 'actions',
    cell: ActionCell,
    enableColumnFilter: false,
  },
];

const OrganizationSecrets = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : defaultPageSize;

  const { data: organization } = useQuery({
    ...getOrganizationOptions({
      path: { organizationId: Number.parseInt(params.orgId) },
    }),
  });

  const {
    data: secrets,
    error: secretsError,
    isPending: secretsIsPending,
    isError: secretsIsError,
    refetch: refetchSecrets,
  } = useQuery({
    ...getOrganizationSecretsOptions({
      path: { organizationId: Number.parseInt(params.orgId) },
      query: { limit: pageSize, offset: pageIndex * pageSize },
    }),
    placeholderData: keepPreviousData,
  });

  const table = useAppTable(
    {
      data: secrets?.data || [],
      columns,
      pageCount: Math.ceil((secrets?.pagination.totalCount ?? 0) / pageSize),
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

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Secrets'
        description={`Manage secrets for ${organization?.name ?? 'this organization'}`}
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild>
                <Link
                  to='/organizations/$orgId/secrets/create-secret'
                  params={{ orgId: params.orgId }}
                >
                  <PlusIcon />
                  Add secret
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Create a new secret for this organization
            </TooltipContent>
          </Tooltip>
        }
      />
      <SheetSection
        title='All secrets'
        meta={secrets ? `${secrets.pagination.totalCount} in total` : undefined}
      >
        {secretsIsError ? (
          <LoadError
            what='secrets'
            error={secretsError}
            onRetry={() => refetchSecrets()}
          />
        ) : secretsIsPending ? (
          <LoadingIndicator />
        ) : (
          <DataTable
            table={table}
            noResultsContent={
              <div className='text-muted-foreground text-[0.8125rem]'>
                No secrets yet.
              </div>
            }
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
        )}
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute('/organizations/$orgId/secrets/')({
  validateSearch: paginationSearchParameterSchema,
  loaderDeps: ({ search: { page, pageSize } }) => ({ page, pageSize }),
  loader: async ({
    context: { queryClient },
    params,
    deps: { page, pageSize },
  }) => {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        ...getOrganizationOptions({
          path: { organizationId: Number.parseInt(params.orgId) },
        }),
      }),
      queryClient.prefetchQuery({
        ...getOrganizationSecretsOptions({
          path: { organizationId: Number.parseInt(params.orgId) },
          query: {
            limit: pageSize || defaultPageSize,
            offset: page ? (page - 1) * (pageSize || defaultPageSize) : 0,
          },
        }),
      }),
    ]);
  },
  component: OrganizationSecrets,
  pendingComponent: LoadingIndicator,
});
