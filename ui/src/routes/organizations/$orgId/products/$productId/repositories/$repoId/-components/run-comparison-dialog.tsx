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
import { ArrowLeftRight, GitCompare } from 'lucide-react';
import { useId, useState } from 'react';

import type { OrtRunStatistics, OrtRunSummary } from '@/api';
import {
  getRepositoryRunOptions,
  getRepositoryRunsOptions,
  getRunStatisticsOptions,
} from '@/api/@tanstack/react-query.gen';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { diffResolvedJobConfigs } from '@/helpers/config-diff';
import {
  compareRunStatistics,
  countChangeClassName,
  describeCountChange,
} from './run-comparison-utils';
import { RunConfigurationDiffView } from './run-configuration-diff-dialog';

/** How many of the newest runs the pickers offer, besides the runs already loaded. */
export const comparisonRunLimit = 100;

type RunComparisonDialogProps = {
  repositoryId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The run compared against, shown as "before". Without either run, the newest two are compared. */
  baseRunIndex?: number;
  /** The run compared, shown as "after". */
  comparedRunIndex?: number;
  /** Runs already loaded, such as the rows of a page, which the pickers always offer. */
  knownRuns?: readonly OrtRunSummary[];
};

/** Merges two lists of runs into one sorted by descending index, without duplicates. */
const mergeRuns = (
  ...lists: (readonly OrtRunSummary[] | undefined)[]
): OrtRunSummary[] => {
  const byIndex = new Map<number, OrtRunSummary>();

  for (const run of lists.flatMap((list) => list ?? [])) {
    if (!byIndex.has(run.index)) byIndex.set(run.index, run);
  }

  return [...byIndex.values()].sort((a, b) => b.index - a.index);
};

