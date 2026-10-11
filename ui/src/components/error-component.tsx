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

import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import {
  ErrorComponentProps,
  Link,
  useCanGoBack,
  useRouter,
} from '@tanstack/react-router';
import { ArrowLeft, House, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/error-message';

/** "Go back" and "Home": the ways out of a page that cannot be shown. */
const WayOut = ({ children }: { children?: ReactNode }) => {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {children}
      {canGoBack && (
        <Button
          type='button'
          variant='outline'
          onClick={() => router.history.back()}
        >
          <ArrowLeft />
          Go back
        </Button>
      )}
      <Button asChild variant='outline'>
        <Link to='/'>
          <House />
          Home
        </Link>
      </Button>
    </div>
  );
};

/** Shown where a route could not be loaded or rendered. */
export const ErrorComponent = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  return (
    <div role='alert' className='flex flex-col gap-6'>
      <PageHeader
        title='Something went wrong'
        description='This page could not be loaded. Try again, or go somewhere else.'
      />
      <pre className='bg-muted text-muted-foreground max-w-full overflow-auto rounded-xs px-3 py-2 font-mono text-xs break-words whitespace-pre-wrap'>
        {getErrorMessage(error)}
      </pre>
      <WayOut>
        <Button
          type='button'
          onClick={() => {
            queryErrorResetBoundary.reset();
            reset();
            void router.invalidate();
          }}
        >
          <RotateCw />
          Try again
        </Button>
      </WayOut>
    </div>
  );
};

/** Shown for an address that matches no page. */
export const NotFoundComponent = () => (
  <div className='flex flex-col gap-6'>
    <PageHeader
      title='Page not found'
      description='There is no page at this address. The link may be wrong, or the page may have moved.'
    />
    <WayOut />
  </div>
);

/** Shown when the user lacks the permission to see a page. */
export const ForbiddenComponent = () => (
  <div className='flex flex-col gap-6'>
    <PageHeader
      title='No access'
      description='You do not have permission to see this page. If you need access, ask an administrator to grant you a role.'
    />
    <WayOut />
  </div>
);
