/*
 * Copyright (C) 2025 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
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

import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLoaderData } from '@tanstack/react-router';
import { Pencil, PlusIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import { PluginDescriptor, PluginTemplate } from '@/api';
import {
  addTemplateToOrganizationMutation,
  deletePluginTemplateMutation,
  disableGlobalPluginTemplateMutation,
  enableGlobalPluginTemplateMutation,
  getOrganizationOptions,
  getOrganizationsInfiniteOptions,
  getPluginTemplatesOptions,
  getPluginTemplatesQueryKey,
  removeTemplateFromOrganizationMutation,
} from '@/api/@tanstack/react-query.gen';
import { ConfirmDialog } from '@/components/confirm-dialog.tsx';
import { DeleteDialog } from '@/components/delete-dialog.tsx';
import { DeleteIconButton } from '@/components/delete-icon-button.tsx';
import { LoadingIndicator } from '@/components/loading-indicator.tsx';
import { PageHeader, SheetSection } from '@/components/page-header';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import MultipleSelector, {
  Option,
} from '@/components/ui/multiple-selector.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { ApiError } from '@/lib/api-error';
import { DROPDOWN_PAGE_SIZE } from '@/lib/constants.ts';
import { queryClient, routePrefetchStaleTime } from '@/lib/query-client.ts';
import { toSearchFilter } from '@/lib/regex';
import { toast, toastError } from '@/lib/toast';
import { getPluginTypeLabel } from '@/lib/types';
import { Route as LayoutRoute } from '@/routes/admin/plugins/route.tsx';

type PluginTemplateCardProps = {
  plugin: PluginDescriptor;
  template: PluginTemplate;
};

const PluginTemplateCard = ({ plugin, template }: PluginTemplateCardProps) => {
  // Nothing is loaded before the user has touched the field, so a page with many templates on it
  // costs no request for the organizations of any of them.
  const [isSelectorUsed, setIsSelectorUsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirmingGlobal, setIsConfirmingGlobal] = useState(false);
  // The organizations whose removal from the template waits for confirmation.
  const [pendingRemovalIds, setPendingRemovalIds] = useState<number[]>([]);
  // Remounts the selector when a removal is cancelled, so that the removed chip comes back.
  const [selectorKey, setSelectorKey] = useState(0);
  const isRemovalConfirmed = useRef(false);

  const filter = toSearchFilter(useDebounce(searchTerm, 300));

  const organizations = useInfiniteList(
    getOrganizationsInfiniteOptions({
      query: { limit: DROPDOWN_PAGE_SIZE, filter: filter },
    }),
    { enabled: isSelectorUsed }
  );

  const organizationOptions: Option[] = organizations.items.map(
    (organization) => ({
      label: organization.name,
      value: organization.id.toString(),
    })
  );

  // The organizations this template is assigned to are not necessarily part of the page that is
  // shown, so their names are read one by one. The queries are shared by all the cards.
  const assignedIds = template.organizationIds ?? [];

  const assignedOrganizations = useQueries({
    queries: assignedIds.map((organizationId) =>
      getOrganizationOptions({ path: { organizationId: organizationId } })
    ),
  });

  const assignedOptions: Option[] = assignedIds.map(
    (organizationId, index) => ({
      label:
        assignedOrganizations[index]?.data?.name ?? organizationId.toString(),
      value: organizationId.toString(),
    })
  );

  const { mutateAsync: enableGlobal } = useMutation({
    ...enableGlobalPluginTemplateMutation(),
  });
  const { mutateAsync: disableGlobal } = useMutation({
    ...disableGlobalPluginTemplateMutation(),
  });
  const { mutateAsync: deleteTemplate } = useMutation({
    ...deletePluginTemplateMutation(),
  });

  const toggleIsGlobal = () => {
    if (template.isGlobal) {
      return disableGlobal(
        {
          path: {
            pluginType: template.pluginType,
            pluginId: template.pluginId,
            templateName: template.name,
          },
        },
        {
          onSuccess: () => {
            toast.info('Template disabled globally', {
              description: `Template "${template.name}" is no longer global.`,
            });
            queryClient.invalidateQueries({
              queryKey: getPluginTemplatesQueryKey({
                path: {
                  pluginType: template.pluginType,
                  pluginId: template.pluginId,
                },
              }),
            });
          },
          onError: (error: unknown) => {
            const apiError = error as ApiError;
            toastError('Failed to disable template globally', apiError);
          },
        }
      );
    } else {
      return enableGlobal(
        {
          path: {
            pluginType: template.pluginType,
            pluginId: template.pluginId,
            templateName: template.name,
          },
        },
        {
          onSuccess: () => {
            toast.info('Template enabled globally', {
              description: `Template "${template.name}" is now global.`,
            });
            queryClient.invalidateQueries({
              queryKey: getPluginTemplatesQueryKey({
                path: {
                  pluginType: template.pluginType,
                  pluginId: template.pluginId,
                },
              }),
            });
          },
          onError: (error: unknown) => {
            const apiError = error as ApiError;
            toastError('Failed to enable template globally', apiError);
          },
        }
      );
    }
  };

  const onDelete = () => {
    deleteTemplate(
      {
        path: {
          pluginType: template.pluginType,
          pluginId: template.pluginId,
          templateName: template.name,
        },
      },
      {
        onSuccess: () => {
          toast.info('Template deleted', {
            description: `Template "${template.name}" deleted successfully.`,
          });
          queryClient.invalidateQueries({
            queryKey: getPluginTemplatesQueryKey({
              path: {
                pluginType: template.pluginType,
                pluginId: template.pluginId,
              },
            }),
          });
        },
        onError: (error: unknown) => {
          const apiError = error as ApiError;
          toastError('Failed to delete template', apiError);
        },
      }
    );
  };

  const { mutateAsync: addOrganization } = useMutation({
    ...addTemplateToOrganizationMutation(),
    onSuccess: () => {
      toast.info('Organization added to template', {
        description: `Organization added to template "${template.name}".`,
      });
      queryClient.invalidateQueries({
        queryKey: getPluginTemplatesQueryKey({
          path: {
            pluginType: template.pluginType,
            pluginId: template.pluginId,
          },
        }),
      });
    },
    onError: (error) => {
      const apiError = error as ApiError;
      toastError('Failed to add organization to template', apiError);
    },
  });

  const { mutateAsync: removeOrganization } = useMutation({
    ...removeTemplateFromOrganizationMutation(),
    onSuccess: () => {
      toast.info('Organization removed from template', {
        description: `Organization removed from template "${template.name}".`,
      });
      queryClient.invalidateQueries({
        queryKey: getPluginTemplatesQueryKey({
          path: {
            pluginType: template.pluginType,
            pluginId: template.pluginId,
          },
        }),
      });
    },
    onError: (error) => {
      const apiError = error as ApiError;
      toastError('Failed to remove organization from template', apiError);
    },
  });

  return (
    <article className='flex flex-col gap-4 border-t py-5'>
      <div className='flex items-center justify-between gap-4'>
        <h3 className='text-[0.9375rem] font-semibold'>{template.name}</h3>
        <div className='flex items-center gap-1'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='sm' className='h-8 px-2' asChild>
                <Link
                  to='/admin/plugins/$pluginType/$pluginId/edit-template/$templateName'
                  params={{
                    pluginType: template.pluginType,
                    pluginId: template.pluginId,
                    templateName: template.name,
                  }}
                >
                  <span className='sr-only'>Edit Template</span>
                  <Pencil />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit Template</TooltipContent>
          </Tooltip>
          <DeleteDialog
            thingName={'template'}
            thingLabel={template.name}
            uiComponent={<DeleteIconButton />}
            onDelete={onDelete}
            tooltip='Delete Template'
          />
        </div>
      </div>
      <div className='flex flex-col gap-1'>
        <label className='flex items-center gap-2 text-[0.8125rem] font-medium'>
          <Switch
            checked={template.isGlobal}
            onCheckedChange={() => setIsConfirmingGlobal(true)}
          />
          Global Template
        </label>
        <ConfirmDialog
          open={isConfirmingGlobal}
          onOpenChange={setIsConfirmingGlobal}
          title={
            template.isGlobal
              ? `Stop using ${template.name} as the global template?`
              : `Make ${template.name} the global template?`
          }
          description={
            template.isGlobal
              ? 'Organizations without an assigned template no longer use this template.'
              : 'All organizations that do not have another template assigned use this template.'
          }
          confirmLabel={template.isGlobal ? 'Make not global' : 'Make global'}
          onConfirm={() => toggleIsGlobal().then(() => undefined)}
        />
        <p className='text-muted-foreground text-[0.8125rem]'>
          {template.isGlobal
            ? 'This template is global, it is active for all organizations that do not have another template assigned.'
            : 'This template is not global, it is only active for organizations that it is assigned to.'}
        </p>
      </div>

      <div className='flex max-w-2xl flex-col gap-1.5'>
        <p className='text-muted-foreground text-[0.8125rem]'>
          {template.organizationIds && template.organizationIds.length > 0
            ? 'This template is assigned to the following organizations:'
            : 'This template is not assigned to any organizations.'}
        </p>
        <MultipleSelector
          key={selectorKey}
          value={assignedOptions}
          options={organizationOptions}
          loading={organizations.isPending}
          hasMore={organizations.hasNextPage}
          isLoadingMore={organizations.isFetchingNextPage}
          onLoadMore={organizations.fetchNextPage}
          // The organizations are searched on the server, so the list must not be filtered again
          // by what has been typed.
          commandProps={{ shouldFilter: false }}
          inputProps={{
            onValueChange: setSearchTerm,
            onFocus: () => setIsSelectorUsed(true),
          }}
          emptyIndicator={
            <p className='text-muted-foreground py-2 text-center text-[0.8125rem]'>
              No results found.
            </p>
          }
          loadingIndicator={
            <p className='text-muted-foreground py-2 text-center text-[0.8125rem]'>
              Loading...
            </p>
          }
          placeholder='Assign organizations...'
          onChange={(newSelected) => {
            const oldIds = template.organizationIds ?? [];
            const newIds = newSelected.map((o) => Number(o.value));
            for (const opt of newSelected) {
              if (!oldIds.includes(Number(opt.value))) {
                addOrganization({
                  path: {
                    pluginType: template.pluginType,
                    pluginId: template.pluginId,
                    templateName: template.name,
                  },
                  query: { organizationId: opt.value },
                });
              }
            }
            const removedIds = oldIds.filter((id) => !newIds.includes(id));
            if (removedIds.length > 0) setPendingRemovalIds(removedIds);
          }}
        />
        <ConfirmDialog
          open={pendingRemovalIds.length > 0}
          onOpenChange={(open) => {
            if (!open) {
              if (!isRemovalConfirmed.current) setSelectorKey((key) => key + 1);
              isRemovalConfirmed.current = false;
              setPendingRemovalIds([]);
            }
          }}
          title={`Remove ${pendingRemovalIds
            .map(
              (id) =>
                assignedOptions.find((option) => option.value === id.toString())
                  ?.label ?? id.toString()
            )
            .join(', ')} from ${template.name}?`}
          description={
            pendingRemovalIds.length > 1
              ? 'The template no longer applies to the runs of these organizations.'
              : 'The template no longer applies to the runs of this organization.'
          }
          confirmLabel='Remove'
          destructive
          onConfirm={() =>
            Promise.all(
              pendingRemovalIds.map((id) =>
                removeOrganization({
                  path: {
                    pluginType: template.pluginType,
                    pluginId: template.pluginId,
                    templateName: template.name,
                  },
                  query: { organizationId: id.toString() },
                })
              )
            ).then(() => {
              isRemovalConfirmed.current = true;
            })
          }
        />
      </div>

      {plugin.options && plugin.options.length > 0 && (
        <dl className='grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-[0.8125rem]'>
          {plugin.options.map((pluginOption) => {
            const templateOption = template.options.find(
              (opt) => opt.option === pluginOption.name
            );
            return (
              <div key={pluginOption.name} className='contents'>
                <dt className='font-mono text-xs leading-5'>
                  {pluginOption.name}
                </dt>
                <dd className='flex min-w-0 flex-wrap items-center gap-2'>
                  {templateOption ? (
                    <>
                      <span className='font-mono text-xs break-all'>
                        {templateOption.value}
                      </span>
                      <Badge variant='outline'>{pluginOption.type}</Badge>
                      {templateOption.isFinal && (
                        <Badge className='bg-ok-soft text-ok border-transparent'>
                          Final
                        </Badge>
                      )}
                    </>
                  ) : (
                    <>
                      <Badge className='bg-neutral-soft text-muted-foreground border-transparent'>
                        Not set
                      </Badge>
                      <Badge variant='outline'>{pluginOption.type}</Badge>
                    </>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </article>
  );
};

const PluginTemplatesComponent = () => {
  const params = Route.useParams();
  const { plugins } = useLoaderData({ from: LayoutRoute.id });

  const pluginType = params.pluginType;
  const pluginId = params.pluginId;

  const plugin = plugins.find(
    (p) => p.type === pluginType && p.id === pluginId
  );

  const {
    data: pluginTemplates,
    error: pluginTemplatesError,
    isPending: pluginTemplatesIsPending,
    isError: pluginTemplatesIsError,
  } = useQuery({
    ...getPluginTemplatesOptions({
      path: {
        pluginType: pluginType,
        pluginId: pluginId,
      },
    }),
    staleTime: routePrefetchStaleTime,
  });

  if (!plugin) {
    toast.error('Plugin not found', {
      description: `No plugin found with type "${pluginType}" and id "${pluginId}".`,
      duration: Infinity,
      cancel: {
        label: 'Dismiss',
        onClick: () => {},
      },
    });
    return;
  }

  if (pluginTemplatesIsPending) {
    return <LoadingIndicator />;
  }

  if (pluginTemplatesIsError) {
    toastError('Failed to load plugin templates', pluginTemplatesError);
    return;
  }

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title={`${plugin.displayName} Templates`}
        description={`Manage plugin templates for the ${plugin.displayName} ${getPluginTypeLabel(pluginType)} plugin.`}
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild>
                <Link
                  to={'/admin/plugins/$pluginType/$pluginId/create-template'}
                  params={{
                    pluginType: pluginType,
                    pluginId: pluginId,
                  }}
                >
                  <PlusIcon />
                  Create Template
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Create a new plugin configuration template.
            </TooltipContent>
          </Tooltip>
        }
      />
      <SheetSection
        title='Templates'
        meta={`${pluginTemplates.length} in total`}
      >
        {pluginTemplates.length > 0 ? (
          <div className='border-b'>
            {pluginTemplates.map((template) => (
              <PluginTemplateCard
                key={template.name}
                plugin={plugin}
                template={template}
              />
            ))}
          </div>
        ) : (
          <p className='text-muted-foreground text-[0.8125rem]'>
            No templates found for this plugin.
          </p>
        )}
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute('/admin/plugins/$pluginType/$pluginId/')({
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.prefetchQuery({
      ...getPluginTemplatesOptions({
        path: {
          pluginType: params.pluginType,
          pluginId: params.pluginId,
        },
      }),
      staleTime: routePrefetchStaleTime,
    });
  },
  component: PluginTemplatesComponent,
  pendingComponent: LoadingIndicator,
});
