/*
 * The component is originally a part of the shadcn/ui library at https://github.com/shadcn-ui/ui.
 * The library is licensed as set out below:
 *
 * Copyright (c) 2023 shadcn
 *
 * SPDX-License-Identifier: MIT
 */

import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';
import { buttonVariants } from './button-variants';

function Button({
  className,
  variant,
  size,
  asChild = false,
  disabled,
  onClick,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  if (asChild && disabled) {
    // A slotted child (usually a router link) has no native disabled state, so
    // mark it disabled for assistive technology, take it out of the tab order
    // and swallow activation instead of passing `disabled` to the anchor.
    return (
      <Slot
        data-slot='button'
        data-disabled=''
        aria-disabled='true'
        tabIndex={-1}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />
    );
  }

  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled}
      onClick={onClick}
      {...props}
    />
  );
}

export { Button };
