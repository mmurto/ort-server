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

import { useParams } from '@tanstack/react-router';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useFieldArray, UseFormReturn, useWatch } from 'react-hook-form';

import { PreconfiguredPluginDescriptor, Secret } from '@/api';
import { zAnalyzerPhase } from '@/api/zod.gen';
import { MultiSelectField } from '@/components/form/multi-select-field.tsx';
import { PluginMultiSelectField } from '@/components/form/plugin-multi-select-field';
import { SecretSelect } from '@/components/secret-select';
import { InlineCode } from '@/components/typography.tsx';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { capitalize } from '@/helpers/capitalize';
import {
  OrganizationPermissions,
  ProductPermissions,
  RepositoryPermissions,
} from '@/lib/permissions.ts';
import { cn } from '@/lib/utils';
import { CreateRunFormValues } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components';
import {
  FieldHelp,
  JobSection,
  MoreOptions,
  SwitchField,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/form-section';
import {
  KEEP_ALIVE_DESCRIPTION,
  PROVIDER_ORDER_DESCRIPTION,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/form-sections';
import { summarizeAnalyzer } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/section-summaries';
import { EnvironmentDefinitionsFields } from './environment-definitions';

type AnalyzerFieldsProps = {
  form: UseFormReturn<CreateRunFormValues>;
  isSuperuser: boolean;
  packageCurationProviderPlugins: PreconfiguredPluginDescriptor[];
  packageManagerPlugins: PreconfiguredPluginDescriptor[];
  pluginSecrets: Secret[];
  isRerun: boolean;
  permissions: {
    organization: OrganizationPermissions | undefined;
    product: ProductPermissions | undefined;
    repository: RepositoryPermissions | undefined;
  };
};

export const AnalyzerFields = ({
  form,
  isSuperuser,
  packageCurationProviderPlugins,
  packageManagerPlugins,
  pluginSecrets,
  isRerun,
  permissions,
}: AnalyzerFieldsProps) => {
  const { orgId, productId, repoId } = useParams({ strict: false });
  const {
    fields: environmentVariablesFields,
    append: environmentVariablesAppend,
    remove: environmentVariablesRemove,
  } = useFieldArray({
    name: 'jobConfigs.analyzer.environmentVariables',
    control: form.control,
  });

  const [
    keepAliveWorker,
    packageManagers,
    packageCurationProviders,
    repositoryConfigPath,
    allowDynamicVersions,
    skipExcluded,
    environmentDefinitions,
  ] = useWatch({
    control: form.control,
    name: [
      'jobConfigs.analyzer.keepAliveWorker',
      'jobConfigs.analyzer.packageManagers',
      'jobConfigs.analyzer.packageCurationProviders',
      'jobConfigs.analyzer.repositoryConfigPath',
      'jobConfigs.analyzer.allowDynamicVersions',
      'jobConfigs.analyzer.skipExcluded',
      'jobConfigs.analyzer.environmentDefinitions',
    ],
  });

  // Show the more options at first if any of them differs from its default, e.g. in a rerun.
  const hasAdvancedValues =
    Boolean(repositoryConfigPath) ||
    allowDynamicVersions === false ||
    skipExcluded === false ||
    environmentVariablesFields.length > 0 ||
    Object.keys(environmentDefinitions ?? {}).length > 0 ||
    Boolean(keepAliveWorker);

  const hasSecrets = environmentVariablesFields.some(
    (field) => 'secretName' in field
  );
  const hasValues = environmentVariablesFields.some(
    (field) => 'value' in field
  );
  const secondColumnLabel =
    hasSecrets && hasValues
      ? 'Value / Secret'
      : hasSecrets
        ? 'Secret'
        : 'Value';

  return (
    <JobSection
      control={form.control}
      job='analyzer'
      alwaysEnabled
      summary={summarizeAnalyzer({
        packageManagers,
        packageCurationProviders,
        environmentVariables: environmentVariablesFields,
      })}
    >
      <PluginMultiSelectField
        form={form}
        name='jobConfigs.analyzer.packageManagers'
        configName='jobConfigs.analyzer.packageManagerConfig'
        mustRunAfterName='jobConfigs.analyzer.packageManagerMustRunAfter'
        label='Enabled package managers'
        description={
          <>
            Select the package managers enabled for this run; the 'Unmanaged'
            package manager is always enabled.
          </>
        }
        plugins={packageManagerPlugins}
        secrets={[]}
      />
      <PluginMultiSelectField
        form={form}
        name='jobConfigs.analyzer.packageCurationProviders'
        configName='jobConfigs.analyzer.packageCurationProviderConfig'
        label='Package curation providers'
        description={PROVIDER_ORDER_DESCRIPTION}
        plugins={packageCurationProviderPlugins}
        secrets={pluginSecrets}
        enableReordering
        showSelectedPluginsFirst={isRerun}
      />
      <MoreOptions
        control={form.control}
        names={[
          'jobConfigs.analyzer.repositoryConfigPath',
          'jobConfigs.analyzer.allowDynamicVersions',
          'jobConfigs.analyzer.skipExcluded',
          'jobConfigs.analyzer.environmentVariables',
          'jobConfigs.analyzer.environmentDefinitions',
          'jobConfigs.analyzer.keepAliveWorker',
          'jobConfigs.analyzer.keepAlivePhases',
        ]}
        defaultOpen={hasAdvancedValues}
      >
        <FormField
          control={form.control}
          name='jobConfigs.analyzer.repositoryConfigPath'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repository configuration path</FormLabel>
              <FormControl>
                <Input {...field} placeholder='(optional)' />
              </FormControl>
              <FormDescription>
                The path to a repository configuration file; defaults to{' '}
                <InlineCode>.ort.yml</InlineCode> in the root of the analyzed
                project repository.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <SwitchField
          control={form.control}
          name='jobConfigs.analyzer.allowDynamicVersions'
          label='Allow dynamic versions'
          description='Analyze projects that use version ranges to declare their dependencies.'
        />
        <SwitchField
          control={form.control}
          name='jobConfigs.analyzer.skipExcluded'
          label='Skip excluded'
          description='Skip the scopes and paths that are excluded.'
        />
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-1'>
            <h3 className='text-sm font-medium'>Environment variables</h3>
            <FieldHelp topic='Environment variables'>
              <p>
                A list of environment variable names and their values, either
                literal ones, or retrieved from named secrets.
              </p>
              <p>
                In case of Gradle, this can also be used to{' '}
                <a
                  className='link underline'
                  href='https://docs.gradle.org/current/userguide/build_environment.html#setting_a_project_property'
                  target='_blank'
                  rel='noreferrer'
                >
                  set Gradle properties by prefixing them with{' '}
                  <InlineCode>ORG_GRADLE_PROJECT_</InlineCode>
                </a>
                .
              </p>
            </FieldHelp>
          </div>
          <p className='text-muted-foreground text-[0.8125rem]'>
            Environment variables required by the build process, with literal
            values or values from secrets.
          </p>
          {environmentVariablesFields.map((field, index) => {
            const isSecret = 'secretName' in field;
            return (
              <div key={field.id} className='flex flex-row gap-2'>
                <div className='min-w-0 flex-1'>
                  <FormField
                    control={form.control}
                    name={`jobConfigs.analyzer.environmentVariables.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(index > 0 && 'sr-only')}>
                          {index === 0 ? 'Name' : `Name ${index + 1}`}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className='min-w-0 flex-1'>
                  {isSecret ? (
                    <FormField
                      control={form.control}
                      name={`jobConfigs.analyzer.environmentVariables.${index}.secretName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(index > 0 && 'sr-only')}>
                            {index === 0
                              ? secondColumnLabel
                              : `Secret ${index + 1}`}
                          </FormLabel>
                          <SecretSelect
                            value={
                              typeof field.value === 'string'
                                ? field.value
                                : undefined
                            }
                            onChange={field.onChange}
                            placeholder='Select a secret'
                            orgId={orgId}
                            productId={productId}
                            repositoryId={repoId}
                            permissions={permissions}
                            className='w-full'
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name={`jobConfigs.analyzer.environmentVariables.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(index > 0 && 'sr-only')}>
                            {index === 0
                              ? secondColumnLabel
                              : `Value ${index + 1}`}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? undefined}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <div className='flex items-end'>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    aria-label={`Remove environment variable ${index + 1}`}
                    onClick={() => {
                      environmentVariablesRemove(index);
                    }}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            );
          })}
          <div className='mt-1 flex flex-wrap gap-2'>
            <Button
              size='sm'
              variant='outline'
              type='button'
              onClick={() => {
                environmentVariablesAppend({ name: '', value: '' });
              }}
            >
              <PlusIcon />
              Add environment variable
            </Button>
            <Button
              size='sm'
              variant='outline'
              type='button'
              onClick={() => {
                environmentVariablesAppend({ name: '', secretName: '' });
              }}
            >
              <PlusIcon />
              Add environment secret
            </Button>
          </div>
        </div>
        <EnvironmentDefinitionsFields form={form} />
        {isSuperuser && (
          <FormField
            control={form.control}
            name='jobConfigs.analyzer.keepAliveWorker'
            render={({ field }) => (
              <FormItem className='rounded-xs border px-4 py-3'>
                <div className='flex flex-row items-center justify-between gap-4'>
                  <div className='flex flex-col gap-1'>
                    <FormLabel>Keep worker alive</FormLabel>
                    <FormDescription>{KEEP_ALIVE_DESCRIPTION}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      ref={field.ref}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>
                <div
                  className={cn(
                    'grid transition-[grid-template-rows,opacity] duration-400 ease-out motion-reduce:transition-none',
                    keepAliveWorker
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'invisible grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className='overflow-hidden'>
                    <MultiSelectField
                      form={form}
                      name='jobConfigs.analyzer.keepAlivePhases'
                      label='Phases'
                      description={
                        <>
                          The phases in which the worker is kept alive; if none
                          are selected, it is kept alive in the{' '}
                          <InlineCode>full</InlineCode> and{' '}
                          <InlineCode>analysis</InlineCode> phases.
                        </>
                      }
                      options={zAnalyzerPhase.options.map((phase) => ({
                        id: phase,
                        label: capitalize(phase),
                      }))}
                      className='mt-3 mb-0 border-0 p-0'
                    />
                  </div>
                </div>
              </FormItem>
            )}
          />
        )}
      </MoreOptions>
    </JobSection>
  );
};
