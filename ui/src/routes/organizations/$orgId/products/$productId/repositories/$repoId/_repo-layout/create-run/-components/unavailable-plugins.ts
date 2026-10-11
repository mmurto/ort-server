/*
 * Copyright (C) 2026 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
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

import type { PreconfiguredPluginDescriptor } from '@/api';
import type { CreateRunFormValues } from './run-schema';

/** The plugins available for a run, grouped by the form fields that refer to them. */
export type AvailablePlugins = {
  advisorPlugins: PreconfiguredPluginDescriptor[];
  reporterPlugins: PreconfiguredPluginDescriptor[];
  scannerPlugins: PreconfiguredPluginDescriptor[];
  packageCurationProviderPlugins: PreconfiguredPluginDescriptor[];
  packageConfigurationProviderPlugins: PreconfiguredPluginDescriptor[];
  packageManagerPlugins: PreconfiguredPluginDescriptor[];
};

const idsOf = (plugins: PreconfiguredPluginDescriptor[]) =>
  new Set(plugins.map((plugin) => plugin.id));

/** Keep the available IDs; returns the list itself if nothing was removed. */
const keepAvailable = (selected: string[], available: Set<string>) => {
  const retained = selected.filter((id) => available.has(id));
  return retained.length === selected.length ? selected : retained;
};

/** Keep the entries of available plugins; returns the map itself if nothing was removed. */
const keepAvailableEntries = <T extends Record<string, unknown> | undefined>(
  map: T,
  available: Set<string>
): T => {
  if (!map) return map;
  const entries = Object.entries(map).filter(([id]) => available.has(id));
  return entries.length === Object.keys(map).length
    ? map
    : (Object.fromEntries(entries) as T);
};

/** Keep the available package managers and their available dependencies. */
const keepAvailableMustRunAfter = (
  mustRunAfter: Record<string, string[] | undefined>,
  available: Set<string>
) => {
  const retained = Object.fromEntries(
    Object.entries(mustRunAfter)
      .filter(([id]) => available.has(id))
      .map(([id, dependencies]) => [
        id,
        dependencies?.filter((dependency) => available.has(dependency)),
      ])
  );
  const changed =
    Object.keys(retained).length !== Object.keys(mustRunAfter).length ||
    Object.entries(mustRunAfter).some(
      ([id, dependencies]) => retained[id]?.length !== dependencies?.length
    );
  return changed ? retained : mustRunAfter;
};

/**
 * Remove the references to plugins which are not available from the form values: the selected
 * plugins, their configuration, the scanner scopes and the package manager dependencies. Values
 * without such references are returned unchanged, so that callers can compare them by identity.
 *
 * The defaults of the form are cleaned up the same way as its values, so that removing an
 * unavailable plugin from a value the user did not change does not count as a change.
 */
export function withoutUnavailablePlugins(
  values: CreateRunFormValues,
  plugins: AvailablePlugins
): CreateRunFormValues {
  const managerIds = idsOf(plugins.packageManagerPlugins);
  const advisorIds = idsOf(plugins.advisorPlugins);
  const scannerIds = idsOf(plugins.scannerPlugins);
  const reporterIds = idsOf(plugins.reporterPlugins);
  const curationIds = idsOf(plugins.packageCurationProviderPlugins);
  const configurationIds = idsOf(plugins.packageConfigurationProviderPlugins);
  const { analyzer, advisor, scanner, evaluator, reporter } = values.jobConfigs;

  return {
    ...values,
    jobConfigs: {
      ...values.jobConfigs,
      analyzer: {
        ...analyzer,
        packageManagers: keepAvailable(analyzer.packageManagers, managerIds),
        packageManagerConfig: keepAvailableEntries(
          analyzer.packageManagerConfig,
          managerIds
        ),
        packageManagerMustRunAfter: keepAvailableMustRunAfter(
          analyzer.packageManagerMustRunAfter,
          managerIds
        ),
        packageCurationProviders: keepAvailable(
          analyzer.packageCurationProviders,
          curationIds
        ),
        packageCurationProviderConfig: keepAvailableEntries(
          analyzer.packageCurationProviderConfig,
          curationIds
        ),
      },
      advisor: {
        ...advisor,
        advisors: keepAvailable(advisor.advisors, advisorIds),
        config: keepAvailableEntries(advisor.config, advisorIds),
      },
      scanner: {
        ...scanner,
        scanners: keepAvailable(scanner.scanners, scannerIds),
        scannerScopes: keepAvailableEntries(scanner.scannerScopes, scannerIds),
        config: keepAvailableEntries(scanner.config, scannerIds),
      },
      evaluator: {
        ...evaluator,
        packageConfigurationProviders: keepAvailable(
          evaluator.packageConfigurationProviders,
          configurationIds
        ),
        packageConfigurationProviderConfig: keepAvailableEntries(
          evaluator.packageConfigurationProviderConfig,
          configurationIds
        ),
      },
      reporter: {
        ...reporter,
        formats: keepAvailable(reporter.formats, reporterIds),
        config: keepAvailableEntries(reporter.config, reporterIds),
        packageConfigurationProviders: keepAvailable(
          reporter.packageConfigurationProviders,
          configurationIds
        ),
        packageConfigurationProviderConfig: keepAvailableEntries(
          reporter.packageConfigurationProviderConfig,
          configurationIds
        ),
      },
    },
  };
}
