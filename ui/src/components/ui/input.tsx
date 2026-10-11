/*
 * The component is originally a part of the shadcn/ui library at https://github.com/shadcn-ui/ui.
 * The library is licensed as set out below:
 *
 * Copyright (c) 2023 shadcn
 *
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot='input'
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground border-input bg-background hover:border-muted-foreground/60 flex h-8 w-full min-w-0 rounded-sm border px-2.5 py-1 text-base transition-[border-color,box-shadow] duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/15 focus-visible:ring-[3px] focus-visible:outline-none',
        'aria-invalid:ring-destructive/15 aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  );
}

export { Input };
