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

import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';

import { PluginAvailability, PluginDescriptor } from '@/api';
import {
  disablePluginMutation,
  enablePluginMutation,
  getInstalledPluginsOptions,
  getInstalledPluginsQueryKey,
  restrictPluginMutation,
} from '@/api/@tanstack/react-query.gen';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { PageHeader } from '@/components/page-header';
import { PluginAvailabilityToggle } from '@/components/plugin-availability-toggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ApiError } from '@/lib/api-error';
import { queryClient } from '@/lib/query-client.ts';
import { toast, toastError } from '@/lib/toast';

type PluginListProps = {
  value: string;
  title: string;
  description: string;
  plugins: PluginDescriptor[];
};

const PluginList = ({
  value,
  title,
  description,
  plugins,
}: PluginListProps) => {
  const { mutateAsync: enablePlugin, isPending: isEnabling } = useMutation({
    ...enablePluginMutation(),
  });
  const { mutateAsync: disablePlugin, isPending: isDisabling } = useMutation({
    ...disablePluginMutation(),
  });
  const { mutateAsync: restrictPlugin, isPending: isRestricting } = useMutation(
    {
      ...restrictPluginMutation(),
    }
  );

  const isMutating = isEnabling || isDisabling || isRestricting;

  const handleAvailabilityChange = (
    plugin: PluginDescriptor,
    availability: PluginAvailability
  ) => {
    const path = { pluginType: plugin.type, pluginId: plugin.id };

    const onSuccess = (label: string) => {
      toast.info(`Plugin ${label}`, {
        description: `Plugin "${plugin.displayName}" is now ${label.toLowerCase()}.`,
      });
      queryClient.invalidateQueries({
        queryKey: getInstalledPluginsQueryKey(),
      });
    };

    const onError = (error: unknown) => {
      const apiError = error as ApiError;
      toastError(apiError.message, apiError);
    };

    if (availability === 'ENABLED') {
      enablePlugin(
        { path },
        { onSuccess: () => onSuccess('Enabled'), onError }
      );
    } else if (availability === 'RESTRICTED') {
      restrictPlugin(
        { path },
        { onSuccess: () => onSuccess('Restricted'), onError }
      );
    } else {
      disablePlugin(
        { path },
        { onSuccess: () => onSuccess('Disabled'), onError }
      );
    }
  };

  return (
    <AccordionItem value={value}>
      <AccordionTrigger>
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-baseline gap-2 text-[0.9375rem] font-semibold'>
            {title}
            <span className='text-muted-foreground text-[0.8125rem] font-normal'>
              {plugins.length}
            </span>
          </div>
          <div className='text-muted-foreground text-[0.8125rem] font-normal'>
            {description}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {plugins.length === 0 ? (
          <p className='text-muted-foreground text-[0.8125rem]'>
            No plugins of this type are installed.
          </p>
        ) : (
          <ul className='divide-y border-t'>
            {plugins.map((plugin) => (
              <li
                key={plugin.id}
                className='flex flex-wrap items-start justify-between gap-x-8 gap-y-2 py-3'
              >
                <div className='flex min-w-0 flex-1 flex-col gap-1'>
                  <div className='flex flex-wrap items-baseline gap-x-3'>
                    <span className='font-semibold'>{plugin.displayName}</span>
                    <Link
                      className='link text-[0.8125rem]'
                      to={'/admin/plugins/$pluginType/$pluginId'}
                      params={{
                        pluginType: plugin.type,
                        pluginId: plugin.id,
                      }}
                    >
                      Manage Templates
                    </Link>
                  </div>
                  <MarkdownRenderer
                    markdown={plugin.summary}
                    className='text-muted-foreground max-w-[75ch] text-[0.8125rem]'
                  />
                </div>
                <PluginAvailabilityToggle
                  availability={plugin.availability}
                  onAvailabilityChange={(availability) =>
                    handleAvailabilityChange(plugin, availability)
                  }
                  disabled={isMutating}
                />
              </li>
            ))}
          </ul>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

const PluginsComponent = () => {
  const { data: plugins } = useQuery({
    ...getInstalledPluginsOptions(),
  });

  const advisors = plugins?.filter((plugin) => plugin.type === 'ADVISOR') || [];
  const packageConfigurationProviders =
    plugins?.filter(
      (plugin) => plugin.type === 'PACKAGE_CONFIGURATION_PROVIDER'
    ) || [];
  const packageCurationProviders =
    plugins?.filter((plugin) => plugin.type === 'PACKAGE_CURATION_PROVIDER') ||
    [];
  const packageManagers =
    plugins?.filter((plugin) => plugin.type === 'PACKAGE_MANAGER') || [];
  const reporters =
    plugins?.filter((plugin) => plugin.type === 'REPORTER') || [];
  const scanners = plugins?.filter((plugin) => plugin.type === 'SCANNER') || [];

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Installed Plugins'
        description='Set which plugins are available for runs and manage their templates'
      />
      <Accordion type='single' collapsible className='border-y'>
        <PluginList
          value='advisors'
          title='Advisors'
          description='Advisors integrate external vulnerability databases to get information about vulnerabilities in packages.'
          plugins={advisors}
        />
        <PluginList
          value='package-configuration-providers'
          title='Package Configuration Providers'
          description='Providers for package configurations which are used to set path excludes and license finding curations for packages.'
          plugins={packageConfigurationProviders}
        />
        <PluginList
          value='package-curation-providers'
          title='Package Curation Providers'
          description='Providers for package curations which are used to correct metadata of packages.'
          plugins={packageCurationProviders}
        />
        <PluginList
          value='package-managers'
          title='Package Managers'
          description='Package managers are used to detect packages and their dependencies.'
          plugins={packageManagers}
        />
        <PluginList
          value='reporters'
          title='Reporters'
          description='Reporters generate reports like SBOMs from the data collected in a run.'
          plugins={reporters}
        />
        <PluginList
          value='scanners'
          title='Scanners'
          description='Scanners scan packages for license and copyright information.'
          plugins={scanners}
        />
      </Accordion>
    </div>
  );
};

export const Route = createFileRoute('/admin/plugins/')({
  component: PluginsComponent,
});
