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

import { UseFormReturn, useWatch } from 'react-hook-form';

import { PreconfiguredPluginDescriptor, Secret } from '@/api';
import { PluginMultiSelectField } from '@/components/form/plugin-multi-select-field';
import { CreateRunFormValues } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components';
import {
  JobSection,
  SwitchField,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/form-section';
import {
  KEEP_ALIVE_DESCRIPTION,
  PROVIDER_ORDER_DESCRIPTION,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/form-sections';
import { summarizePlugins } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/section-summaries';

type ReporterFieldsProps = {
  form: UseFormReturn<CreateRunFormValues>;
  reporterPlugins: PreconfiguredPluginDescriptor[];
  isSuperuser: boolean;
  packageConfigurationProviderPlugins: PreconfiguredPluginDescriptor[];
  secrets: Secret[];
  isRerun: boolean;
};

export const ReporterFields = ({
  form,
  reporterPlugins,
  isSuperuser,
  packageConfigurationProviderPlugins,
  secrets,
  isRerun,
}: ReporterFieldsProps) => {
  const evaluatorEnabled = useWatch({
    control: form.control,
    name: 'jobConfigs.evaluator.enabled',
  });
  const formats = useWatch({
    control: form.control,
    name: 'jobConfigs.reporter.formats',
  });

  return (
    <JobSection
      control={form.control}
      job='reporter'
      summary={summarizePlugins(
        formats,
        reporterPlugins,
        'No report formats selected'
      )}
    >
      <PluginMultiSelectField
        form={form}
        name='jobConfigs.reporter.formats'
        configName='jobConfigs.reporter.config'
        label='Report formats'
        description={<>Select the report formats to generate from the run.</>}
        plugins={reporterPlugins}
        secrets={secrets}
        showSelectedPluginsFirst={isRerun}
      />
      {/* With the Evaluator enabled, the Reporter uses its package configuration. */}
      {!evaluatorEnabled && (
        <PluginMultiSelectField
          form={form}
          name='jobConfigs.reporter.packageConfigurationProviders'
          configName='jobConfigs.reporter.packageConfigurationProviderConfig'
          label='Package configuration providers'
          description={PROVIDER_ORDER_DESCRIPTION}
          plugins={packageConfigurationProviderPlugins}
          secrets={secrets}
          enableReordering
          showSelectedPluginsFirst={isRerun}
        />
      )}
      {isSuperuser && (
        <SwitchField
          control={form.control}
          name='jobConfigs.reporter.keepAliveWorker'
          label='Keep worker alive'
          description={KEEP_ALIVE_DESCRIPTION}
        />
      )}
    </JobSection>
  );
};
