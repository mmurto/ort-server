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

type ChartPanelProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** A titled figure inside a detail block: a small heading, a caption and the chart. No card. */
export const ChartPanel = ({
  title,
  description,
  actions,
  className,
  children,
}: ChartPanelProps) => (
  <div className={cn('flex min-w-0 flex-col gap-3', className)}>
    <div className='flex items-start justify-between gap-3'>
      <div className='flex min-w-0 flex-col gap-0.5'>
        <h3 className='text-[0.8125rem] font-semibold'>{title}</h3>
        {description && (
          <p className='text-muted-foreground text-xs text-pretty'>
            {description}
          </p>
        )}
      </div>
      {actions}
    </div>
    {children}
  </div>
);

/** The "(details)" link after a chart title. */
export const ChartDetailsLink = ({ href }: { href: string }) => (
  <a
    className='text-muted-foreground hover:text-foreground font-normal underline-offset-2 hover:underline'
    href={href}
    target='_blank'
    rel='noopener noreferrer'
  >
    details
  </a>
);
