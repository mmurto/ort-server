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

import type { ReactNode } from 'react';

import { CopyToClipboard } from '@/components/copy-to-clipboard';
import { cn } from '@/lib/utils';

/** A severity or rating as a small square in its colour and an uppercase word. */
export const SeverityMark = ({
  label,
  colorClass,
  className,
}: {
  label: string;
  colorClass: string;
  className?: string;
}) => (
  <span
    className={cn(
      'flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-[0.04em] whitespace-nowrap uppercase',
      className
    )}
  >
    <span aria-hidden className={cn('size-2 shrink-0', colorClass)} />
    {label}
  </span>
);

/** The mark of a resolved finding; unresolved findings are left unmarked. */
export const ResolvedMark = () => (
  <span className='text-ok text-[0.6875rem] font-semibold tracking-[0.04em] whitespace-nowrap uppercase'>
    Resolved
  </span>
);

/** The main text of a finding, struck through once the finding is resolved. */
export const FindingText = ({
  resolved,
  className,
  children,
}: {
  resolved?: boolean;
  className?: string;
  children: ReactNode;
}) => (
  <span
    className={cn(
      'min-w-0',
      resolved && 'text-muted-foreground line-through',
      className
    )}
  >
    {children}
  </span>
);

/** The placeholder of an empty cell. */
export const EmptyValue = () => (
  <span className='text-muted-foreground'>—</span>
);

/**
 * An identifier with a button to copy it. The button shows up while the row is
 * hovered or focused. Without an identifier, only a dash is shown.
 */
export const CopyableValue = ({
  value,
  className,
  children,
}: {
  value: string | null | undefined;
  className?: string;
  children?: ReactNode;
}) => {
  if (!value) return <EmptyValue />;

  return (
    <span className={cn('flex min-w-0 items-center gap-0.5', className)}>
      <span className='min-w-0 truncate'>{children ?? value}</span>
      <CopyToClipboard
        copyText={value}
        className='h-5 shrink-0 px-1 md:opacity-0 md:group-focus-within/finding:opacity-100 md:group-hover/finding:opacity-100 [&_svg]:size-3'
      />
    </span>
  );
};
