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

import type {
  RunConfigurationDiff,
  RunConfigurationDiffEntry,
  RunConfigurationDiffStatus,
} from '@/helpers/config-diff';
import { cn } from '@/lib/utils';
import {
  formatRunConfigurationDiffSummary,
  formatRunConfigurationDiffValue,
} from './run-configuration-diff-dialog-utils';

type RunConfigurationDiffViewProps = {
  diff?: RunConfigurationDiff;
  isLoading?: boolean;
  isError?: boolean;
  isConfigurationMissing?: boolean;
};

type RunConfigurationDiffSectionProps = {
  title: string;
  status: RunConfigurationDiffStatus;
  entries: RunConfigurationDiffEntry[];
};

const RunConfigurationDiffEntryRow = ({
  entry,
}: {
  entry: RunConfigurationDiffEntry;
}) => {
  if (entry.status === 'added') {
    return (
      <div className='leading-5 break-words whitespace-pre-wrap'>
        <span className='text-ok'>+ </span>
        <code className='font-semibold'>{entry.path}</code>
        <span className='text-muted-foreground'>: </span>
        <span className='text-muted-foreground'>
          {formatRunConfigurationDiffValue(entry.newValue)}
        </span>
      </div>
    );
  }

  if (entry.status === 'removed') {
    return (
      <div className='leading-5 break-words whitespace-pre-wrap'>
        <span className='text-err'>- </span>
        <code className='font-semibold'>{entry.path}</code>
        <span className='text-muted-foreground'>: </span>
        <span className='text-muted-foreground'>
          {formatRunConfigurationDiffValue(entry.oldValue)}
        </span>
      </div>
    );
  }

  return (
    <div className='space-y-0 leading-5 break-words whitespace-pre-wrap'>
      <div>
        <span className='text-warn'>~ </span>
        <code className='font-semibold'>{entry.path}</code>
      </div>
      <div className='pl-5'>
        <span className='text-err'>- </span>
        <span className='text-muted-foreground'>
          {formatRunConfigurationDiffValue(entry.oldValue)}
        </span>
      </div>
      <div className='pl-5'>
        <span className='text-ok'>+ </span>
        <span className='text-muted-foreground'>
          {formatRunConfigurationDiffValue(entry.newValue)}
        </span>
      </div>
    </div>
  );
};

const RunConfigurationDiffSection = ({
  title,
  status,
  entries,
}: RunConfigurationDiffSectionProps) => {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className='space-y-1'>
      <h3
        className={cn(
          'text-[0.8125rem] font-semibold',
          status === 'added' && 'text-ok',
          status === 'removed' && 'text-err',
          status === 'modified' && 'text-warn'
        )}
      >
        {title}
      </h3>
      <div
        className={cn(
          'space-y-2 border p-3 font-mono text-xs',
          status === 'added' && 'border-ok/25 bg-ok-soft',
          status === 'removed' && 'border-err/25 bg-err-soft',
          status === 'modified' && 'border-warn/25 bg-warn-soft'
        )}
      >
        {entries.map((entry) => (
          <RunConfigurationDiffEntryRow
            key={`${entry.status}:${entry.path}`}
            entry={entry}
          />
        ))}
      </div>
    </section>
  );
};

const RunConfigurationDiffContent = ({
  diff,
  isLoading,
  isError,
  isConfigurationMissing,
}: RunConfigurationDiffViewProps) => {
  if (isLoading) {
    return (
      <p className='text-muted-foreground text-[0.8125rem]'>
        Loading run configurations...
      </p>
    );
  }

  if (isError) {
    return (
      <p className='text-err text-[0.8125rem]'>
        Unable to load one or both selected runs.
      </p>
    );
  }

  if (isConfigurationMissing) {
    return (
      <p className='text-muted-foreground text-[0.8125rem]'>
        Resolved job configuration is not available for one of the selected
        runs.
      </p>
    );
  }

  if (!diff) {
    return (
      <p className='text-muted-foreground text-[0.8125rem]'>
        Select two runs to compare.
      </p>
    );
  }

  if (diff.counts.total === 0) {
    return (
      <p className='text-muted-foreground text-[0.8125rem]'>
        The resolved job configurations are identical.
      </p>
    );
  }

  return (
    <div className='space-y-5'>
      <RunConfigurationDiffSection
        title={`Added (${diff.counts.added})`}
        status='added'
        entries={diff.added}
      />
      <RunConfigurationDiffSection
        title={`Removed (${diff.counts.removed})`}
        status='removed'
        entries={diff.removed}
      />
      <RunConfigurationDiffSection
        title={`Modified (${diff.counts.modified})`}
        status='modified'
        entries={diff.modified}
      />
    </div>
  );
};

/**
 * The changes in the resolved job configurations between two runs, grouped into added, removed and
 * modified settings, with a one-line summary above.
 */
export function RunConfigurationDiffView({
  diff,
  isLoading,
  isError,
  isConfigurationMissing,
}: RunConfigurationDiffViewProps) {
  const showSummary = diff && !isLoading && !isError && !isConfigurationMissing;

  return (
    <div className='flex flex-col gap-3'>
      {showSummary && (
        <p className='text-muted-foreground text-[0.8125rem] tabular-nums'>
          {formatRunConfigurationDiffSummary(diff)}
        </p>
      )}
      <RunConfigurationDiffContent
        diff={diff}
        isLoading={isLoading}
        isError={isError}
        isConfigurationMissing={isConfigurationMissing}
      />
    </div>
  );
}
