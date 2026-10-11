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

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { JobStatus, OrtRunStatus, Severity, VulnerabilityRating } from '@/api';
import { PageHeader, SheetSection } from '@/components/page-header';
import { StatusMark } from '@/components/status-mark';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getEcosystemBackgroundColor,
  getRuleViolationSeverityBackgroundColor,
  getStatusBackgroundColor,
  getVulnerabilityRatingBackgroundColor,
  Status,
} from '@/helpers/get-status-class';
import { cn } from '@/lib/utils';

// API types like string literal unions ('HINT' | 'WARNING' | 'ERROR') exist only at compile time,
// and do not persist into runtime JavaScript. Therefore, the values of the union types need to be
// explicitly defined here.
const severities: Severity[] = ['HINT', 'WARNING', 'ERROR'];
const ratings: VulnerabilityRating[] = [
  'NONE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];
const statuses: (OrtRunStatus | JobStatus)[] = [
  'CREATED',
  'SCHEDULED',
  'ACTIVE',
  'RUNNING',
  'FINISHED_WITH_ISSUES',
  'FINISHED',
  'FAILED',
];

const tokenGroups: { title: string; tokens: string[] }[] = [
  {
    title: 'Surfaces',
    tokens: ['ground', 'background', 'muted', 'accent', 'border', 'input'],
  },
  { title: 'Ink', tokens: ['foreground', 'muted-foreground', 'primary'] },
  { title: 'Brand', tokens: ['brand', 'ring'] },
  { title: 'Rail', tokens: ['rail', 'rail-foreground', 'rail-active'] },
  {
    title: 'State',
    tokens: [
      'ok',
      'ok-soft',
      'warn',
      'warn-soft',
      'err',
      'err-soft',
      'neutral-soft',
    ],
  },
  {
    title: 'Severities',
    tokens: ['sev-critical', 'sev-high', 'sev-medium', 'sev-low'],
  },
  {
    title: 'ORT jobs',
    tokens: ['analyzer', 'advisor', 'scanner', 'evaluator', 'reporter'],
  },
  {
    title: 'Charts',
    tokens: ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  },
];

const allTokens = tokenGroups.flatMap((group) => group.tokens);

const ecosystems: { language: string; ecosystems: string[] }[] = [
  {
    language: 'C/C++',
    ecosystems: ['Bazel', 'Conan', 'SPDX', 'SpdxDocumentFile'],
  },
  { language: 'Dart/Flutter', ecosystems: ['Pub'] },
  { language: 'Gleam', ecosystems: ['Hex'] },
  { language: 'Go', ecosystems: ['GoMod'] },
  { language: 'Haskell', ecosystems: ['Stack'] },
  {
    language: 'Java/Kotlin',
    ecosystems: ['Gradle', 'GradleInspector', 'Maven', 'Tycho'],
  },
  {
    language: 'JavaScript/Node.js',
    ecosystems: ['Bower', 'NPM', 'PNPM', 'Yarn', 'Yarn2'],
  },
  { language: '.NET', ecosystems: ['NuGet'] },
  { language: 'ORT', ecosystems: ['OrtProjectFile'] },
  { language: 'Objective-C', ecosystems: ['Carthage', 'CocoaPods'] },
  { language: 'PHP', ecosystems: ['Composer'] },
  { language: 'Python', ecosystems: ['PIP', 'Pipenv', 'Poetry'] },
  { language: 'Ruby', ecosystems: ['Bundler'] },
  { language: 'Rust', ecosystems: ['Cargo'] },
  { language: 'Scala', ecosystems: ['SBT'] },
  { language: 'Swift', ecosystems: ['SwiftPM'] },
];

/**
 * Read the light values of the tokens from the `:root` rule of the global stylesheet, so the
 * light palette can be shown next to the dark one whichever mode is active.
 */
const readLightTokens = (): React.CSSProperties => {
  const values: Record<string, string> = {};
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (
        rule instanceof CSSStyleRule &&
        rule.selectorText === ':root' &&
        rule.style.getPropertyValue('--ground')
      ) {
        for (const token of allTokens) {
          const value = rule.style.getPropertyValue(`--${token}`).trim();
          if (value) values[`--${token}`] = value;
        }
      }
    }
  }
  return values as React.CSSProperties;
};

