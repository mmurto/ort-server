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

import type { FieldErrors } from 'react-hook-form';

import type { PreconfiguredPluginDescriptor } from '@/api';
import { flattenErrors, type CreateRunFormValues } from './run-schema';

export const JOB_SECTION_IDS = [
  'analyzer',
  'advisor',
  'scanner',
  'evaluator',
  'reporter',
  'notifier',
] as const;

export type JobSectionId = (typeof JOB_SECTION_IDS)[number];

/** The ORT colours of the jobs. */
export const JOB_COLORS: Record<JobSectionId, string> = {
  analyzer: 'bg-analyzer',
  advisor: 'bg-advisor',
  scanner: 'bg-scanner',
  evaluator: 'bg-evaluator',
  reporter: 'bg-reporter',
  notifier: 'bg-notifier',
};

/** Check whether a section is a job section. */
export const isJobSection = (section: SectionId): section is JobSectionId =>
  (JOB_SECTION_IDS as readonly string[]).includes(section);

export const SECTION_IDS = [
  'source',
  'parameters',
  'labels',
  ...JOB_SECTION_IDS,
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** The short names of the sections, used in the section navigation and in error labels. */
export const SECTION_LABELS: Record<SectionId, string> = {
  source: 'Source',
  parameters: 'Parameters',
  labels: 'Labels',
  analyzer: 'Analyzer',
  advisor: 'Advisor',
  scanner: 'Scanner',
  evaluator: 'Evaluator',
  reporter: 'Reporter',
  notifier: 'Notifier',
};

/** The form paths of the source section; all other paths start with their section. */
const SOURCE_PATHS = [
  'revision',
  'path',
  'jobConfigContext',
  'environmentConfigPath',
  'jobConfigs.ruleSet',
];

/** The element id of a section. */
export const sectionDomId = (section: SectionId) => `create-run-${section}`;

/** The element id of the heading of a section, which receives focus when navigating to it. */
export const sectionHeadingId = (section: SectionId) =>
  `${sectionDomId(section)}-title`;

/** The form path prefix holding the values of a section. */
export const sectionPath = (section: SectionId): string | undefined => {
  if (section === 'source') return undefined;
  if (section === 'parameters') return 'jobConfigs.parameters';
  if (section === 'labels') return 'labels';
  return `jobConfigs.${section}`;
};

/** Get the section that shows the field with the given form path. */
export const sectionForPath = (path: string): SectionId => {
  if (SOURCE_PATHS.includes(path)) return 'source';
  const [first, second] = path.split('.');
  if (first === 'labels') return 'labels';
  if (first === 'jobConfigs') {
    if (second === 'parameters') return 'parameters';
    if ((JOB_SECTION_IDS as readonly string[]).includes(second ?? '')) {
      return second as JobSectionId;
    }
  }
  return 'source';
};

/** Check whether an error object has an error at or below the given path. */
export const hasErrorAt = (
  errors: unknown,
  path: string | undefined
): boolean => {
  if (path === undefined) {
    return SOURCE_PATHS.some((sourcePath) => hasErrorAt(errors, sourcePath));
  }
  let current: unknown = errors;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object') return false;
    current = (current as Record<string, unknown>)[segment];
  }
  return current !== undefined && current !== null;
};

// The helpers below take the whole form state rather than its errors: React Hook Form changes
// the errors object in place, so React Compiler would keep a result computed from it for as
// long as the object stays the same. The form state object changes with every update.

type ErrorsFormState = { errors: FieldErrors<CreateRunFormValues> };

/** Check whether the form state has an error at or below the given path. */
export const formStateHasErrorAt = (
  formState: ErrorsFormState,
  path: string | undefined
) => hasErrorAt(formState.errors, path);

/** List the errors of the form state, in the order of their sections. */
export const listFormErrors = (formState: ErrorsFormState) =>
  sortBySection(flattenErrors(formState.errors));

