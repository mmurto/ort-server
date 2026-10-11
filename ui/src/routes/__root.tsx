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

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import React, { Suspense, useState } from 'react';

import { getServerSettingByKeyOptions } from '@/api/@tanstack/react-query.gen';
import { RouterContext } from '@/app';
import { AppRail } from '@/components/app-rail';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { RailContext } from '@/components/rail-context';
import { setCustomFavicon } from '@/helpers/set-custom-favicon';

// Don't use Router devtools in production.
const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : React.lazy(() =>
      import('@tanstack/react-router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      }))
    );

const RootComponent = () => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <RailContext.Provider value={{ slot, open, setOpen }}>
      <ReactQueryDevtools initialIsOpen={false} />
      <div className='flex min-h-screen w-full'>
        <AppRail slotRef={setSlot} />
        <div className='flex min-w-0 flex-1 flex-col md:p-2 md:pl-2'>
          <div className='bg-background flex min-h-[calc(100vh-1rem)] flex-1 flex-col md:rounded-sm md:border'>
            <Header />
            <main className='mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-6 px-4 py-6 md:px-8'>
              <Outlet />
            </main>
            <Footer />
          </div>
        </div>
      </div>
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </RailContext.Provider>
  );
};

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async ({ context: { queryClient } }) => {
    const favicon = await queryClient
      .ensureQueryData(
        getServerSettingByKeyOptions({ path: { key: 'FAVICON_URL' } })
      )
      .catch(() => null);
    if (favicon?.isEnabled && favicon.value) {
      setCustomFavicon(favicon.value);
    }
  },
  component: RootComponent,
});
