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

import { Loader2, OctagonAlert } from 'lucide-react';
import { cloneElement, isValidElement, ReactNode, useState } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DeleteDialogProps {
  /**
   * The name of the thing to delete. This is used as part of the description.
   */
  thingName: ReactNode;

  /**
   * An optional display name of the specific item to delete, such as a username or a template
   * name. It is shown in the dialog so that the user always sees what is about to be deleted.
   * Without it, and without a {@link thingId}, the dialog only names the kind of thing.
   */
  thingLabel?: ReactNode;

  /**
   * An optional ID for the thing to delete. If set, this is used to confirm the
   * deletion by the user by entering the ID.
   */
  thingId?: string;

  /**
   * An optional description explaining the consequences of the deletion. Replaces the generic
   * default text.
   */
  description?: ReactNode;

  /**
   * An optional item from which to delete. This is to generalise the delete dialog,
   * as sometimes, for example a user is only deleted from an organization, not
   * completely.
   */
  itemName?: string;

  /**
   * The UI component to show as part of the delete dialog.
   */
  uiComponent: ReactNode;

  /**
   * The action to perform on deletion.
   */
  onDelete: () => void | Promise<void>;

  /**
   * The tooltip for the delete button.
   */
  tooltip?: string;

  /**
   * The title of the delete dialog.
   */
  title?: string;

  /**
   * Whether the delete action is disabled (e.g. due to insufficient permissions).
   * When true, the uiComponent is rendered as disabled and the dialog cannot be opened.
   */
  disabled?: boolean;

  /**
   * Why the delete action is disabled, shown in the tooltip. Defaults to insufficient permissions.
   */
  disabledReason?: string;
}

export const DeleteDialog = ({
  thingName,
  thingLabel,
  thingId,
  description,
  itemName,
  uiComponent,
  onDelete,
  tooltip,
  title,
  disabled,
  disabledReason,
}: DeleteDialogProps) => {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const isDeleteDisabled = thingId ? input !== thingId : false;

  const triggerElement =
    disabled && isValidElement(uiComponent)
      ? cloneElement(
          uiComponent as React.ReactElement<{ disabled?: boolean }>,
          {
            disabled: true,
          }
        )
      : uiComponent;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(newOpen) => {
        if (newOpen) setInput('');
        setOpen(newOpen);
      }}
    >
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {disabled ? (
            <span className='inline-flex cursor-not-allowed' tabIndex={0}>
              {triggerElement}
            </span>
          ) : (
            <AlertDialogTrigger asChild>{uiComponent}</AlertDialogTrigger>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {disabled
            ? (disabledReason ?? 'Insufficient permissions.')
            : tooltip || 'Delete'}
        </TooltipContent>
      </Tooltip>
      {/* Adding the preventDefault will prevent focusing on the trigger after closing the modal (which would cause the tooltip to show) */}
      <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <div className='flex items-center gap-2'>
            <OctagonAlert className='text-err size-5 shrink-0' />
            <AlertDialogTitle>{title || 'Confirm deletion'}</AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        <div className='flex flex-col gap-2 overflow-auto wrap-break-word'>
          {!thingId && (
            <AlertDialogDescription className='text-foreground'>
              {thingLabel ? (
                <>
                  Delete the {thingName}{' '}
                  <span className='font-semibold'>{thingLabel}</span>
                </>
              ) : (
                <>Delete this {thingName}</>
              )}
              {itemName ? ` from the ${itemName}` : ''}?
            </AlertDialogDescription>
          )}
          <AlertDialogDescription>
            {description ??
              'Note that deletion is irreversible and might have unwanted side effects.'}
          </AlertDialogDescription>
          {thingId && (
            <>
              <AlertDialogDescription>
                If you are sure to delete the {thingName}{' '}
                <span className='font-bold'>{thingId}</span>
                {itemName ? ` from the ${itemName}` : ''}, enter the bold text
                below for confirmation.
              </AlertDialogDescription>
              <Input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            disabled={isDeleteDisabled}
            onClick={async () => {
              setIsPending(true);
              try {
                await onDelete();
              } finally {
                setIsPending(false);
              }
              setOpen(false);
            }}
            variant='destructive'
          >
            {isPending ? (
              <>
                <span className='sr-only'>Deleting...</span>
                <Loader2 className='mx-3 size-4 animate-spin' />
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