const RunPicker = ({
  label,
  runs,
  value,
  onChange,
}: {
  label: string;
  runs: readonly OrtRunSummary[];
  value: number | undefined;
  onChange: (runIndex: number) => void;
}) => {
  const id = useId();

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
      <Label htmlFor={id} className='label-caps'>
        {label}
      </Label>
      <Select
        value={value?.toString() ?? ''}
        onValueChange={(next) => onChange(Number.parseInt(next))}
      >
        <SelectTrigger id={id} className='w-full'>
          <SelectValue placeholder='Pick a run' />
        </SelectTrigger>
        <SelectContent>
          {runs.map((run) => (
            <SelectItem key={run.index} value={run.index.toString()}>
              <span className='tabular-nums'>Run {run.index}</span>
              <span className='text-muted-foreground truncate font-mono text-xs'>
                {run.revision}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const formatCount = (count: number | null | undefined) =>
  count == null ? '—' : count.toLocaleString();

const StatisticsComparison = ({
  baseRunIndex,
  comparedRunIndex,
  before,
  after,
  isLoading,
  isError,
}: {
  baseRunIndex: number;
  comparedRunIndex: number;
  before: OrtRunStatistics | undefined;
  after: OrtRunStatistics | undefined;
  isLoading: boolean;
  isError: boolean;
}) => {
  if (isLoading) {
    return (
      <p className='text-muted-foreground text-[0.8125rem]'>
        Loading run statistics...
      </p>
    );
  }

  if (isError) {
    return (
      <p className='text-err text-[0.8125rem]'>
        Unable to load the statistics of one or both selected runs.
      </p>
    );
  }

  const rows = compareRunStatistics(before, after);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead className='text-right'>Run {baseRunIndex}</TableHead>
          <TableHead className='text-right'>Run {comparedRunIndex}</TableHead>
          <TableHead className='text-right'>Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>{row.label}</TableCell>
            <TableCell className='text-right tabular-nums'>
              {formatCount(row.before)}
            </TableCell>
            <TableCell className='text-right tabular-nums'>
              {formatCount(row.after)}
            </TableCell>
            <TableCell className='text-right tabular-nums'>
              {row.change ? (
                <>
                  <span
                    aria-hidden
                    className={countChangeClassName(row.change)}
                  >
                    {row.change.text}
                  </span>
                  <span className='sr-only'>
                    {describeCountChange(row.change, baseRunIndex)}
                  </span>
                </>
              ) : (
                <span className='text-muted-foreground'>—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const RunComparison = ({
  repositoryId,
  baseRun,
  comparedRun,
}: {
  repositoryId: number;
  baseRun: OrtRunSummary;
  comparedRun: OrtRunSummary;
}) => {
  const baseStatistics = useQuery({
    ...getRunStatisticsOptions({ path: { runId: baseRun.id } }),
  });
  const comparedStatistics = useQuery({
    ...getRunStatisticsOptions({ path: { runId: comparedRun.id } }),
  });

  const baseRunQuery = useQuery({
    ...getRepositoryRunOptions({
      path: { repositoryId, ortRunIndex: baseRun.index },
    }),
  });
  const comparedRunQuery = useQuery({
    ...getRepositoryRunOptions({
      path: { repositoryId, ortRunIndex: comparedRun.index },
    }),
  });

  const baseConfig = baseRunQuery.data?.resolvedJobConfigs;
  const comparedConfig = comparedRunQuery.data?.resolvedJobConfigs;
  const diff =
    baseConfig && comparedConfig
      ? diffResolvedJobConfigs(baseConfig, comparedConfig)
      : undefined;
  const isConfigurationMissing = Boolean(
    baseRunQuery.data &&
    comparedRunQuery.data &&
    (!baseConfig || !comparedConfig)
  );

  return (
    <div className='flex flex-col gap-6'>
      <section className='flex flex-col gap-2'>
        <h3 className='text-[0.9375rem] font-semibold'>Findings</h3>
        <StatisticsComparison
          baseRunIndex={baseRun.index}
          comparedRunIndex={comparedRun.index}
          before={baseStatistics.data}
          after={comparedStatistics.data}
          isLoading={baseStatistics.isPending || comparedStatistics.isPending}
          isError={baseStatistics.isError || comparedStatistics.isError}
        />
      </section>
      <section className='flex flex-col gap-2'>
        <h3 className='text-[0.9375rem] font-semibold'>Configuration</h3>
        <RunConfigurationDiffView
          diff={diff}
          isLoading={baseRunQuery.isPending || comparedRunQuery.isPending}
          isError={baseRunQuery.isError || comparedRunQuery.isError}
          isConfigurationMissing={isConfigurationMissing}
        />
      </section>
    </div>
  );
};

/** The pickers and the comparison; mounted on each opening, so it starts from the given runs. */
const RunComparisonBody = ({
  repositoryId,
  baseRunIndex: initialBaseRunIndex,
  comparedRunIndex: initialComparedRunIndex,
  knownRuns,
}: Omit<RunComparisonDialogProps, 'open' | 'onOpenChange'>) => {
  const [baseRunIndex, setBaseRunIndex] = useState(initialBaseRunIndex);
  const [comparedRunIndex, setComparedRunIndex] = useState(
    initialComparedRunIndex
  );

  const { data: newestRuns } = useQuery({
    ...getRepositoryRunsOptions({
      path: { repositoryId },
      query: { limit: comparisonRunLimit, sort: '-index' },
    }),
  });

  const runs = mergeRuns(knownRuns, newestRuns?.data);

  // Opened without a run in mind, compare the newest run with the one before it.
  const useNewestRuns =
    initialBaseRunIndex === undefined && initialComparedRunIndex === undefined;
  const effectiveBaseRunIndex =
    baseRunIndex ?? (useNewestRuns ? runs[1]?.index : undefined);
  const effectiveComparedRunIndex =
    comparedRunIndex ?? (useNewestRuns ? runs[0]?.index : undefined);

  const baseRun = runs.find((run) => run.index === effectiveBaseRunIndex);
  const comparedRun = runs.find(
    (run) => run.index === effectiveComparedRunIndex
  );

  const handleSwap = () => {
    setBaseRunIndex(effectiveComparedRunIndex);
    setComparedRunIndex(effectiveBaseRunIndex);
  };

  return (
    <>
      <div className='flex flex-wrap items-end gap-2'>
        <RunPicker
          label='Before'
          runs={runs}
          value={effectiveBaseRunIndex}
          onChange={setBaseRunIndex}
        />
        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label='Swap runs'
          title='Swap runs'
          onClick={handleSwap}
        >
          <ArrowLeftRight />
        </Button>
        <RunPicker
          label='After'
          runs={runs}
          value={effectiveComparedRunIndex}
          onChange={setComparedRunIndex}
        />
      </div>

      <div className='min-h-0 overflow-y-auto overscroll-contain pr-2'>
        {baseRun && comparedRun ? (
          baseRun.index === comparedRun.index ? (
            <p className='text-muted-foreground text-[0.8125rem]'>
              Pick two different runs to compare.
            </p>
          ) : (
            <RunComparison
              repositoryId={repositoryId}
              baseRun={baseRun}
              comparedRun={comparedRun}
            />
          )
        ) : (
          <p className='text-muted-foreground text-[0.8125rem]'>
            Pick the run before and the run after to compare their findings and
            configuration.
          </p>
        )}
      </div>
    </>
  );
};

/**
 * Compares two runs of a repository: their finding counts side by side with the change, and the
 * changes in their resolved job configurations.
 */
export function RunComparisonDialog({
  open,
  onOpenChange,
  ...bodyProps
}: RunComparisonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='grid max-h-[min(calc(100vh-4rem),48rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Compare runs</DialogTitle>
          <DialogDescription>
            How the findings and the resolved job configuration changed from one
            run to another.
          </DialogDescription>
        </DialogHeader>

        <RunComparisonBody {...bodyProps} />

        <DialogFooter>
          <DialogClose asChild>
            <Button type='button' variant='outline'>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Opens a comparison of the newest two runs of a repository, which can then be changed. */
export const CompareRunsButton = ({
  repositoryId,
}: {
  repositoryId: number;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type='button' variant='outline' onClick={() => setOpen(true)}>
        <GitCompare />
        Compare runs
      </Button>
      <RunComparisonDialog
        repositoryId={repositoryId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
};
