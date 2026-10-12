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

import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getServerSettingByKeyOptions } from '@/api/@tanstack/react-query.gen';
import { PRODUCT_NAME } from '@/components/app-rail';
import {
  CommandPalette,
  CommandPaletteButton,
} from '@/components/command-palette';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { ModeToggle } from '@/components/mode-toggle';
import { useRail } from '@/components/rail-context';
import { Siblings } from '@/components/siblings';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { extractInitials } from '@/helpers/extract-initials.ts';
import { setCustomFavicon } from '@/helpers/set-custom-favicon';
import { useUser } from '@/hooks/use-user';
import { getMatchBreadcrumbs } from '@/lib/route-context';
import { toastError } from '@/lib/toast';

/** Whether a key event comes from a control the user types into. */
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.closest('input, textarea, select, [contenteditable="true"]') !==
      null);

export const Header = () => {
  const user = useUser();
  const { setOpen } = useRail();

  const {
    data: dbProductName,
    isError: isProductNameError,
    error: productNameError,
  } = useQuery({
    ...getServerSettingByKeyOptions({ path: { key: 'MAIN_PRODUCT_NAME' } }),
  });

  const {
    data: dbFavicon,
    isPending: isFaviconPending,
    isError: isFaviconError,
    error: faviconError,
  } = useQuery({
    ...getServerSettingByKeyOptions({ path: { key: 'FAVICON_URL' } }),
  });

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Cmd/Ctrl+K opens the command palette from anywhere; / and ? work while the
  // user is not typing and no dialog is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const matches = useRouterState({ select: (state) => state.matches });

  // The breadcrumbs are set in the routes, for example the organization name is set in the route
  // file `organizations.$orgId.route.tsx`, which is activated when the route matches any
  // route that starts with `/organizations/$orgId`. The breadcrumbs are stored in the router
  // context, and it is not reset when the user leaves the organization route. If does change when
  // the user navigates to a different organization.
  //
  // This find checks if the organization route is currently active, so we can display the
  // organization name in the header breadcrumb only when the user is in the organization route.
  const organizationMatch = matches.find(
    (match) => match.routeId === '/organizations/$orgId'
  );

  // The same breadcrumb logic applies to the other breadcrumb levels.
  const productMatch = matches.find(
    (match) => match.routeId === '/organizations/$orgId/products/$productId'
  );

  const repoMatch = matches.find(
    (match) =>
      match.routeId ===
      '/organizations/$orgId/products/$productId/repositories/$repoId'
  );

  const runMatch = matches.find(
    (match) =>
      match.routeId ===
      '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex'
  );

  // Update the document title based on the deepest breadcrumb level currently active.
  useEffect(() => {
    const organization = getMatchBreadcrumbs(organizationMatch).organization;
    const product = getMatchBreadcrumbs(productMatch).product;
    const repository = getMatchBreadcrumbs(repoMatch).repo;
    // Extract only the repository name from the full URL to show in the title.
    const repoName = repository?.split('/').pop()?.split('.git')[0];
    const run = getMatchBreadcrumbs(runMatch).run;
    // Use the product name from the database if available and enabled, otherwise use z
    // the default product name which is 'ORT Server'.
    const name =
      dbProductName?.value && dbProductName.isEnabled
        ? dbProductName.value
        : PRODUCT_NAME;

    if (run) {
      document.title = `${repoName} (run ${run}) - ${name}`;
    } else if (repository) {
      document.title = `${repoName} - ${name}`;
    } else if (product) {
      document.title = `${product} - ${name}`;
    } else if (organization) {
      document.title = `${organization} - ${name}`;
    } else {
      document.title = `${name}`;
    }
  }, [
    dbProductName?.isEnabled,
    dbProductName?.value,
    organizationMatch,
    productMatch,
    repoMatch,
    runMatch,
  ]);

  // Set the favicon based on the configuration, if enabled. If the configuration is not enabled
  // or the URL is invalid, fall back to the default favicon.
  useEffect(() => {
    if (isFaviconPending || isFaviconError) return;
    if (dbFavicon.isEnabled) {
      setCustomFavicon(dbFavicon.value ?? '');
    } else {
      setCustomFavicon();
    }
  }, [
    dbFavicon?.isEnabled,
    dbFavicon?.value,
    isFaviconPending,
    isFaviconError,
  ]);

  useEffect(() => {
    if (isProductNameError || isFaviconError) {
      toastError('Unable to load data', productNameError || faviconError);
    }
  }, [isProductNameError, isFaviconError, productNameError, faviconError]);

  return (
    <header className='bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur md:rounded-t-sm md:px-8'>
      <div className='flex min-w-0 flex-row items-center gap-3'>
        <Button
          variant='ghost'
          size='icon'
          className='-ml-2 shrink-0 md:hidden'
          onClick={() => setOpen(true)}
        >
          <Menu className='size-4' />
          <span className='sr-only'>Open navigation</span>
        </Button>
        <Breadcrumb className='min-w-0 overflow-hidden'>
          <BreadcrumbList>
            {/* The organization is shown and switched in the rail, so the trail starts below it. */}
            {productMatch?.context && (
              <Siblings entity='product' pathName={productMatch.pathname} />
            )}
            {repoMatch?.context && (
              <>
                {getMatchBreadcrumbs(productMatch).product !== undefined && (
                  <BreadcrumbSeparator />
                )}
                <Siblings
                  entity='repository'
                  pathName={
                    '/organizations/$orgId/products/$productId/repositories/$repoId/runs'
                  }
                />
              </>
            )}
            {runMatch?.context && (
              <>
                <BreadcrumbSeparator />
                <Siblings entity='run' pathName={runMatch.pathname} />
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        <CommandPaletteButton onOpen={() => setPaletteOpen(true)} />
        <ModeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' className='ml-1'>
              <Avatar className='size-8'>
                <AvatarFallback className='bg-primary text-primary-foreground size-8 rounded-sm text-xs font-semibold'>
                  {extractInitials(user.fullName) ??
                    user.username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className='sr-only'>Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem className='flex gap-2' disabled>
              <Avatar className='size-8'>
                <AvatarFallback className='bg-primary text-primary-foreground size-8 rounded-sm text-xs font-semibold'>
                  {extractInitials(user.fullName) ??
                    user.username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className='font-semibold'>{user.fullName}</span>
                <br />
                <span>{user.username}</span>
              </div>
            </DropdownMenuItem>
            {user.isSuperuser && (
              <>
                <DropdownMenuSeparator />
                <Link to='/admin'>
                  <DropdownMenuItem>Administration</DropdownMenuItem>
                </Link>
              </>
            )}
            <DropdownMenuSeparator />
            <Link to='/profile'>
              <DropdownMenuItem>Profile</DropdownMenuItem>
            </Link>
            <Link to='/settings'>
              <DropdownMenuItem>Preferences</DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
              Keyboard shortcuts
            </DropdownMenuItem>
            <Link to='/about'>
              <DropdownMenuItem>About</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await user.signoutRedirect();
              }}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </header>
  );
};
