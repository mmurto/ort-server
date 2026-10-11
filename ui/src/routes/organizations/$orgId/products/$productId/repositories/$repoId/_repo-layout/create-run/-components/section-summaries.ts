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

// One-line summaries of the current values of the create run form sections.

/** Format a count with the singular or plural form of a noun, e.g. "1 parameter". */
export const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`
) => `${count} ${count === 1 ? singular : plural}`;

/** Join the display names of the selected plugins, or return `empty` if none is selected. */
export const summarizePlugins = (
  selectedIds: readonly string[] | undefined,
  plugins: readonly PreconfiguredPluginDescriptor[],
  empty: string
) =>
  selectedIds && selectedIds.length > 0
    ? selectedIds
        .map(
          (id) => plugins.find((plugin) => plugin.id === id)?.displayName || id
        )
        .join(', ')
    : empty;

/** Join the non-empty parts of a summary. */
const joinParts = (parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(' · ');

export const summarizeSource = ({
  revision,
  path,
  jobConfigContext,
  ruleSet,
}: {
  revision?: string;
  path?: string;
  jobConfigContext?: string;
  ruleSet?: string;
}) =>
  joinParts([
    revision || 'Default branch',
    path && `Path ${path}`,
    jobConfigContext && `Context ${jobConfigContext}`,
    ruleSet && `Rule set ${ruleSet}`,
  ]);

export const summarizeKeyValues = (
  rows: readonly { key?: string }[] | undefined,
  noun: string,
  empty: string
) => {
  const keys = (rows ?? []).map((row) => row.key).filter(Boolean);
  if (!rows || rows.length === 0) return empty;
  return keys.length > 0 && keys.length <= 3
    ? keys.join(', ')
    : pluralize(rows.length, noun);
};

export const summarizeAnalyzer = ({
  packageManagers,
  packageCurationProviders,
  environmentVariables,
}: {
  packageManagers?: readonly string[];
  packageCurationProviders?: readonly string[];
  environmentVariables?: readonly unknown[];
}) =>
  joinParts([
    pluralize(packageManagers?.length ?? 0, 'package manager'),
    (packageCurationProviders?.length ?? 0) > 0 &&
      pluralize(packageCurationProviders!.length, 'curation provider'),
    (environmentVariables?.length ?? 0) > 0 &&
      pluralize(environmentVariables!.length, 'environment variable'),
  ]);

export const summarizeNotifier = (
  recipientAddresses: readonly { email?: string }[] | undefined
) => {
  const emails = (recipientAddresses ?? [])
    .map((recipient) => recipient.email)
    .filter(Boolean);
  if (emails.length === 0) return 'No recipients';
  return emails.length <= 2
    ? emails.join(', ')
    : pluralize(emails.length, 'recipient');
};
