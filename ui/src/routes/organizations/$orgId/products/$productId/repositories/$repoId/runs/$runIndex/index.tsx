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

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Bug, ListTree, Scale, ShieldQuestion } from 'lucide-react';
import type { ReactNode } from 'react';

import type { JobStatus, OrtRun } from '@/api';
import {
  getRepositoryRunOptions,
  getRunRuleViolationsOptions,
  getRunStatisticsOptions,
  getRunVulnerabilitiesOptions,
} from '@/api/@tanstack/react-query.gen';
import { LoadingIndicator } from '@/components/loading-indicator';
import { QueryBoundary, QueryErrorFallback } from '@/components/query-boundary';
import { RunTimeline, type RunTimelineEvent } from '@/components/run-timeline';
import { StatisticsCard, StatisticsRow } from '@/components/statistics-card';
import { Skeleton } from '@/components/ui/skeleton';
import { config } from '@/config';
import {
  getRuleViolationSeverityBackgroundColor,
  getStatusFontColor,
  getVulnerabilityRatingBackgroundColor,
} from '@/helpers/get-status-class';
import { getPackageIdString } from '@/helpers/identifier-conversion';
import { isJobFinished, isRunFinished } from '@/helpers/job-helpers';
import { RUN_JOBS } from '@/helpers/run-jobs';
import { cn } from '@/lib/utils';
import { useUserSettingsStore } from '@/store/user-settings.store';
import { IssuesStatisticsCard } from './-components/issues-statistics-card';
import { PackagesStatisticsCard } from './-components/packages-statistics-card';
import { RuleViolationsStatisticsCard } from './-components/rule-violations-statistics-card';
import { VulnerabilitiesStatisticsCard } from './-components/vulnerabilities-statistics-card';

type RunStatisticsFallbackProps = {
  analyzerStatus: JobStatus | undefined;
  advisorStatus: JobStatus | undefined;
  evaluatorStatus: JobStatus | undefined;
  value: ReactNode;
};

export const RunStatisticsFallback = ({
  analyzerStatus,
  advisorStatus,
  evaluatorStatus,
  value,
}: RunStatisticsFallbackProps) => (
  <StatisticsRow>
    <StatisticsCard
      title='Rule Violations'
      icon={() => (
        <Scale className={`size-3.5 ${getStatusFontColor(evaluatorStatus)}`} />
      )}
      value={value}
    />
    <StatisticsCard
      title='Vulnerabilities'
      icon={() => (
        <ShieldQuestion
          className={`size-3.5 ${getStatusFontColor(advisorStatus)}`}
        />
      )}
      value={value}
    />
    <StatisticsCard
      title='Issues'
      icon={() => (
        <Bug className={`size-3.5 ${getStatusFontColor(analyzerStatus)}`} />
      )}
      value={value}
    />
    <StatisticsCard
      title='Packages'
      icon={() => (
        <ListTree
          className={`size-3.5 ${getStatusFontColor(analyzerStatus)}`}
        />
      )}
      value={value}
    />
  </StatisticsRow>
);

const plural = (count: number, word: string) =>
  `${count} ${count === 1 ? word : `${word}s`}`;

/** The run timeline with findings hung below the jobs that produced them. */
const RunTimelineWithFindings = ({ ortRun }: { ortRun: OrtRun }) => {
  const anyJobFinished = Object.values(ortRun.jobs).some((job) =>
    isJobFinished(job?.status)
  );
  const { data: statistics } = useQuery({
    ...getRunStatisticsOptions({ path: { runId: ortRun.id } }),
    enabled: anyJobFinished,
    // The findings grow while the run is still going.
    refetchInterval: isRunFinished(ortRun.status) ? false : config.pollInterval,
  });

  const events: RunTimelineEvent[] = [];
  if (statistics) {
    if (statistics.packagesCount != null)
      events.push({
        job: 'analyzer',
        content: plural(statistics.packagesCount, 'package'),
      });
    if (statistics.vulnerabilitiesCount != null)
      events.push({
        job: 'advisor',
        content: plural(
          statistics.vulnerabilitiesCount,
          'vulnerability'
        ).replace('vulnerabilitys', 'vulnerabilities'),
        alert: (statistics.vulnerabilitiesCountByRating?.CRITICAL ?? 0) > 0,
      });
    if (statistics.ruleViolationsCount != null)
      events.push({
        job: 'evaluator',
        content: plural(statistics.ruleViolationsCount, 'violation'),
        alert: (statistics.ruleViolationsCountBySeverity?.ERROR ?? 0) > 0,
      });
  }

  return (
    <RunTimeline
      createdAt={ortRun.createdAt}
      finishedAt={ortRun.finishedAt}
      status={ortRun.status}
      jobs={ortRun.jobs}
      events={events}
      included={RUN_JOBS.filter(({ key }) => ortRun.jobConfigs[key]).map(
        ({ key }) => key
      )}
    />
  );
};

