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

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type StatisticsCardProps = {
  title: string;
  /** Kept for callers; figures are set without icons. */
  icon?: React.ComponentType<{ className?: string }>;
  value?: React.ReactNode;
  total?: number;
  counts?: {
    key: string;
    count: number;
    color: string;
  }[];
  description?: string;
  className?: string;
};

// Severities and ratings read most severe first; other keys (ecosystems) keep their order.
const RANK: Record<string, number> = {
  CRITICAL: 0,
  ERROR: 0,
  HIGH: 1,
  WARNING: 1,
  MEDIUM: 2,
  HINT: 2,
  LOW: 3,
  NONE: 4,
};

const PLURALS: Record<string, string> = {
  CRITICAL: 'critical',
  ERROR: 'errors',
  HIGH: 'high',
  WARNING: 'warnings',
  MEDIUM: 'medium',
  HINT: 'hints',
  LOW: 'low',
  NONE: 'unrated',
};

const SINGULARS: Record<string, string> = {
  ERROR: 'error',
  WARNING: 'warning',
  HINT: 'hint',
};

const describeCount = (key: string, count: number) =>
  key in PLURALS
    ? `${count} ${count === 1 ? (SINGULARS[key] ?? PLURALS[key]) : PLURALS[key]}`
    : `${key} ${count}`;

/**
 * One figure of a summary row: a caption, the number set large on the sheet, and a flat
 * segmented bar with its breakdown. Summary rows divide figures with hairlines; there is no
 * card around a figure.
 */
export const StatisticsCard = ({
  title,
  value,
  total,
  counts = [],
  description,
  className,
}: StatisticsCardProps) => {
  const sum = counts.reduce((acc, { count }) => acc + count, 0);
  const visibleCounts = counts
    .filter(({ count }) => count > 0)
    .sort((a, b) => (RANK[a.key] ?? 9) - (RANK[b.key] ?? 9));
  const isNumber = typeof value === 'number';

  return (
    <div
      className={cn(
        'flex h-full min-w-0 flex-col gap-1 px-5 py-4 transition-colors duration-100',
        className
      )}
    >
      <div className='label-caps flex items-center justify-between gap-2'>
        <span className='truncate'>{title}</span>
      </div>
      <div className='flex items-baseline gap-2'>
        {total !== undefined && isNumber ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='cursor-default text-3xl font-medium tracking-[-0.015em]'>
                {value}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {value === total
                ? 'All unresolved'
                : `${value} unresolved, ${total} in total`}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span
            className={cn(
              'text-3xl font-medium tracking-[-0.015em]',
              !isNumber && 'text-muted-foreground text-xl leading-10'
            )}
          >
            {value !== undefined ? value : 'Failed'}
          </span>
        )}
        {total !== undefined && isNumber && (
          <span className='text-muted-foreground text-[0.8125rem]'>
            unresolved
            {total !== value && <> of {total}</>}
          </span>
        )}
      </div>
      <div className='mt-1 flex h-1 w-full gap-px'>
        {sum > 0 ? (
          visibleCounts.map(({ key, count, color }) => (
            <span
              key={key}
              className={cn('block h-full', color)}
              style={{ flexGrow: count }}
            />
          ))
        ) : (
          <span className='bg-border block h-full w-full' />
        )}
      </div>
      <div className='text-muted-foreground mt-1 min-h-4 truncate text-xs'>
        {visibleCounts.length > 0
          ? visibleCounts
              .map(({ key, count }) => describeCount(key, count))
              .join(' · ')
          : description}
      </div>
    </div>
  );
};

/** A row of summary figures divided by hairlines. */
export const StatisticsRow = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      'grid grid-cols-2 border-y md:grid-cols-4 [&>*]:border-b [&>*]:md:border-b-0 [&>*:not(:first-child)]:md:border-l [&>*:nth-child(even)]:border-l',
      className
    )}
  >
    {children}
  </div>
);
