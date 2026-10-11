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

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Menu, Search } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { getServerSettingByKeyOptions } from '@/api/@tanstack/react-query.gen';
import { PRODUCT_NAME } from '@/components/app-rail';
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
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { extractInitials } from '@/helpers/extract-initials.ts';
import { setCustomFavicon } from '@/helpers/set-custom-favicon';
import { useUser } from '@/hooks/use-user';
import { toastError } from '@/lib/toast';

const formSchema = z.object({
  id: z.string().min(1),
});

export const Header = () => {
  const user = useUser();
  const navigate = useNavigate();
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    navigate({ to: `/runs/$runId`, params: { runId: values.id } });
  }

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
    const organization = organizationMatch?.context.breadcrumbs.organization;
    const product = productMatch?.context.breadcrumbs.product;
    const repository = repoMatch?.context.breadcrumbs.repo;
    // Extract only the repository name from the full URL to show in the title.
    const repoName = repository?.split('/').pop()?.split('.git')[0];
    const run = runMatch?.context.breadcrumbs.run;
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
            {organizationMatch?.context &&
              organizationMatch.context.breadcrumbs.organization !==
                undefined && (
                <Siblings
                  entity='organization'
                  pathName={organizationMatch.pathname}
                />
              )}
            {productMatch?.context && (
              <>
                {organizationMatch?.context.breadcrumbs.organization !==
                  undefined && <BreadcrumbSeparator />}
                <Siblings entity='product' pathName={productMatch.pathname} />
              </>
            )}
            {repoMatch?.context && (
              <>
                {(organizationMatch?.context.breadcrumbs.organization !==
                  undefined ||
                  productMatch?.context.breadcrumbs.product !== undefined) && (
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
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='hidden sm:block'
          >
            <FormField
              control={form.control}
              name='id'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className='relative'>
                      <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2' />
                      <Input
                        {...field}
                        type='text'
                        name='runId'
                        inputMode='numeric'
                        aria-label='Go to run ID'
                        placeholder='Go to run ID'
                        className='h-8 w-36 pl-8 text-[0.8125rem]'
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <input type='submit' hidden />
          </form>
        </Form>
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
    </header>
  );
};
