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
import z from 'zod';

import { Secret } from '@/api';
import {
  deleteRepositorySecretMutation,
  getOrganizationOptions,
  getOrganizationSecretsOptions,
  getProductOptions,
  getProductSecretsOptions,
  getRepositoryOptions,
  getRepositorySecretsOptions,
  getRepositorySecretsQueryKey,
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
import {
  useOrganizationPermission,
  useProductPermission,
} from '@/hooks/use-authorization';
import { ApiError } from '@/lib/api-error';
import { toast, toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  orgPaginationSearchParameterSchema,
  paginationSearchParameterSchema,
  productPaginationSearchParameterSchema,
} from '@/schemas';

const defaultPageSize = 5;

const ActionCell = ({ row }: AppCellContext<Secret, unknown>) => {
  const params = Route.useParams();
  const queryClient = useQueryClient();

  const { data: repo } = useSuspenseQuery({
    ...getRepositoryOptions({
      path: { repositoryId: Number.parseInt(params.repoId) },
    }),
  });

  const { mutateAsync: deleteSecret } = useMutation({
    ...deleteRepositorySecretMutation(),
    onSuccess() {
      toast.info('Delete Secret', {
        description: `Secret "${row.original.name}" deleted successfully.`,
      });
      queryClient.invalidateQueries({
        queryKey: getRepositorySecretsQueryKey({
          path: { repositoryId: repo.id },
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
            to='/organizations/$orgId/products/$productId/repositories/$repoId/secrets/$secretName/edit'
            params={{
              orgId: params.orgId,
              productId: params.productId,
              repoId: params.repoId,
              secretName: row.original.name,
            }}
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
        onDelete={() =>
          deleteSecret({
            path: { repositoryId: repo.id, secretName: row.original.name },
          })
        }
      />
    </div>
  );
};

const baseColumns: AppColumnDef<Secret>[] = [
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
];

const columns: AppColumnDef<Secret>[] = [
  ...baseColumns,
  {
    id: 'actions',
    cell: ActionCell,
    enableColumnFilter: false,
  },
];

const RepositorySecrets = () => {
  const params = Route.useParams();
  const search = Route.useSearch();
  const { isAllowed: canManageProductSecrets } = useProductPermission(
    Number.parseInt(params.productId),
    'WRITE_SECRETS'
  );
  const { isAllowed: canManageOrgSecrets } = useOrganizationPermission(
    Number.parseInt(params.orgId),
    'WRITE_SECRETS'
  );
  const pageIndex = search.page ? search.page - 1 : 0;
  const pageSize = search.pageSize ? search.pageSize : defaultPageSize;
  const productPageIndex = search.productPage ? search.productPage - 1 : 0;
  const productPageSize = search.productPageSize
    ? search.productPageSize
    : defaultPageSize;
  const orgPageIndex = search.orgPage ? search.orgPage - 1 : 0;
  const orgPageSize = search.orgPageSize ? search.orgPageSize : defaultPageSize;

  const { data: repo } = useQuery({
    ...getRepositoryOptions({
      path: { repositoryId: Number.parseInt(params.repoId) },
    }),
  });

  const { data: product } = useQuery({
    ...getProductOptions({
      path: { productId: Number.parseInt(params.productId) },
    }),
  });

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
    ...getRepositorySecretsOptions({
      path: { repositoryId: Number.parseInt(params.repoId) },
      query: { limit: pageSize, offset: pageIndex * pageSize },
    }),
    placeholderData: keepPreviousData,
  });

  const {
    data: productSecrets,
    error: productSecretsError,
    isPending: productSecretsIsPending,
    isError: productSecretsIsError,
    refetch: refetchProductSecrets,
  } = useQuery({
    ...getProductSecretsOptions({
      path: { productId: Number.parseInt(params.productId) },
      query: {
        limit: productPageSize,
        offset: productPageIndex * productPageSize,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const {
    data: orgSecrets,
    error: orgSecretsError,
    isPending: orgSecretsIsPending,
    isError: orgSecretsIsError,
    refetch: refetchOrgSecrets,
  } = useQuery({
    ...getOrganizationSecretsOptions({
      path: { organizationId: Number.parseInt(params.orgId) },
      query: {
        limit: orgPageSize,
        offset: orgPageIndex * orgPageSize,
      },
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

  const productTable = useAppTable(
    {
      data: productSecrets?.data || [],
      columns: baseColumns,
      pageCount: Math.ceil(
        (productSecrets?.pagination.totalCount ?? 0) / productPageSize
      ),
      state: {
        pagination: {
          pageIndex: productPageIndex,
          pageSize: productPageSize,
        },
      },
      manualPagination: true,
    },
    selectNoTableState
  );

  const orgTable = useAppTable(
    {
      data: orgSecrets?.data || [],
      columns: baseColumns,
      pageCount: Math.ceil(
        (orgSecrets?.pagination.totalCount ?? 0) / orgPageSize
      ),
      state: {
        pagination: {
          pageIndex: orgPageIndex,
          pageSize: orgPageSize,
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
        description={`Manage secrets for ${repo?.url ?? 'this repository'}.`}
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild>
                <Link
                  to='/organizations/$orgId/products/$productId/repositories/$repoId/secrets/create-secret'
                  params={{
                    orgId: params.orgId,
                    productId: params.productId,
                    repoId: params.repoId,
                  }}
                >
                  <PlusIcon />
                  Add secret
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Create a new secret for this repository
            </TooltipContent>
          </Tooltip>
        }
      />
      <SheetSection
        title='Repository Secrets'
        meta={secrets ? `${secrets.pagination.totalCount} in total` : undefined}
      >
        {secretsIsError ? (
          <LoadError
            what='repository secrets'
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
                No repository secrets yet.
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
      <SheetSection
        title='Product Secrets'
        meta={`Inherited secrets from ${product?.name ?? 'the product'}.`}
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant='outline'
                disabled={canManageProductSecrets === false}
              >
                <Link
                  to='/organizations/$orgId/products/$productId/secrets'
                  params={{
                    orgId: params.orgId,
                    productId: params.productId,
                  }}
                >
                  Manage product secrets
                </Link>
              </Button>
            </TooltipTrigger>
            {canManageProductSecrets === false && (
              <TooltipContent>Insufficient permissions.</TooltipContent>
            )}
          </Tooltip>
        }
      >
        {productSecretsIsError ? (
          <LoadError
            what='product secrets'
            error={productSecretsError}
            onRetry={() => refetchProductSecrets()}
          />
        ) : productSecretsIsPending ? (
          <LoadingIndicator />
        ) : (
          <DataTable
            table={productTable}
            noResultsContent={
              <div className='text-muted-foreground text-[0.8125rem]'>
                The product has no secrets.
              </div>
            }
            setCurrentPageOptions={(currentPage) => {
              return {
                to: Route.to,
                search: { ...search, productPage: currentPage },
              };
            }}
            setPageSizeOptions={(size) => {
              return {
                to: Route.to,
                search: { ...search, productPage: 1, productPageSize: size },
              };
            }}
          />
        )}
      </SheetSection>
      <SheetSection
        title='Organization Secrets'
        meta={`Inherited secrets from ${organization?.name ?? 'the organization'}.`}
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant='outline'
                disabled={canManageOrgSecrets === false}
              >
                <Link
                  to='/organizations/$orgId/secrets'
                  params={{
                    orgId: params.orgId,
                  }}
                >
                  Manage organization secrets
                </Link>
              </Button>
            </TooltipTrigger>
            {canManageOrgSecrets === false && (
              <TooltipContent>Insufficient permissions.</TooltipContent>
            )}
          </Tooltip>
        }
      >
        {orgSecretsIsError ? (
          <LoadError
            what='organization secrets'
            error={orgSecretsError}
            onRetry={() => refetchOrgSecrets()}
          />
        ) : orgSecretsIsPending ? (
          <LoadingIndicator />
        ) : (
          <DataTable
            table={orgTable}
            noResultsContent={
              <div className='text-muted-foreground text-[0.8125rem]'>
                The organization has no secrets.
              </div>
            }
            setCurrentPageOptions={(currentPage) => {
              return {
                to: Route.to,
                search: { ...search, orgPage: currentPage },
              };
            }}
            setPageSizeOptions={(size) => {
              return {
                to: Route.to,
                search: { ...search, orgPage: 1, orgPageSize: size },
              };
            }}
          />
        )}
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/secrets/'
)({
  validateSearch: z.object({
    ...paginationSearchParameterSchema.shape,
    ...productPaginationSearchParameterSchema.shape,
    ...orgPaginationSearchParameterSchema.shape,
  }),
  loaderDeps: ({
    search: {
      page,
      pageSize,
      productPage,
      productPageSize,
      orgPage,
      orgPageSize,
    },
  }) => ({
    page,
    pageSize,
    productPage,
    productPageSize,
    orgPage,
    orgPageSize,
  }),
  loader: async ({
    context: { queryClient },
    params,
    deps: {
      page,
      pageSize,
      productPage,
      productPageSize,
      orgPage,
      orgPageSize,
    },
  }) => {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        ...getRepositoryOptions({
          path: { repositoryId: Number.parseInt(params.repoId) },
        }),
      }),
      queryClient.prefetchQuery({
        ...getProductOptions({
          path: { productId: Number.parseInt(params.productId) },
        }),
      }),
      queryClient.prefetchQuery({
        ...getOrganizationOptions({
          path: { organizationId: Number.parseInt(params.orgId) },
        }),
      }),
      queryClient.prefetchQuery({
        ...getRepositorySecretsOptions({
          path: { repositoryId: Number.parseInt(params.repoId) },
          query: {
            limit: pageSize || defaultPageSize,
            offset: page ? (page - 1) * (pageSize || defaultPageSize) : 0,
          },
        }),
      }),
      queryClient.prefetchQuery({
        ...getProductSecretsOptions({
          path: { productId: Number.parseInt(params.productId) },
          query: {
            limit: productPageSize || defaultPageSize,
            offset: productPage
              ? (productPage - 1) * (productPageSize || defaultPageSize)
              : 0,
          },
        }),
      }),
      queryClient.prefetchQuery({
        ...getOrganizationSecretsOptions({
          path: { organizationId: Number.parseInt(params.orgId) },
          query: {
            limit: orgPageSize || defaultPageSize,
            offset: orgPage
              ? (orgPage - 1) * (orgPageSize || defaultPageSize)
              : 0,
          },
        }),
      }),
    ]);
  },
  component: RepositorySecrets,
  pendingComponent: LoadingIndicator,
});
