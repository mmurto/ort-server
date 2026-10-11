/*
 * The component is originally a part of the shadcn/ui library at https://github.com/shadcn-ui/ui.
 * The library is licensed as set out below:
 *
 * Copyright (c) 2023 shadcn
 *
 * SPDX-License-Identifier: MIT
 */

import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex h-5 items-center justify-center rounded-xs border px-1.5 text-[0.6875rem] leading-4 font-semibold tracking-[0.02em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none aria-invalid:border-destructive transition-colors overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-err-soft text-err [a&]:hover:bg-err-soft/80',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        small:
          'border-transparent bg-primary h-4 px-1 font-semibold text-[0.625rem] leading-3 text-primary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
