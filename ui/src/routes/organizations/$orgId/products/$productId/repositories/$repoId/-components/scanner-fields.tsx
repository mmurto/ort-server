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
import { KEEP_ALIVE_DESCRIPTION } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/form-sections';
import { summarizePlugins } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/section-summaries';

type ScannerFieldsProps = {
  form: UseFormReturn<CreateRunFormValues>;
  scannerPlugins: PreconfiguredPluginDescriptor[];
  secrets: Secret[];
  isSuperuser: boolean;
};

export const ScannerFields = ({
  form,
  scannerPlugins,
  secrets,
  isSuperuser,
}: ScannerFieldsProps) => {
  const scanners = useWatch({
    control: form.control,
    name: 'jobConfigs.scanner.scanners',
  });

  return (
    <JobSection
      control={form.control}
      job='scanner'
      summary={summarizePlugins(
        scanners,
        scannerPlugins,
        'No scanners selected'
      )}
    >
      <SwitchField
        control={form.control}
        name='jobConfigs.scanner.skipConcluded'
        label='Skip concluded'
        description='Skip packages that have a concluded license and authors set (to derive copyrights from).'
      />
      <SwitchField
        control={form.control}
        name='jobConfigs.scanner.skipExcluded'
        label='Skip excluded'
        description='Skip the scopes and paths that are excluded.'
      />
      <PluginMultiSelectField
        form={form}
        name='jobConfigs.scanner.scanners'
        configName='jobConfigs.scanner.config'
        scannerScopeName='jobConfigs.scanner.scannerScopes'
        label='Enabled scanners'
        description={
          <>
            Select the scanners for this run; the scope toggle sets whether a
            scanner runs on projects, packages, or both.
          </>
        }
        plugins={scannerPlugins}
        secrets={secrets}
      />
      {isSuperuser && (
        <SwitchField
          control={form.control}
          name='jobConfigs.scanner.keepAliveWorker'
          label='Keep worker alive'
          description={KEEP_ALIVE_DESCRIPTION}
        />
      )}
    </JobSection>
  );
};
