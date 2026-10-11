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

import { Loader2 } from 'lucide-react';
import { ReactNode, useState } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The question to confirm, e.g. "Change jdoe's role from Reader to Admin?". */
  title: ReactNode;
  /** What happens when the change is confirmed. */
  description?: ReactNode;
  /** The label of the confirming action, naming the change, e.g. "Change role". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Style the confirming action as destructive, for changes that remove or revoke something. */
  destructive?: boolean;
  /**
   * The change to make. The dialog stays open while a returned promise is pending and closes when
   * it resolves. When it rejects, the dialog stays open; the caller reports the error.
   */
  onConfirm: () => void | Promise<void>;
};

/**
 * A controlled confirmation for a change that takes effect immediately, such as a role change.
 * Open it from the control that requests the change and make the change only in `onConfirm`.
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
}: ConfirmDialogProps) => {
  const [isPending, setIsPending] = useState(false);

  const confirm = () => {
    setIsPending(true);
    // A promise chain instead of try/finally, which React Compiler does not support.
    Promise.resolve()
      .then(onConfirm)
      .then(
        () => {
          setIsPending(false);
          onOpenChange(false);
        },
        () => setIsPending(false)
      );
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isPending) onOpenChange(newOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={confirm}
          >
            {isPending && <Loader2 className='animate-spin' />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