const FIELD_LABELS: Record<string, string> = {
  revision: 'Revision',
  path: 'Path',
  jobConfigContext: 'Configuration context',
  environmentConfigPath: 'Environment configuration path',
  ruleSet: 'Rule set',
  repositoryConfigPath: 'Repository configuration path',
  allowDynamicVersions: 'Allow dynamic versions',
  skipExcluded: 'Skip excluded',
  skipConcluded: 'Skip concluded',
  keepAliveWorker: 'Keep worker alive',
  keepAlivePhases: 'Phases',
  environmentVariables: 'Environment variables',
  environmentDefinitions: 'Environment configuration',
  packageManagers: 'Enabled package managers',
  packageManagerConfig: 'Package managers',
  packageManagerMustRunAfter: 'Must run after',
  packageCurationProviders: 'Package curation providers',
  packageCurationProviderConfig: 'Package curation providers',
  packageConfigurationProviders: 'Package configuration providers',
  packageConfigurationProviderConfig: 'Package configuration providers',
  advisors: 'Advisors',
  scanners: 'Scanners',
  scannerScopes: 'Scanner scope',
  formats: 'Report formats',
  recipientAddresses: 'Recipient addresses',
  email: 'E-mail address',
  key: 'Key',
  value: 'Value',
  name: 'Name',
  secretName: 'Secret',
};

/** Fields that hold settings keyed by plugin id. */
const PLUGIN_MAP_FIELDS = new Set([
  'config',
  'packageManagerConfig',
  'packageManagerMustRunAfter',
  'packageCurationProviderConfig',
  'packageConfigurationProviderConfig',
  'scannerScopes',
]);

/** Turn an unknown camel case path segment into words, e.g. `serverUrl` into "Server url". */
const humanize = (segment: string) => {
  const words = segment.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Describe a form path with the names shown in the form, e.g. `jobConfigs.advisor.advisors`
 * becomes "Advisor › Advisors" and `jobConfigs.advisor.config.OSV.options.serverUrl` becomes
 * "Advisor › OSV › serverUrl". Plugin ids are replaced with the display names of the plugins.
 */
export const describeFieldPath = (
  path: string,
  plugins: readonly PreconfiguredPluginDescriptor[] = []
): string => {
  const section = sectionForPath(path);
  const segments = path.split('.');
  // Drop the segments naming the section itself.
  const rest =
    section === 'source'
      ? segments.filter((segment) => segment !== 'jobConfigs')
      : section === 'labels'
        ? segments.slice(1)
        : segments.slice(2);

  const parts: string[] = [SECTION_LABELS[section]];
  for (let i = 0; i < rest.length; i++) {
    const segment = rest[i]!;

    if (/^\d+$/.test(segment)) {
      parts.push(`Row ${Number(segment) + 1}`);
      continue;
    }

    if (PLUGIN_MAP_FIELDS.has(segment)) {
      if (segment !== 'config') parts.push(FIELD_LABELS[segment]!);
      const pluginId = rest[i + 1];
      if (pluginId !== undefined) {
        const plugin = plugins.find((candidate) => candidate.id === pluginId);
        parts.push(plugin?.displayName || pluginId);
        // Skip the plugin id and the "options" or "secrets" level; option names stay as they
        // are, because the form shows them as they are.
        const next = rest[i + 2];
        i += next === 'options' || next === 'secrets' ? 2 : 1;
        if (rest[i + 1] !== undefined) {
          parts.push(rest.slice(i + 1).join('.'));
        }
        break;
      }
      continue;
    }

    parts.push(FIELD_LABELS[segment] ?? humanize(segment));
  }

  return parts.join(' › ');
};

/** Order errors by the position of their sections in the form. */
export const sortBySection = <T extends { path: string }>(
  errors: readonly T[]
): T[] =>
  errors
    .map((error, index) => ({ error, index }))
    .sort(
      (a, b) =>
        SECTION_IDS.indexOf(sectionForPath(a.error.path)) -
          SECTION_IDS.indexOf(sectionForPath(b.error.path)) || a.index - b.index
    )
    .map(({ error }) => error);

/** The description of the "Keep worker alive" switch of all jobs. */
export const KEEP_ALIVE_DESCRIPTION =
  'Keep the worker alive for debugging; this only has an effect if ORT Server is deployed on Kubernetes.';

/** The description of the fields with an ordered list of providers. */
export const PROVIDER_ORDER_DESCRIPTION =
  'Select the providers to use; providers higher in the list take precedence, and you can drag and drop them to change the order.';
