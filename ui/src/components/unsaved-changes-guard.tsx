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

import { Control, FieldValues } from 'react-hook-form';

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
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';

type UnsavedChangesGuardProps<
  TFieldValues extends FieldValues,
  TContext,
  TTransformedValues,
> = {
  /** The `control` of the form to guard, from `useForm`. */
  control: Control<TFieldValues, TContext, TTransformedValues>;
};

/**
 * Render inside a page with a form to ask "Discard unsaved changes?" before the user leaves the
 * page with changes in the form. See {@link useUnsavedChangesGuard} for when leaving is blocked.
 */
export const UnsavedChangesGuard = <
  TFieldValues extends FieldValues,
  TContext,
  TTransformedValues,
>({
  control,
}: UnsavedChangesGuardProps<TFieldValues, TContext, TTransformedValues>) => {
  const blocker = useUnsavedChangesGuard(control);

  return (
    <AlertDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => {
        if (!open) blocker.reset?.();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            The changes in this form have not been saved and are lost if you
            leave this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <Button variant='destructive' onClick={() => blocker.proceed?.()}>
            Discard
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
