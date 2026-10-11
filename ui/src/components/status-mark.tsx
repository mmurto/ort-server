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

import type { JobStatus, OrtRunStatus } from '@/api';
import { cn } from '@/lib/utils';

type Status = JobStatus | OrtRunStatus;

const MARK_CLASS: Record<Status, string> = {
  CREATED: 'bg-neutral-soft text-muted-foreground',
  SCHEDULED: 'bg-neutral-soft text-foreground',
  RUNNING: 'bg-brand text-brand-foreground',
  ACTIVE: 'bg-brand text-brand-foreground',
  FAILED: 'bg-err-soft text-err',
  FINISHED: 'bg-ok-soft text-ok',
  FINISHED_WITH_ISSUES: 'bg-warn-soft text-warn',
};

const MARK_LABEL: Record<Status, string> = {
  CREATED: 'Created',
  SCHEDULED: 'Scheduled',
  RUNNING: 'Running',
  ACTIVE: 'In flight',
  FAILED: 'Failed',
  FINISHED: 'Finished',
  FINISHED_WITH_ISSUES: 'Finished with issues',
};

/** A run or job status set as a flat printed mark. */
export const StatusMark = ({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex h-5 shrink-0 items-center rounded-xs px-1.5 text-[0.6875rem] leading-4 font-semibold tracking-[0.06em] whitespace-nowrap uppercase',
      MARK_CLASS[status],
      className
    )}
  >
    {MARK_LABEL[status]}
  </span>
);
