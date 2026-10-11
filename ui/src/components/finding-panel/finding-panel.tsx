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

import { ChevronDown, ChevronUp, Link as LinkIcon, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

/** The media query above which the details sit next to the grid. */
export const SIDE_PANEL_QUERY = '(min-width: 1024px)';

interface FindingPanelProps {
  /** The heading of the details, e.g. the vulnerability ID. */
  title: React.ReactNode;
  /** Marks shown under the heading, e.g. the severity and the status. */
  meta?: React.ReactNode;
  /** The position of the item in the current page, e.g. "3 of 10". */
  position?: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  /** Copies a link to the item. */
  onCopyLink?: () => void;
  children: React.ReactNode;
}

function PanelToolbar({
  position,
  onClose,
  onPrevious,
  onNext,
  onCopyLink,
}: Omit<FindingPanelProps, 'title' | 'meta' | 'children'>) {
  return (
    <div className='flex shrink-0 items-center gap-0.5'>
      {position && (
        <span className='text-muted-foreground mr-1 text-xs whitespace-nowrap tabular-nums'>
          {position}
        </span>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            aria-label='Previous item'
            disabled={!onPrevious}
            onClick={onPrevious}
          >
            <ChevronUp className='size-3.5' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Previous (K)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            aria-label='Next item'
            disabled={!onNext}
            onClick={onNext}
          >
            <ChevronDown className='size-3.5' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Next (J)</TooltipContent>
      </Tooltip>
      {onCopyLink && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              aria-label='Copy link to this item'
              onClick={onCopyLink}
            >
              <LinkIcon className='size-3.5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy link</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            aria-label='Close details'
            onClick={onClose}
          >
            <X className='size-3.5' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Close (Esc)</TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * The details of one item of a findings grid. On wide screens they sit next to
 * the grid, so the list stays in view; on narrow screens they cover the page.
 */
export function FindingPanel({
  title,
  meta,
  children,
  ...toolbar
}: FindingPanelProps) {
  const isWide = useMediaQuery(SIDE_PANEL_QUERY);

  const header = (
    <div className='bg-background sticky top-0 z-10 flex flex-col gap-1.5 border-b px-4 pt-3 pb-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 text-[0.9375rem] font-semibold break-words'>
          {title}
        </div>
        <PanelToolbar {...toolbar} />
      </div>
      {meta && (
        <div className='flex flex-wrap items-center gap-2 text-[0.8125rem]'>
          {meta}
        </div>
      )}
    </div>
  );

  if (!isWide) {
    return (
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open) toolbar.onClose();
        }}
      >
        <SheetContent
          data-slot='finding-panel'
          side='right'
          className='w-full gap-0 overflow-y-auto p-0 sm:max-w-full [&>button:last-child]:hidden'
        >
          <SheetTitle className='sr-only'>Details</SheetTitle>
          <SheetDescription className='sr-only'>
            Details of the selected item
          </SheetDescription>
          {header}
          <div className='flex flex-col gap-6 px-4 py-4'>{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-slot='finding-panel'
      aria-label='Details'
      className={cn(
        'bg-background sticky top-14 flex max-h-[calc(100dvh-4.5rem)] min-w-0 flex-col overflow-y-auto rounded-sm border',
        'animate-in fade-in-0 slide-in-from-right-2 duration-150'
      )}
    >
      {header}
      <div className='flex flex-col gap-6 px-4 py-4'>{children}</div>
    </aside>
  );
}

/** A titled part of the details. */
export function FindingPanelSection({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='label-caps'>{title}</h3>
        {actions}
      </div>
      <div className='min-w-0 text-[0.8125rem]'>{children}</div>
    </section>
  );
}
