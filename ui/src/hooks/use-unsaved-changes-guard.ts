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

import { useBlocker } from '@tanstack/react-router';
import { Control, FieldValues, useFormState } from 'react-hook-form';

/**
 * Whether leaving a form loses changes: the form has changes and is not being submitted. A form
 * that navigates away after a successful submit does so while it is still submitting and is
 * therefore not blocked. A form that stays on the page after saving resets itself to the saved
 * values, so that it has no changes anymore.
 */
export const hasUnsavedChanges = ({
  isDirty,
  isSubmitting,
}: {
  isDirty: boolean;
  isSubmitting: boolean;
}) => isDirty && !isSubmitting;

/**
 * Block navigation to another page while the form has unsaved changes, and ask whether to discard
 * them. Closing or reloading the browser tab is blocked with the browser's own prompt. Changing
 * only the search parameters of the current page is not blocked.
 */
export const useUnsavedChangesGuard = <
  TFieldValues extends FieldValues,
  TContext,
  TTransformedValues,
>(
  control: Control<TFieldValues, TContext, TTransformedValues>
) => {
  const formState = useFormState({ control });

  return useBlocker({
    shouldBlockFn: ({ current, next }) => current.pathname !== next.pathname,
    disabled: !hasUnsavedChanges(formState),
    withResolver: true,
  });
};
