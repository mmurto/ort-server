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

import { useQueryClient } from '@tanstack/react-query';
import { RotateCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/error-message';
import { cn } from '@/lib/utils';

type LoadErrorProps = {
  error: unknown;
  /** What could not be loaded, e.g. "secrets". */
  what?: string;
  /** Defaults to refetching every query on the page that failed. */
  onRetry?: () => void;
  className?: string;
};

/** An inline load failure: a plain sentence, the error in a mono block and a retry action. */
export const LoadError = ({
  error,
  what = 'data',
  onRetry,
  className,
}: LoadErrorProps) => {
  const queryClient = useQueryClient();
  const retry =
    onRetry ??
    (() =>
      queryClient.refetchQueries({
        type: 'active',
        predicate: (query) => query.state.status === 'error',
      }));

  return (
    <div
      role='alert'
      className={cn('flex flex-col items-start gap-2 py-2', className)}
    >
      <p className='flex items-center gap-2 text-[0.8125rem] font-medium'>
        <TriangleAlert className='text-err size-4 shrink-0' />
        Could not load {what}.
      </p>
      <pre className='bg-muted text-muted-foreground max-w-full overflow-auto rounded-xs px-3 py-2 font-mono text-xs break-words whitespace-pre-wrap'>
        {getErrorMessage(error)}
      </pre>
      <Button type='button' variant='outline' size='sm' onClick={retry}>
        <RotateCw />
        Try again
      </Button>
    </div>
  );
};
