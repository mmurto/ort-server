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

import { useQuery } from '@tanstack/react-query';
import { Link, type LinkOptions } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import type { Package } from '@/api';
import {
  getRunIssuesOptions,
  getRunRuleViolationsOptions,
  getRunVulnerabilitiesOptions,
} from '@/api/@tanstack/react-query.gen';
import {
  FindingText,
  SeverityMark,
} from '@/components/data-table-cards/findings-cells';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getIssueSeverityBackgroundColor,
  getRuleViolationSeverityBackgroundColor,
  getVulnerabilityRatingBackgroundColor,
} from '@/helpers/get-status-class';
import {
  getPackageIdFilter,
  identifierToString,
} from '@/helpers/identifier-conversion';
import { getResolvedStatus } from '@/helpers/resolutions';
import { packageIdTypeSchema } from '@/schemas';
import { useUserSettingsStore } from '@/store/user-settings.store';

/** How many findings of each kind the details of a package list. */
export const PACKAGE_FINDINGS_PREVIEW = 3;

type RunParams = {
  orgId: string;
  productId: string;
  repoId: string;
  runIndex: string;
};

type FindingItem = {
  severity: string;
  colorClass: string;
  text: string;
  mono?: boolean;
  resolved: boolean;
};

const FindingsGroup = ({
  title,
  noun,
  count,
  isPending,
  isError,
  items,
  linkOptions,
}: {
  title: string;
  /** The plural noun of the findings, used in the accessible names. */
  noun: string;
  count: number | undefined;
  isPending: boolean;
  isError: boolean;
  items: FindingItem[];
  /** The link to the findings, or with `marked` to one of them. */
  linkOptions: (marked?: string) => LinkOptions;
}) => {
  let content: ReactNode = null;
  if (isPending) {
    content = <Skeleton className='h-4 w-full' />;
  } else if (isError) {
    content = (
      <p className='text-muted-foreground'>The {noun} could not be loaded.</p>
    );
  } else if (items.length > 0) {
    content = (
      <ul className='flex flex-col'>
        {items.map((item, index) => (
          <li key={index}>
            <Link
              {...linkOptions(String(index))}
              aria-label={`${item.severity} ${item.text}`}
              className='hover:bg-muted/60 -mx-1 grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-2 px-1 py-1 transition-colors'
            >
              <SeverityMark
                label={item.severity}
                colorClass={item.colorClass}
              />
              <FindingText
                resolved={item.resolved}
                className={
                  item.mono ? 'truncate font-mono text-xs' : 'truncate'
                }
              >
                {item.text}
              </FindingText>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className='flex flex-col gap-1 py-2'>
      <div className='flex items-baseline justify-between gap-2'>
        <span className='font-medium'>{title}</span>
        {count === undefined ? null : count === 0 ? (
          <span className='text-muted-foreground tabular-nums'>None</span>
        ) : (
          <Link
            {...linkOptions()}
            aria-label={`All ${count} ${noun} of this package`}
            className='link tabular-nums'
          >
            {count > (items.length || 0) ? `All ${count}` : count}
          </Link>
        )}
      </div>
      {content}
    </div>
  );
};

/**
 * The vulnerabilities, rule violations and issues of a package, each with
 * their count and the most severe ones, linked to their pages in the run.
 */
export const PackageFindings = ({
  pkg,
  runId,
  params,
}: {
  pkg: Package;
  runId: number;
  params: RunParams;
}) => {
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  // The pages of the findings filter by the identifier type of the user.
  const usesPurl =
    packageIdType === packageIdTypeSchema.enum.PURL && !!pkg.purl;
  const pkgId = usesPurl ? pkg.purl! : identifierToString(pkg.identifier);
  const filter = getPackageIdFilter(
    pkgId,
    usesPurl ? packageIdTypeSchema.enum.PURL : packageIdTypeSchema.enum.ORT_ID
  );
  const limit = PACKAGE_FINDINGS_PREVIEW;

  const vulnerabilities = useQuery({
    ...getRunVulnerabilitiesOptions({
      path: { runId },
      query: { limit, sort: '-rating', ...filter },
    }),
  });
  const ruleViolations = useQuery({
    ...getRunRuleViolationsOptions({
      path: { runId },
      query: { limit, sort: '-severity', ...filter },
    }),
  });
  const issues = useQuery({
    ...getRunIssuesOptions({
      path: { runId },
      query: { limit, sort: '-severity', ...filter },
    }),
  });

  // The pages sort like the queries above, so `marked` opens the same item.
  return (
    <div className='flex flex-col divide-y border-y'>
      <FindingsGroup
        title='Vulnerabilities'
        noun='vulnerabilities'
        count={vulnerabilities.data?.pagination.totalCount}
        isPending={vulnerabilities.isPending}
        isError={vulnerabilities.isError}
        items={(vulnerabilities.data?.data ?? []).map((item) => ({
          severity: item.rating,
          colorClass: getVulnerabilityRatingBackgroundColor(item.rating),
          text: item.vulnerability.externalId,
          mono: true,
          resolved: getResolvedStatus(item) === 'Resolved',
        }))}
        linkOptions={(marked) => ({
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/vulnerabilities',
          params,
          search: {
            pkgId,
            sortBy: [{ id: 'rating', desc: true }],
            marked,
          },
        })}
      />
      <FindingsGroup
        title='Rule violations'
        noun='rule violations'
        count={ruleViolations.data?.pagination.totalCount}
        isPending={ruleViolations.isPending}
        isError={ruleViolations.isError}
        items={(ruleViolations.data?.data ?? []).map((item) => ({
          severity: item.severity,
          colorClass: getRuleViolationSeverityBackgroundColor(item.severity),
          text: item.rule,
          mono: true,
          resolved: getResolvedStatus(item) === 'Resolved',
        }))}
        linkOptions={(marked) => ({
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations',
          params,
          search: {
            pkgId,
            sortBy: [{ id: 'severity', desc: true }],
            marked,
          },
        })}
      />
      <FindingsGroup
        title='Issues'
        noun='issues'
        count={issues.data?.pagination.totalCount}
        isPending={issues.isPending}
        isError={issues.isError}
        items={(issues.data?.data ?? []).map((item) => ({
          severity: item.severity,
          colorClass: getIssueSeverityBackgroundColor(item.severity),
          text: item.message.split('\n')[0] ?? '',
          resolved: getResolvedStatus(item) === 'Resolved',
        }))}
        linkOptions={(marked) => ({
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/issues',
          params,
          search: {
            pkgId,
            sortBy: [{ id: 'severity', desc: true }],
            marked,
          },
        })}
      />
    </div>
  );
};