const PREVIEW_ROWS = 6;

type PreviewProps = {
  ortRun: OrtRun;
  params: ReturnType<typeof Route.useParams>;
};

const PreviewHeader = ({
  title,
  count,
  link,
}: {
  title: string;
  count?: number;
  link: ReactNode;
}) => (
  <div className='flex h-8 items-center justify-between border-b'>
    <h2 className='flex items-baseline gap-2 text-[0.9375rem] font-semibold'>
      {title}
      {count !== undefined && (
        <span className='text-muted-foreground text-[0.8125rem] font-normal'>
          {count} unresolved
        </span>
      )}
    </h2>
    {link}
  </div>
);

const PreviewEmpty = ({ children }: { children: ReactNode }) => (
  <p className='text-muted-foreground py-6 text-[0.8125rem]'>{children}</p>
);

const SeverityMark = ({
  label,
  colorClass,
}: {
  label: string;
  colorClass: string;
}) => (
  <span className='flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase'>
    <span aria-hidden className={cn('size-2 shrink-0', colorClass)} />
    {label}
  </span>
);

const ViewAll = ({ children }: { children: ReactNode }) => (
  <span className='text-muted-foreground hover:text-foreground flex items-center gap-1 text-[0.8125rem] transition-colors'>
    {children}
    <ArrowRight className='size-3.5' />
  </span>
);

const RuleViolationsPreview = ({ ortRun, params }: PreviewProps) => {
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const status = ortRun.jobs.evaluator?.status;
  const { data } = useQuery({
    ...getRunRuleViolationsOptions({
      path: { runId: ortRun.id },
      query: { limit: PREVIEW_ROWS, sort: '-severity', resolved: false },
    }),
    enabled: isJobFinished(status) === true,
  });

  return (
    <section className='flex min-w-0 flex-col'>
      <PreviewHeader
        title='Rule violations'
        count={data?.pagination.totalCount}
        link={
          <Link
            to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations'
            params={params}
            search={{
              sortBy: [{ id: 'severity', desc: true }],
              itemResolved: ['Unresolved'],
            }}
          >
            <ViewAll>All rule violations</ViewAll>
          </Link>
        }
      />
      {ortRun.jobConfigs.evaluator === undefined ? (
        <PreviewEmpty>The evaluator was not part of this run.</PreviewEmpty>
      ) : !isJobFinished(status) ? (
        <PreviewEmpty>Waiting for the evaluator.</PreviewEmpty>
      ) : data && data.data.length === 0 ? (
        <PreviewEmpty>No unresolved rule violations.</PreviewEmpty>
      ) : (
        <ul className='divide-y'>
          {(data?.data ?? []).map((violation, index) => (
            <li
              key={index}
              className='grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 py-2 text-[0.8125rem]'
            >
              <SeverityMark
                label={violation.severity}
                colorClass={getRuleViolationSeverityBackgroundColor(
                  violation.severity
                )}
              />
              <div className='min-w-0'>
                <div className='truncate font-mono text-xs font-medium'>
                  {violation.rule}
                </div>
                {violation.id || violation.purl ? (
                  <div className='text-muted-foreground truncate font-mono text-xs'>
                    {getPackageIdString(
                      { packageId: violation.id, purl: violation.purl },
                      packageIdType
                    )}
                  </div>
                ) : (
                  <div className='text-muted-foreground truncate text-xs'>
                    {violation.license ?? violation.message}
                  </div>
                )}
              </div>
            </li>
          ))}
          {!data &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className='py-2.5'>
                <Skeleton className='h-8 w-full' />
              </li>
            ))}
        </ul>
      )}
    </section>
  );
};

