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

import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { OrtRun } from '@/api';
import { getRepositoryRunOptions } from '@/api/@tanstack/react-query.gen';
import { LoadingIndicator } from '@/components/loading-indicator';
import { SheetSection } from '@/components/page-header';
import { Sha1Component } from '@/components/sha1-component';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { jobSearchParameterSchema } from '@/schemas';
import { AdvisorJobDetails } from './-components/advisor-job-details';
import { AnalyzerJobDetails } from './-components/analyzer-job-details';
import { EvaluatorJobDetails } from './-components/evaluator-job-details';
import { JobTitle } from './-components/job-title';
import { NotifierJobDetails } from './-components/notifier-job-details';
import { ReporterJobDetails } from './-components/reporter-job-details';
import { ScannerJobDetails } from './-components/scanner-job-details';

const jobSections = [
  { value: 'analyzer', title: 'Analyzer', Component: AnalyzerJobDetails },
  { value: 'advisor', title: 'Advisor', Component: AdvisorJobDetails },
  { value: 'scanner', title: 'Scanner', Component: ScannerJobDetails },
  { value: 'evaluator', title: 'Evaluator', Component: EvaluatorJobDetails },
  { value: 'reporter', title: 'Reporter', Component: ReporterJobDetails },
  { value: 'notifier', title: 'Notifier', Component: NotifierJobDetails },
] as const;

type JobKey = (typeof jobSections)[number]['value'];

const getJob = (run: OrtRun, key: JobKey) => run.jobs[key];

const allJobValues = jobSections.map(({ value }) => value);

const KeyValueList = ({ entries }: { entries: Record<string, string> }) =>
  Object.keys(entries).length > 0 ? (
    <div className='flex flex-col gap-0.5'>
      {Object.entries(entries).map(([key, value]) => (
        <div
          key={key}
          className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)] gap-2 font-mono text-xs'
        >
          <span className='break-all'>{key}</span>
          <span className='text-muted-foreground'>=</span>
          <span className='break-all'>{value}</span>
        </div>
      ))}
    </div>
  ) : (
    <span className='text-muted-foreground'>undefined</span>
  );

const ConfigComponent = () => {
  const params = Route.useParams();
  const { job } = Route.useSearch();
  const [openSections, setOpenSections] = useState<string[]>(job ? [job] : []);

  const { data: ortRun } = useSuspenseQuery({
    ...getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    }),
  });

  const labels = ortRun.labels;
  const parameters = ortRun.jobConfigs.parameters ?? {};

  return (
    <div className='flex flex-col gap-8'>
      <SheetSection title='Run configuration'>
        <dl className='grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)] border-t text-[0.8125rem] [&>dd]:border-b [&>dd]:py-2 [&>dt]:border-b [&>dt]:py-2'>
          {ortRun.path && (
            <>
              <dt className='text-muted-foreground'>Path</dt>
              <dd className='font-mono text-xs break-all'>{ortRun.path}</dd>
            </>
          )}
          {(ortRun.jobConfigContext || ortRun.resolvedJobConfigContext) && (
            <>
              <dt className='text-muted-foreground'>Configuration context</dt>
              <dd className='flex flex-wrap items-center gap-1'>
                {ortRun.jobConfigContext && (
                  <span className='font-mono text-xs break-all'>
                    {ortRun.jobConfigContext}
                  </span>
                )}
                {ortRun.resolvedJobConfigContext &&
                  ortRun.jobConfigContext !==
                    ortRun.resolvedJobConfigContext && (
                    <Sha1Component sha1={ortRun.resolvedJobConfigContext} />
                  )}
              </dd>
            </>
          )}
          {ortRun.environmentConfigPath && (
            <>
              <dt className='text-muted-foreground'>
                Environment configuration path
              </dt>
              <dd className='font-mono text-xs break-all'>
                {ortRun.environmentConfigPath}
              </dd>
            </>
          )}
          <dt className='text-muted-foreground'>Labels</dt>
          <dd>
            <KeyValueList entries={labels} />
          </dd>
          <dt className='text-muted-foreground'>Parameters</dt>
          <dd>
            <KeyValueList entries={parameters} />
          </dd>
        </dl>
      </SheetSection>
      <SheetSection
        title='Job configurations'
        actions={
          <Button
            variant='ghost'
            size='xs'
            onClick={() =>
              setOpenSections((prev) =>
                prev.length === allJobValues.length ? [] : [...allJobValues]
              )
            }
          >
            {openSections.length === allJobValues.length ? (
              <>
                Collapse all
                <ChevronsDownUp className='size-4' />
              </>
            ) : (
              <>
                Expand all
                <ChevronsUpDown className='size-4' />
              </>
            )}
          </Button>
        }
      >
        <Accordion
          type='multiple'
          value={openSections}
          onValueChange={setOpenSections}
          className='border-t'
        >
          {jobSections.map(({ value, title, Component }) => (
            <AccordionItem key={value} value={value}>
              <AccordionTrigger>
                <JobTitle title={title} job={getJob(ortRun, value)} />
              </AccordionTrigger>
              <AccordionContent>
                <Component run={ortRun} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/config/'
)({
  validateSearch: jobSearchParameterSchema,
  component: ConfigComponent,
  pendingComponent: LoadingIndicator,
});
