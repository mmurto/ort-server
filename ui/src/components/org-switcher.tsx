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
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useState } from 'react';

import {
  getOrganizationOptions,
  getOrganizationsInfiniteOptions,
} from '@/api/@tanstack/react-query.gen';
import { SearchableInfiniteList } from '@/components/searchable-infinite-list';
import { CommandGroup, CommandItem } from '@/components/ui/command';
import { useIsSuperuser } from '@/hooks/use-authorization';
import { useDebounce } from '@/hooks/use-debounce';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { DROPDOWN_PAGE_SIZE } from '@/lib/constants';
import { toSearchFilter } from '@/lib/regex';
import { cn } from '@/lib/utils';

const Monogram = ({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) => (
  <span
    aria-hidden
    className={cn(
      'grid size-7 shrink-0 place-items-center rounded-xs text-xs font-semibold uppercase',
      className
    )}
  >
    {name ? name.trim().charAt(0) : <Building2 className='size-3.5' />}
  </span>
);

/**
 * Switches the organization the rail is scoped to. Sits at the top of the rail and lists every
 * organization the user can see, with the way to all organizations and to a new one.
 */
export const OrgSwitcher = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const orgId = params.orgId ? Number(params.orgId) : undefined;
  const { isSuperuser } = useIsSuperuser();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const filter = toSearchFilter(useDebounce(searchTerm, 300));

  const { data: organization } = useQuery({
    ...getOrganizationOptions({ path: { organizationId: orgId ?? 0 } }),
    enabled: orgId !== undefined,
  });

  const organizations = useInfiniteList(
    getOrganizationsInfiniteOptions({
      query: { limit: DROPDOWN_PAGE_SIZE, filter },
    }),
    { enabled: open }
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearchTerm('');
  };

  const name = orgId !== undefined ? organization?.name : undefined;

  return (
    <div className='px-3 pb-2'>
      <SearchableInfiniteList
        open={open}
        onOpenChange={handleOpenChange}
        align='start'
        className='w-[18rem]'
        trigger={
          <button
            type='button'
            className='border-rail-border hover:bg-rail-active data-[state=open]:bg-rail-active flex h-11 w-full items-center gap-2.5 rounded-sm border px-2 text-left transition-colors duration-100'
          >
            <Monogram
              name={name}
              className='bg-rail-active text-white ring-1 ring-white/10'
            />
            <span className='flex min-w-0 flex-1 flex-col'>
              <span className='text-rail-muted text-[0.625rem] leading-3 font-medium tracking-[0.06em] uppercase'>
                Organization
              </span>
              <span className='truncate text-[0.8125rem] leading-5 font-medium text-white'>
                {orgId === undefined ? 'All organizations' : (name ?? '…')}
              </span>
            </span>
            <ChevronsUpDown className='text-rail-muted size-3.5 shrink-0' />
          </button>
        }
        list={organizations}
        getItemKey={(org) => org.id}
        renderItem={(org) => (
          <CommandItem
            value={String(org.id)}
            onSelect={() => {
              handleOpenChange(false);
              navigate({
                to: '/organizations/$orgId',
                params: { orgId: String(org.id) },
              });
            }}
            className='gap-2.5'
          >
            <Monogram
              name={org.name}
              className='bg-muted text-foreground size-6'
            />
            <span className='min-w-0 flex-1 truncate'>{org.name}</span>
            {org.id === orgId && <Check className='size-3.5' />}
          </CommandItem>
        )}
        searchPlaceholder='Find an organization…'
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        emptyMessage='No organization matches.'
        errorMessage='Could not load organizations'
        footer={
          <CommandGroup className='border-t'>
            <CommandItem asChild value='all-organizations'>
              <Link to='/organizations' onClick={() => handleOpenChange(false)}>
                <Building2 className='size-3.5' />
                All organizations
              </Link>
            </CommandItem>
            {isSuperuser && (
              <CommandItem asChild value='new-organization'>
                <Link
                  to='/create-organization'
                  onClick={() => handleOpenChange(false)}
                >
                  <Plus className='size-3.5' />
                  New organization
                </Link>
              </CommandItem>
            )}
          </CommandGroup>
        }
      />
    </div>
  );
};
