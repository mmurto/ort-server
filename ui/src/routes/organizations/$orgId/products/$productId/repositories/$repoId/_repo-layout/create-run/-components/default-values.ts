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

import { OrtRun, PreconfiguredPluginDescriptor } from '@/api';
import { environmentDefinitionsSchema } from '@/lib/types';
import { convertMapToArray } from './form-primitives';
import {
  getPluginDefaultValues,
  mergePluginConfigs,
  packageManagerConfigsToFormValues,
  providerPluginConfigsToFormValues,
  reconstructScannerSelection,
  UNMANAGED_PACKAGE_MANAGER_ID,
} from './plugin-utils';
import type { CreateRunFormValues } from './run-schema';

/** The ID of the legacy Gradle package manager, which is not enabled by default. */
const LEGACY_GRADLE_ID = 'Gradle';

/** Which revision of a previous run a rerun starts from. */
export type RerunRevisionSource = 'revision' | 'resolvedRevision';

/**
 * Get the revisions a rerun of the given ORT run can start from: the requested revision (usually
 * a branch, so a rerun picks up new commits) and the commit the run actually analyzed.
 */
export function getRerunRevisions(ortRun: OrtRun): {
  revision: string;
  resolvedRevision: string | undefined;
} {
  return {
    revision: ortRun.revision,
    resolvedRevision: ortRun.resolvedRevision ?? undefined,
  };
}

/**
 * Get the default values for the create run form. The form can be provided with a previously run
 * ORT run, in which case the values from it are used as defaults. Otherwise uses base defaults.
 *
 * Values from the previous run are copied with `??`, so that `false`, empty strings and empty
 * lists set in that run are kept instead of being replaced by the defaults.
 *
 * By default, a rerun starts from the requested revision of the previous run. Pass
 * `revisionSource: 'resolvedRevision'` to pin the rerun to the commit that was analyzed.
 */
