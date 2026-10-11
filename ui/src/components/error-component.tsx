/*
 * Copyright (C) 2025 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
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

import { ErrorComponentProps } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = ErrorComponentProps & {
  title?: string;
  className?: string;
  showStackTrace?: boolean;
};

export const ErrorComponent = ({
  error,
  title = 'Oops, something went wrong...',
  className,
  showStackTrace = false,
}: Props) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <div
      className={cn(
        'border-err/40 flex h-full flex-col gap-1.5 rounded-xs border p-5',
        className
      )}
    >
      <div className='flex items-center gap-2 text-[0.9375rem] font-semibold'>
        <TriangleAlert className='text-err size-4 shrink-0' />
        <div>{title}</div>
      </div>
      <p className='text-muted-foreground text-[0.8125rem] break-words'>{`Error: ${message}`}</p>
      {showStackTrace && (
        <div className='text-muted-foreground font-mono text-xs break-words'>
          {stack?.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
};
