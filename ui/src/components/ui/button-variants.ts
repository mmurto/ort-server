/*
 * The component is originally a part of the shadcn/ui library at https://github.com/shadcn-ui/ui.
 * The library is licensed as set out below:
 *
 * Copyright (c) 2023 shadcn
 *
 * SPDX-License-Identifier: MIT
 */

import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium select-none transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:select-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/85',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-foreground underline decoration-input underline-offset-[3px] hover:decoration-foreground active:scale-100',
      },
      size: {
        default: 'h-8 px-3.5 has-[>svg]:px-3',
        narrow: 'h-7 px-1.5 has-[>svg]:px-1',
        xs: 'h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5',
        sm: 'h-7 gap-1.5 px-2.5 text-[0.8125rem] has-[>svg]:px-2',
        lg: 'h-9 px-5 has-[>svg]:px-4',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