const Swatch = ({ token }: { token: string }) => (
  <div className='flex min-w-0 items-center gap-2'>
    <span
      className='size-6 shrink-0 rounded-xs border'
      style={{ backgroundColor: `var(--${token})` }}
    />
    <span className='truncate font-mono text-xs'>{token}</span>
  </div>
);

const Palette = ({
  mode,
  style,
}: {
  mode: 'light' | 'dark';
  style?: React.CSSProperties;
}) => (
  <div
    className={cn(
      'bg-background text-foreground flex min-w-0 flex-col gap-5 border p-5',
      mode === 'dark' && 'dark'
    )}
    style={style}
  >
    <div className='label-caps'>{mode === 'light' ? 'Light' : 'Dark'}</div>
    <div className='bg-ground flex flex-col gap-5 border p-4'>
      {tokenGroups.map((group) => (
        <div key={group.title} className='flex flex-col gap-2'>
          <div className='text-[0.8125rem] font-semibold'>{group.title}</div>
          <div className='grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-4 gap-y-2'>
            {group.tokens.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className='flex flex-col gap-2'>
      <div className='text-[0.8125rem] font-semibold'>Run and job statuses</div>
      <div className='flex flex-wrap gap-1.5'>
        {statuses.map((status) => (
          <StatusMark key={status} status={status} />
        ))}
      </div>
      <div className='flex flex-wrap gap-1.5'>
        <Badge className={getStatusBackgroundColor(undefined)}>undefined</Badge>
        {statuses.map((status) => (
          <Badge
            key={status}
            className={getStatusBackgroundColor(status as Status)}
          >
            {status}
          </Badge>
        ))}
      </div>
    </div>
    <div className='flex flex-col gap-2'>
      <div className='text-[0.8125rem] font-semibold'>
        Vulnerability ratings
      </div>
      <div className='flex flex-wrap gap-1.5'>
        {ratings.map((rating) => (
          <Badge
            key={rating}
            className={getVulnerabilityRatingBackgroundColor(rating)}
          >
            {rating}
          </Badge>
        ))}
      </div>
    </div>
    <div className='flex flex-col gap-2'>
      <div className='text-[0.8125rem] font-semibold'>
        Rule violation and issue severities
      </div>
      <div className='flex flex-wrap gap-1.5'>
        {severities.map((severity) => (
          <Badge
            key={severity}
            className={getRuleViolationSeverityBackgroundColor(severity)}
          >
            {severity}
          </Badge>
        ))}
      </div>
    </div>
  </div>
);

const ColorsComponent = () => {
  const [lightTokens] = useState(readLightTokens);

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Colors'
        description='The design tokens of the UI and the colors the helpers assign to statuses, ratings, severities and ecosystems, in light and dark mode'
      />
      <SheetSection title='Palette'>
        <div className='grid gap-4 xl:grid-cols-2'>
          <Palette mode='light' style={lightTokens} />
          <Palette mode='dark' />
        </div>
      </SheetSection>
      <SheetSection title='Ecosystem colors'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Language</TableHead>
              <TableHead>Ecosystems</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ecosystems.map(({ language, ecosystems }) => (
              <TableRow key={language}>
                <TableCell>{language}</TableCell>
                <TableCell>
                  <div className='flex flex-wrap gap-1.5'>
                    {ecosystems.map((ecosystem) => (
                      <Badge
                        key={ecosystem}
                        className={getEcosystemBackgroundColor(ecosystem)}
                      >
                        {ecosystem}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute('/admin/colors/')({
  component: ColorsComponent,
});
