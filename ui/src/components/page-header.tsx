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

import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: React.ReactNode;
  /** Sits right after the title, e.g. a favorite button or a status mark. */
  adornment?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/** The heading block of a work sheet: title, description and the page's actions. */
export const PageHeader = ({
  title,
  adornment,
  description,
  actions,
  className,
}: PageHeaderProps) => (
  <header
    className={cn(
      'flex flex-wrap items-start justify-between gap-x-8 gap-y-4',
      className
    )}
  >
    <div className='flex min-w-0 flex-col gap-1.5'>
      <div className='flex min-w-0 items-center gap-2'>
        <h1 className='truncate text-2xl font-semibold tracking-[-0.015em]'>
          {title}
        </h1>
        {adornment}
      </div>
      {description && (
        <p className='text-muted-foreground max-w-[75ch] text-[0.8125rem] text-pretty'>
          {description}
        </p>
      )}
    </div>
    {actions && <div className='flex items-center gap-2'>{actions}</div>}
  </header>
);

/** A titled section of a work sheet. */
export const SheetSection = ({
  title,
  meta,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <section className={cn('flex min-w-0 flex-col gap-3', className)}>
    <div className='flex min-h-8 flex-wrap items-center justify-between gap-3'>
      <h2 className='flex items-baseline gap-2 text-[0.9375rem] font-semibold'>
        {title}
        {meta && (
          <span className='text-muted-foreground text-[0.8125rem] font-normal'>
            {meta}
          </span>
        )}
      </h2>
      {actions && <div className='flex items-center gap-2'>{actions}</div>}
    </div>
    {children}
  </section>
);
