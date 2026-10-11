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

import { describe, expect, it } from 'vitest';

import {
  describeFieldPath,
  hasErrorAt,
  sectionForPath,
  sortBySection,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/form-sections';
import {
  summarizeAnalyzer,
  summarizeKeyValues,
  summarizeNotifier,
  summarizePlugins,
  summarizeSource,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/section-summaries';
import { createPluginDescriptor } from '../fixtures/create-run';

const osv = createPluginDescriptor({
  id: 'OSV',
  type: 'ADVISOR',
  displayName: 'Open Source Vulnerabilities',
});

describe('create run form sections', () => {
  it.each([
    ['revision', 'source'],
    ['jobConfigs.ruleSet', 'source'],
    ['jobConfigs.parameters.0.key', 'parameters'],
    ['labels.1.value', 'labels'],
    ['jobConfigs.advisor.advisors', 'advisor'],
    ['jobConfigs.notifier.recipientAddresses.0.email', 'notifier'],
  ])('maps %s to the %s section', (path, section) => {
    expect(sectionForPath(path)).toBe(section);
  });

  it.each([
    ['jobConfigs.advisor.advisors', 'Advisor › Advisors'],
    ['jobConfigs.ruleSet', 'Source › Rule set'],
    ['environmentConfigPath', 'Source › Environment configuration path'],
    ['jobConfigs.parameters.1.key', 'Parameters › Row 2 › Key'],
    ['labels.0.value', 'Labels › Row 1 › Value'],
    [
      'jobConfigs.advisor.config.OSV.options.serverUrl',
      'Advisor › Open Source Vulnerabilities › serverUrl',
    ],
    [
      'jobConfigs.analyzer.packageCurationProviderConfig.Unknown.secrets.token',
      'Analyzer › Package curation providers › Unknown › token',
    ],
    [
      'jobConfigs.analyzer.environmentVariables.0.secretName',
      'Analyzer › Environment variables › Row 1 › Secret',
    ],
    [
      'jobConfigs.scanner.scannerScopes.ScanCode',
      'Scanner › Scanner scope › ScanCode',
    ],
    ['jobConfigs.reporter.someNewField', 'Reporter › Some new field'],
  ])('describes %s as "%s"', (path, description) => {
    expect(describeFieldPath(path, [osv])).toBe(description);
  });

  it('finds errors at and below a path', () => {
    const errors = {
      revision: { message: 'Required' },
      jobConfigs: { advisor: { advisors: { message: 'Invalid' } } },
    };

    expect(hasErrorAt(errors, 'jobConfigs.advisor')).toBe(true);
    expect(hasErrorAt(errors, 'jobConfigs.scanner')).toBe(false);
    // Without a path, the fields of the source section are checked.
    expect(hasErrorAt(errors, undefined)).toBe(true);
    expect(hasErrorAt({}, undefined)).toBe(false);
  });

  it('orders errors by the position of their sections', () => {
    expect(
      sortBySection([
        { path: 'jobConfigs.reporter.formats' },
        { path: 'labels.0.key' },
        { path: 'jobConfigs.advisor.advisors' },
        { path: 'path' },
        { path: 'jobConfigs.advisor.config.OSV.options.serverUrl' },
      ]).map(({ path }) => path)
    ).toEqual([
      'path',
      'labels.0.key',
      'jobConfigs.advisor.advisors',
      'jobConfigs.advisor.config.OSV.options.serverUrl',
      'jobConfigs.reporter.formats',
    ]);
  });
});

describe('create run section summaries', () => {
  it('names the selected plugins by their display names', () => {
    expect(summarizePlugins(['OSV', 'VulnerableCode'], [osv], 'None')).toBe(
      'Open Source Vulnerabilities, VulnerableCode'
    );
    expect(summarizePlugins([], [osv], 'None')).toBe('None');
  });

  it('summarizes the source', () => {
    expect(summarizeSource({})).toBe('Default branch');
    expect(
      summarizeSource({
        revision: 'main',
        path: 'src',
        jobConfigContext: 'ctx',
        ruleSet: 'strict',
      })
    ).toBe('main · Path src · Context ctx · Rule set strict');
  });

  it('summarizes key-value rows by their keys or their count', () => {
    expect(summarizeKeyValues([], 'label', 'No labels')).toBe('No labels');
    expect(
      summarizeKeyValues([{ key: 'team' }, { key: '' }], 'label', 'No labels')
    ).toBe('team');
    expect(
      summarizeKeyValues(
        [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }],
        'label',
        'No labels'
      )
    ).toBe('4 labels');
  });

  it('summarizes the analyzer and notifier', () => {
    expect(
      summarizeAnalyzer({
        packageManagers: Array.from({ length: 12 }, (_, i) => `PM${i}`),
        packageCurationProviders: ['Curator'],
      })
    ).toBe('12 package managers · 1 curation provider');
    expect(summarizeAnalyzer({ packageManagers: ['Maven'] })).toBe(
      '1 package manager'
    );
    expect(summarizeNotifier([])).toBe('No recipients');
    expect(summarizeNotifier([{ email: 'a@example.com' }])).toBe(
      'a@example.com'
    );
    expect(
      summarizeNotifier([{ email: 'a' }, { email: 'b' }, { email: 'c' }])
    ).toBe('3 recipients');
  });
});
