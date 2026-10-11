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
import { Link } from '@tanstack/react-router';

import { getOrganizationsOptions } from '@/api/@tanstack/react-query.gen';
import { LoadError } from '@/components/load-error';
import { SheetSection } from '@/components/page-header';
import { Button } from '@/components/ui/button';

/** The way from the home page into all organizations the user can access. */
export const HomeOrganizationsSection = () => {
  return (
    <Button asChild variant='outline'>
      <Link to='/organizations'>Browse organizations</Link>
    </Button>
  );
};

const ORGANIZATION_LIMIT = 12;

/**
 * The organizations the user can access, so that the home page leads
 * somewhere even before anything is starred or started from this browser.
 */
export const HomeOrganizationsList = () => {
  const { data, isPending, isError, error } = useQuery({
    ...getOrganizationsOptions({
      query: { limit: ORGANIZATION_LIMIT, sort: 'name' },
    }),
  });

  const total = data?.pagination.totalCount ?? 0;

  return (
    <SheetSection
      title='Organizations'
      meta={data ? `${total} in total` : undefined}
      actions={
        total > ORGANIZATION_LIMIT ? (
          <Link to='/organizations' className='link text-[0.8125rem]'>
            All organizations
          </Link>
        ) : undefined
      }
    >
      {isPending ? (
        <p className='text-muted-foreground text-[0.8125rem]'>Loading…</p>
      ) : isError ? (
        <LoadError what='the organizations' error={error} />
      ) : data.data.length === 0 ? (
        <p className='text-muted-foreground text-[0.8125rem]'>
          You don't have access to any organization yet. Ask an administrator to
          give you a role in one.
        </p>
      ) : (
        <ul className='grid border-t sm:grid-cols-2 sm:gap-x-8 2xl:grid-cols-3'>
          {data.data.map((organization) => (
            <li key={organization.id} className='border-b'>
              <Link
                to='/organizations/$orgId'
                params={{ orgId: organization.id.toString() }}
                className='hover:bg-muted/60 flex min-w-0 flex-col gap-0.5 px-2 py-2.5 transition-colors'
              >
                <span className='truncate text-[0.875rem] font-medium'>
                  {organization.name}
                </span>
                {organization.description && (
                  <span className='text-muted-foreground truncate text-[0.8125rem]'>
                    {organization.description}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SheetSection>
  );
};