export function defaultValues(
  ortRun: OrtRun | null,
  advisorPlugins: PreconfiguredPluginDescriptor[],
  scannerPlugins: PreconfiguredPluginDescriptor[],
  reporterPlugins: PreconfiguredPluginDescriptor[],
  isSuperuser: boolean,
  packageCurationProviderPlugins: PreconfiguredPluginDescriptor[],
  packageConfigurationProviderPlugins: PreconfiguredPluginDescriptor[],
  packageManagerPlugins: PreconfiguredPluginDescriptor[],
  { revisionSource = 'revision' }: { revisionSource?: RerunRevisionSource } = {}
): CreateRunFormValues {
  const advisorPluginDefaultValues = getPluginDefaultValues(advisorPlugins);
  const scannerPluginDefaultValues = getPluginDefaultValues(scannerPlugins);
  const reporterPluginDefaultValues = getPluginDefaultValues(reporterPlugins);
  const packageCurationProviderPluginDefaultValues = getPluginDefaultValues(
    packageCurationProviderPlugins
  );
  const packageCurationProviderFormValues = providerPluginConfigsToFormValues(
    ortRun?.jobConfigs.analyzer?.packageCurationProviders
  );
  const packageConfigurationProviderPluginDefaultValues =
    getPluginDefaultValues(packageConfigurationProviderPlugins);
  const evaluatorPackageConfigurationProviderFormValues =
    providerPluginConfigsToFormValues(
      ortRun?.jobConfigs.evaluator?.packageConfigurationProviders
    );
  const reporterPackageConfigurationProviderFormValues =
    providerPluginConfigsToFormValues(
      ortRun?.jobConfigs.reporter?.packageConfigurationProviders
    );
  const scannerDefaults = {
    scanners: ['ScanCode'],
    scannerScopes: {
      ScanCode: 'both' as const,
    } as Record<string, 'both' | 'packages' | 'projects'>,
  };

  const packageManagerPluginDefaultValues = getPluginDefaultValues(
    packageManagerPlugins
  );
  // All available package managers are enabled by default, except the legacy Gradle
  // package manager which is mutually exclusive with the current Gradle package manager.
  const defaultPackageManagers = packageManagerPlugins
    .map((plugin) => plugin.id)
    .filter((pluginId) => pluginId !== LEGACY_GRADLE_ID);
  const packageManagerFormValues = packageManagerConfigsToFormValues(
    ortRun?.jobConfigs.analyzer?.packageManagerOptions
  );

  // Default values for the form: edit only these, not the defaultValues object.
  // Lists edited with a field array default to an empty list rather than `undefined`: the
  // field array writes an empty list when it mounts, which would otherwise count as a change.
  const baseDefaults: CreateRunFormValues = {
    revision: '',
    path: '',
    jobConfigs: {
      analyzer: {
        enabled: true,
        repositoryConfigPath: '',
        allowDynamicVersions: true,
        skipExcluded: true,
        keepAliveWorker: false,
        keepAlivePhases: [],
        packageCurationProviders: [],
        packageCurationProviderConfig:
          packageCurationProviderPluginDefaultValues,
        packageManagers: defaultPackageManagers,
        packageManagerConfig: packageManagerPluginDefaultValues,
        packageManagerMustRunAfter: {},
        environmentVariables: [],
      },
      advisor: {
        enabled: true,
        skipExcluded: true,
        advisors: ['OSV', 'VulnerableCode'],
        config: advisorPluginDefaultValues,
        keepAliveWorker: false,
      },
      scanner: {
        enabled: true,
        skipConcluded: true,
        skipExcluded: true,
        ...scannerDefaults,
        config: scannerPluginDefaultValues,
        keepAliveWorker: false,
      },
      evaluator: {
        enabled: true,
        ruleSet: '',
        licenseClassificationsFile: '',
        copyrightGarbageFile: '',
        resolutionsFile: '',
        keepAliveWorker: false,
        packageConfigurationProviders: [],
        packageConfigurationProviderConfig:
          packageConfigurationProviderPluginDefaultValues,
      },
      reporter: {
        enabled: true,
        formats: ['CycloneDX', 'SpdxDocument', 'WebApp'],
        config: reporterPluginDefaultValues,
        keepAliveWorker: false,
        packageConfigurationProviders: [],
        packageConfigurationProviderConfig:
          packageConfigurationProviderPluginDefaultValues,
      },
      notifier: {
        enabled: false,
        recipientAddresses: [],
        keepAliveWorker: false,
      },
      parameters: [],
      ruleSet: '',
    },
    labels: [],
    jobConfigContext: '',
    environmentConfigPath: '',
  };

  // Default values for the form are either taken from "baseDefaults" or,
  // when a rerun action has been taken, fetched from the ORT Run that is
  // being rerun. Whenever a rerun job config parameter is missing, use the
  // default value.
  const existingEnvironmentDefinitions =
    ortRun?.jobConfigs.analyzer?.environmentConfig?.environmentDefinitions;

  const parsedEnvironmentDefinitions = existingEnvironmentDefinitions
    ? environmentDefinitionsSchema.parse(existingEnvironmentDefinitions)
    : undefined;

  const hasEnvironmentDefinitions =
    parsedEnvironmentDefinitions !== undefined &&
    Object.values(parsedEnvironmentDefinitions).some(
      (entries) => entries.length > 0
    );

  return ortRun
    ? {
        revision:
          (revisionSource === 'resolvedRevision'
            ? getRerunRevisions(ortRun).resolvedRevision
            : undefined) ?? ortRun.revision,
        path: ortRun.path ?? baseDefaults.path,
        jobConfigs: {
          analyzer: {
            enabled: baseDefaults.jobConfigs.analyzer.enabled,
            repositoryConfigPath:
              ortRun.jobConfigs.analyzer?.repositoryConfigPath ??
              baseDefaults.jobConfigs.analyzer.repositoryConfigPath,
            allowDynamicVersions:
              ortRun.jobConfigs.analyzer?.allowDynamicVersions ??
              baseDefaults.jobConfigs.analyzer.allowDynamicVersions,
            skipExcluded:
              ortRun.jobConfigs.analyzer?.skipExcluded ??
              baseDefaults.jobConfigs.analyzer.skipExcluded,
            // The enabled package managers and their configuration are taken from the
            // previous run, falling back to the defaults if they are not set.
            packageManagers: ortRun.jobConfigs.analyzer?.enabledPackageManagers
              ? ortRun.jobConfigs.analyzer.enabledPackageManagers.filter(
                  (packageManagerId) =>
                    packageManagerId !== UNMANAGED_PACKAGE_MANAGER_ID &&
                    packageManagerPlugins.some(
                      (plugin) => plugin.id === packageManagerId
                    )
                )
              : baseDefaults.jobConfigs.analyzer.packageManagers,
            packageManagerConfig: mergePluginConfigs(
              packageManagerFormValues.config,
              packageManagerPluginDefaultValues,
              packageManagerPlugins
            ),
            packageManagerMustRunAfter: packageManagerFormValues.mustRunAfter,
            environmentDefinitions: hasEnvironmentDefinitions
              ? parsedEnvironmentDefinitions
              : undefined,
            environmentVariables:
              ortRun.jobConfigs.analyzer?.environmentConfig
                ?.environmentVariables ??
              baseDefaults.jobConfigs.analyzer.environmentVariables,
            packageCurationProviders:
              packageCurationProviderFormValues.selectedPluginIds,
            packageCurationProviderConfig: mergePluginConfigs(
              packageCurationProviderFormValues.config,
              packageCurationProviderPluginDefaultValues,
              packageCurationProviderPlugins
            ),
            keepAliveWorker:
              (ortRun.jobConfigs.analyzer?.keepAliveWorker && isSuperuser) ||
              baseDefaults.jobConfigs.analyzer.keepAliveWorker,
            keepAlivePhases:
              ortRun.jobConfigs.analyzer?.keepAliveWorker &&
              isSuperuser &&
              ortRun.jobConfigs.analyzer.keepAlivePhases?.length
                ? ortRun.jobConfigs.analyzer.keepAlivePhases
                : baseDefaults.jobConfigs.analyzer.keepAlivePhases,
          },
          advisor: {
            enabled:
              ortRun.jobConfigs.advisor !== undefined &&
              ortRun.jobConfigs.advisor !== null,
            skipExcluded:
              ortRun.jobConfigs.advisor?.skipExcluded ??
              baseDefaults.jobConfigs.advisor.skipExcluded,
            advisors:
              ortRun.jobConfigs.advisor?.advisors ??
              baseDefaults.jobConfigs.advisor.advisors,
            config: mergePluginConfigs(
              ortRun.jobConfigs.advisor?.config,
              advisorPluginDefaultValues,
              advisorPlugins
            ),
            keepAliveWorker:
              (ortRun.jobConfigs.advisor?.keepAliveWorker && isSuperuser) ||
              baseDefaults.jobConfigs.advisor.keepAliveWorker,
          },
          scanner: {
            enabled:
              ortRun.jobConfigs.scanner !== undefined &&
              ortRun.jobConfigs.scanner !== null,
            skipConcluded:
              ortRun.jobConfigs.scanner?.skipConcluded ??
              baseDefaults.jobConfigs.scanner.skipConcluded,
            skipExcluded:
              ortRun.jobConfigs.scanner?.skipExcluded ??
              baseDefaults.jobConfigs.scanner.skipExcluded,
            keepAliveWorker:
              (ortRun.jobConfigs.scanner?.keepAliveWorker && isSuperuser) ||
              baseDefaults.jobConfigs.scanner.keepAliveWorker,
            ...reconstructScannerSelection(
              ortRun.jobConfigs.scanner?.scanners ?? null,
              ortRun.jobConfigs.scanner?.projectScanners ?? null,
              scannerDefaults
            ),
            config: mergePluginConfigs(
              ortRun.jobConfigs.scanner?.config,
              scannerPluginDefaultValues,
              scannerPlugins
            ),
          },
          evaluator: {
            enabled:
              ortRun.jobConfigs.evaluator !== undefined &&
              ortRun.jobConfigs.evaluator !== null,
            packageConfigurationProviders:
              evaluatorPackageConfigurationProviderFormValues.selectedPluginIds,
            packageConfigurationProviderConfig: mergePluginConfigs(
              evaluatorPackageConfigurationProviderFormValues.config,
              packageConfigurationProviderPluginDefaultValues,
              packageConfigurationProviderPlugins
            ),
            keepAliveWorker:
              (ortRun.jobConfigs.evaluator?.keepAliveWorker && isSuperuser) ||
              baseDefaults.jobConfigs.evaluator.keepAliveWorker,
          },
          reporter: {
            enabled:
              ortRun.jobConfigs.reporter !== undefined &&
              ortRun.jobConfigs.reporter !== null,
            formats:
              ortRun.jobConfigs.reporter?.formats?.map((format) =>
                format === 'CycloneDx' ? 'CycloneDX' : format
              ) ?? baseDefaults.jobConfigs.reporter.formats,
            config: mergePluginConfigs(
              ortRun.jobConfigs.reporter?.config,
              reporterPluginDefaultValues,
              reporterPlugins
            ),
            packageConfigurationProviders:
              reporterPackageConfigurationProviderFormValues.selectedPluginIds,
            packageConfigurationProviderConfig: mergePluginConfigs(
              reporterPackageConfigurationProviderFormValues.config,
              packageConfigurationProviderPluginDefaultValues,
              packageConfigurationProviderPlugins
            ),
            keepAliveWorker:
              (ortRun.jobConfigs.reporter?.keepAliveWorker && isSuperuser) ||
              baseDefaults.jobConfigs.reporter.keepAliveWorker,
          },
          notifier: {
            enabled:
              ortRun.jobConfigs.notifier !== undefined &&
              ortRun.jobConfigs.notifier !== null,
            recipientAddresses:
              ortRun.jobConfigs.notifier?.recipientAddresses?.map((email) => ({
                email,
              })) ?? baseDefaults.jobConfigs.notifier.recipientAddresses,
            keepAliveWorker:
              (ortRun.jobConfigs.notifier?.keepAliveWorker && isSuperuser) ||
              baseDefaults.jobConfigs.notifier.keepAliveWorker,
          },
          parameters: convertMapToArray(ortRun.jobConfigs.parameters ?? {}),
          ruleSet: ortRun.jobConfigs.ruleSet ?? baseDefaults.jobConfigs.ruleSet,
        },
        labels: convertMapToArray(ortRun.labels),
        jobConfigContext:
          ortRun.jobConfigContext ?? baseDefaults.jobConfigContext,
        environmentConfigPath:
          ortRun.environmentConfigPath ?? baseDefaults.environmentConfigPath,
      }
    : baseDefaults;
}