const VulnerabilitiesPreview = ({ ortRun, params }: PreviewProps) => {
  const packageIdType = useUserSettingsStore((state) => state.packageIdType);
  const status = ortRun.jobs.advisor?.status;
  const { data } = useQuery({
    ...getRunVulnerabilitiesOptions({
      path: { runId: ortRun.id },
      query: { limit: PREVIEW_ROWS, sort: '-rating', resolved: false },
    }),
    enabled: isJobFinished(status) === true,
  });

  return (
    <section className='flex min-w-0 flex-col'>
      <PreviewHeader
        title='Vulnerabilities'
        count={data?.pagination.totalCount}
        link={
          <Link
            to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/vulnerabilities'
            params={params}
            search={{
              sortBy: [{ id: 'rating', desc: true }],
              itemResolved: ['Unresolved'],
            }}
          >
            <ViewAll>All vulnerabilities</ViewAll>
          </Link>
        }
      />
      {ortRun.jobConfigs.advisor === undefined ? (
        <PreviewEmpty>The advisor was not part of this run.</PreviewEmpty>
      ) : !isJobFinished(status) ? (
        <PreviewEmpty>Waiting for the advisor.</PreviewEmpty>
      ) : data && data.data.length === 0 ? (
        <PreviewEmpty>No unresolved vulnerabilities.</PreviewEmpty>
      ) : (
        <ul className='divide-y'>
          {(data?.data ?? []).map((item, index) => {
            const score = Math.max(
              ...item.vulnerability.references.map((r) => r.score ?? 0)
            );
            return (
              <li
                key={index}
                className='grid grid-cols-[5.5rem_minmax(0,1fr)_auto] gap-x-3 py-2 text-[0.8125rem]'
              >
                <SeverityMark
                  label={item.rating}
                  colorClass={getVulnerabilityRatingBackgroundColor(
                    item.rating
                  )}
                />
                <div className='min-w-0'>
                  <div className='truncate font-mono text-xs font-medium'>
                    {item.vulnerability.externalId}
                  </div>
                  <div className='text-muted-foreground truncate font-mono text-xs'>
                    {getPackageIdString(
                      { packageId: item.identifier, purl: item.purl },
                      packageIdType
                    )}
                  </div>
                </div>
                <div className='text-muted-foreground text-right text-xs'>
                  {score > 0 && (
                    <>
                      <span className='text-foreground font-medium'>
                        {score.toFixed(1)}
                      </span>{' '}
                      CVSS
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {!data &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className='py-2.5'>
                <Skeleton className='h-8 w-full' />
              </li>
            ))}
        </ul>
      )}
    </section>
  );
};

const RunComponent = () => {
  const params = Route.useParams();
  const pollInterval = config.pollInterval;

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
    refetchInterval: (run) => {
      if (
        run.state.data?.status === 'FINISHED' ||
        run.state.data?.status === 'FINISHED_WITH_ISSUES' ||
        run.state.data?.status === 'FAILED'
      )
        return false;
      return pollInterval;
    },
  });

  return (
    <div className='flex flex-col gap-8'>
      <RunTimelineWithFindings ortRun={ortRun} />
      <QueryBoundary
        fallback={
          <RunStatisticsFallback
            analyzerStatus={ortRun.jobs.analyzer?.status}
            advisorStatus={ortRun.jobs.advisor?.status}
            evaluatorStatus={ortRun.jobs.evaluator?.status}
            value={<Skeleton className='h-8 w-12' />}
          />
        }
        errorFallback={(props) => (
          <RunStatisticsFallback
            analyzerStatus={ortRun.jobs.analyzer?.status}
            advisorStatus={ortRun.jobs.advisor?.status}
            evaluatorStatus={ortRun.jobs.evaluator?.status}
            value={<QueryErrorFallback {...props} />}
          />
        )}
        resetKey={ortRun.id}
      >
        <StatisticsRow className='[&>a:hover]:bg-muted/60'>
          <Link
            to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations'
            params={params}
            search={{
              sortBy: [{ id: 'severity', desc: true }],
              itemResolved: ['Unresolved'],
            }}
          >
            <RuleViolationsStatisticsCard
              jobIncluded={ortRun.jobConfigs.evaluator !== undefined}
              runId={ortRun.id}
              status={ortRun.jobs.evaluator?.status}
            />
          </Link>
          <Link
            to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/vulnerabilities'
            params={params}
            search={{
              sortBy: [{ id: 'rating', desc: true }],
              itemResolved: ['Unresolved'],
            }}
          >
            <VulnerabilitiesStatisticsCard
              jobIncluded={ortRun.jobConfigs.advisor !== undefined}
              runId={ortRun.id}
              status={ortRun.jobs.advisor?.status}
            />
          </Link>
          <Link
            to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/issues'
            params={params}
            search={{
              sortBy: [{ id: 'severity', desc: true }],
              itemResolved: ['Unresolved'],
            }}
          >
            <IssuesStatisticsCard
              jobIncluded={ortRun.jobConfigs.analyzer !== undefined}
              runId={ortRun.id}
              status={ortRun.jobs.analyzer?.status}
            />
          </Link>
          <Link
            to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages'
            params={params}
          >
            <PackagesStatisticsCard
              jobIncluded={ortRun.jobConfigs.analyzer !== undefined}
              runId={ortRun.id}
              status={ortRun.jobs.analyzer?.status}
            />
          </Link>
        </StatisticsRow>
      </QueryBoundary>
      <div className='grid gap-8 lg:grid-cols-2'>
        <RuleViolationsPreview ortRun={ortRun} params={params} />
        <VulnerabilitiesPreview ortRun={ortRun} params={params} />
      </div>
    </div>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/'
)({
  component: RunComponent,
  pendingComponent: LoadingIndicator,
});
