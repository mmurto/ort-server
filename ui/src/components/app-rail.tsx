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

import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useEffect } from 'react';

import { getServerSettingByKeyOptions } from '@/api/@tanstack/react-query.gen';
import homeIcon from '@/assets/home-icon.svg';
import { OrgSwitcher } from '@/components/org-switcher';
import { useRail } from '@/components/rail-context';
import { useTheme } from '@/components/theme-provider-context';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';

export const PRODUCT_NAME = 'ORT Server';

export const railItemClass =
  'relative flex h-8 w-full items-center gap-2 px-5 text-[0.8125rem] text-rail-foreground transition-colors duration-100 hover:bg-rail-active hover:text-white focus-visible:outline-offset-[-2px]';

export const railActiveClass =
  'bg-rail-active font-medium text-white before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand';

const Brand = () => {
  const { mode } = useTheme();
  const { data: name } = useQuery({
    ...getServerSettingByKeyOptions({ path: { key: 'MAIN_PRODUCT_NAME' } }),
  });
  const { data: icon } = useQuery({
    ...getServerSettingByKeyOptions({ path: { key: 'HOME_ICON_URL' } }),
  });
  const { data: iconDark } = useQuery({
    ...getServerSettingByKeyOptions({ path: { key: 'HOME_ICON_URL_DARK' } }),
  });

  const productName = name?.isEnabled && name.value ? name.value : PRODUCT_NAME;

  // Custom icons fall back to each other and finally to the default icon. The rail is always
  // dark, so the dark icon is preferred in both modes when only the light one is missing.
  let src = homeIcon;
  if (icon?.isEnabled) {
    src =
      (mode === 'light'
        ? icon.value || iconDark?.value
        : iconDark?.value || icon.value) || homeIcon;
  }

  return (
    <Link
      to='/'
      className='flex h-14 shrink-0 items-center gap-2.5 px-5 text-[0.9375rem] font-semibold tracking-[-0.01em] text-white'
    >
      <img src={src} alt='' className='h-6 w-auto max-w-24 object-contain' />
      <span className='truncate'>{productName}</span>
    </Link>
  );
};

/**
 * The navigation of the pages outside an organization and the administration,
 * which have no sections of their own.
 */
const GlobalNav = () => {
  const { isSuperuser } = useUser();
  const items = [
    { to: '/', label: 'Home', exact: true },
    {
      to: '/organizations',
      label: 'Organizations',
      exact: true,
    },
    ...(isSuperuser
      ? [{ to: '/admin', label: 'Administration', exact: false }]
      : []),
    { to: '/profile', label: 'Profile', exact: false },
    { to: '/settings', label: 'Preferences', exact: true },
    { to: '/about', label: 'About', exact: true },
  ] as const;

  return (
    <nav aria-label='General' className='mt-3 flex flex-col'>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={railItemClass}
          activeProps={{ className: railActiveClass, 'aria-current': 'page' }}
          activeOptions={{ exact: item.exact }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
};

export const AppRail = ({
  slotRef,
}: {
  slotRef: (element: HTMLDivElement | null) => void;
}) => {
  const { open, setOpen } = useRail();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  // Organizations and the administration put their own sections in the rail.
  const hasSections = useRouterState({
    select: (state) =>
      state.matches.some(
        (match) =>
          match.routeId.startsWith('/organizations/$orgId') ||
          match.routeId.startsWith('/admin')
      ),
  });

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        className={cn(
          'bg-rail text-rail-foreground fixed inset-y-0 left-0 z-50 flex w-[232px] shrink-0 flex-col overflow-y-auto transition-transform duration-300 ease-(--ease-out-expo) md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label='Main navigation'
      >
        <div className='flex items-center justify-between'>
          <Brand />
          <button
            type='button'
            onClick={() => setOpen(false)}
            className='hover:bg-rail-active mr-3 grid size-8 place-items-center rounded-sm md:hidden'
          >
            <X className='size-4' />
            <span className='sr-only'>Close navigation</span>
          </button>
        </div>
        <OrgSwitcher />
        {!hasSections && <GlobalNav />}
        <div ref={slotRef} className='flex flex-col pb-6' />
      </aside>
    </>
  );
};
