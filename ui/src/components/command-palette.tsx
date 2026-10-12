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
import {
  useNavigate,
  useParams,
  type NavigateOptions,
} from '@tanstack/react-router';
import {
  Boxes,
  Building2,
  FolderGit2,
  Hash,
  Keyboard,
  Moon,
  Play,
  Search,
  Settings,
  Shield,
  Star,
  Sun,
  User,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  getOrganizationProductsOptions,
  getOrganizationsOptions,
  getProductRepositoriesOptions,
} from '@/api/@tanstack/react-query.gen';
import { useTheme } from '@/components/theme-provider-context';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { useUser } from '@/hooks/use-user';
import {
  useHomeFavorites,
  useHomeRecentRuns,
} from '@/providers/home-data/home-data-context';

/** Escapes a text for use in the regular expressions of the API filters. */
const toNameFilter = (text: string) =>
  `(?i).*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`;

const matches = (text: string, query: string) =>
  text.toLowerCase().includes(query.trim().toLowerCase());

type Entry = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  shortcut?: string;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
};

/**
 * Jumps to organizations, products, repositories, runs and favorites, and runs
 * the common actions of the current page, from one search field.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onShowShortcuts,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const user = useUser();
  const { setMode, mode } = useTheme();
  const params = useParams({ strict: false });
  const favorites = useHomeFavorites();
  const recentRuns = useHomeRecentRuns();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const debouncedQuery = useDebounce(query.trim(), 200);

  const orgId = params.orgId ? Number(params.orgId) : undefined;
  const productId = params.productId ? Number(params.productId) : undefined;
  const repoId = params.repoId;

  const organizations = useQuery({
    ...getOrganizationsOptions({
      query: {
        limit: 8,
        sort: 'name',
        ...(debouncedQuery ? { filter: toNameFilter(debouncedQuery) } : {}),
      },
    }),
    enabled: open,
  });

  const products = useQuery({
    ...getOrganizationProductsOptions({
      path: { organizationId: orgId ?? 0 },
      query: {
        limit: 8,
        sort: 'name',
        ...(debouncedQuery ? { filter: toNameFilter(debouncedQuery) } : {}),
      },
    }),
    enabled: open && orgId !== undefined,
  });

  const repositories = useQuery({
    ...getProductRepositoriesOptions({
      path: { productId: productId ?? 0 },
      query: { limit: 100 },
    }),
    enabled: open && productId !== undefined,
  });

  // Every search starts from an empty field.
  const setOpen = (isOpen: boolean) => {
    if (!isOpen) setQuery('');
    onOpenChange(isOpen);
  };

  const go = (options: NavigateOptions) => {
    setOpen(false);
    void navigate(options);
  };

  const runNumber = /^#?\d+$/.test(query.trim())
    ? Number(query.trim().replace('#', ''))
    : undefined;

  const runEntries: Entry[] = [];
  if (runNumber !== undefined) {
    if (orgId !== undefined && productId !== undefined && repoId) {
      runEntries.push({
        id: `run-index-${runNumber}`,
        label: `Run ${runNumber} of this repository`,
        icon: <Play />,
        run: () =>
          go({
            to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex',
            params: {
              orgId: String(orgId),
              productId: String(productId),
              repoId,
              runIndex: String(runNumber),
            },
          }),
      });
    }
    runEntries.push({
      id: `run-id-${runNumber}`,
      label: `Run with ID ${runNumber}`,
      hint: 'Any repository',
      icon: <Hash />,
      run: () =>
        go({ to: '/runs/$runId', params: { runId: String(runNumber) } }),
    });
  }

  const repositoryEntries: Entry[] = (repositories.data?.data ?? [])
    .filter(
      (repository) =>
        !query.trim() ||
        matches(repository.url, query) ||
        matches(repository.name ?? '', query)
    )
    .slice(0, 8)
    .map((repository) => ({
      id: `repository-${repository.id}`,
      label: repository.name || repository.url,
      hint: repository.name ? repository.url : undefined,
      icon: <FolderGit2 />,
      run: () =>
        go({
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs',
          params: {
            orgId: String(repository.organizationId),
            productId: String(repository.productId),
            repoId: String(repository.id),
          },
        }),
    }));

  const productEntries: Entry[] = (products.data?.data ?? []).map(
    (product) => ({
      id: `product-${product.id}`,
      label: product.name,
      icon: <Boxes />,
      run: () =>
        go({
          to: '/organizations/$orgId/products/$productId',
          params: {
            orgId: String(product.organizationId),
            productId: String(product.id),
          },
        }),
    })
  );

  const organizationEntries: Entry[] = (organizations.data?.data ?? []).map(
    (organization) => ({
      id: `organization-${organization.id}`,
      label: organization.name,
      icon: <Building2 />,
      run: () =>
        go({
          to: '/organizations/$orgId',
          params: { orgId: String(organization.id) },
        }),
    })
  );

  const favoriteEntries: Entry[] = favorites
    .filter(
      (favorite) =>
        !query.trim() ||
        matches([...favorite.breadcrumbs, favorite.name].join(' '), query)
    )
    .slice(0, 6)
    .map((favorite) => ({
      id: `favorite-${favorite.id}`,
      label: favorite.name,
      hint: favorite.breadcrumbs.join(' / '),
      icon: <Star />,
      run: () =>
        go({
          to: favorite.to,
          params: favorite.params,
        } as NavigateOptions),
    }));

  const recentRunEntries: Entry[] = recentRuns
    .filter(
      (recentRun) =>
        !recentRun.unavailable &&
        (!query.trim() ||
          matches(
            `${recentRun.repositoryName} run ${recentRun.runIndex}`,
            query
          ))
    )
    .slice(0, 5)
    .map((recentRun) => ({
      id: `recent-run-${recentRun.id}`,
      label: `${recentRun.repositoryName} · Run ${recentRun.runIndex}`,
      hint: `${recentRun.organizationName} / ${recentRun.productName}`,
      icon: <Play />,
      run: () =>
        go({
          to: recentRun.to,
          params: recentRun.params,
        } as NavigateOptions),
    }));

  const actionEntries: Entry[] = [
    ...(orgId !== undefined && productId !== undefined && repoId
      ? [
          {
            id: 'action-new-run',
            label: 'New run',
            hint: 'This repository',
            icon: <Play />,
            run: () =>
              go({
                to: '/organizations/$orgId/products/$productId/repositories/$repoId/create-run',
                params: {
                  orgId: String(orgId),
                  productId: String(productId),
                  repoId,
                },
              }),
          },
          {
            id: 'action-repository-settings',
            label: 'Repository settings',
            icon: <Settings />,
            run: () =>
              go({
                to: '/organizations/$orgId/products/$productId/repositories/$repoId/settings',
                params: {
                  orgId: String(orgId),
                  productId: String(productId),
                  repoId,
                },
              }),
          },
        ]
      : []),
    ...(orgId !== undefined && productId !== undefined
      ? [
          {
            id: 'action-product-settings',
            label: 'Product settings',
            icon: <Settings />,
            run: () =>
              go({
                to: '/organizations/$orgId/products/$productId/settings',
                params: { orgId: String(orgId), productId: String(productId) },
              }),
          },
        ]
      : []),
    ...(orgId !== undefined
      ? [
          {
            id: 'action-organization-settings',
            label: 'Organization settings',
            icon: <Settings />,
            run: () =>
              go({
                to: '/organizations/$orgId/settings',
                params: { orgId: String(orgId) },
              }),
          },
        ]
      : []),
    {
      id: 'action-organizations',
      label: 'All organizations',
      icon: <Building2 />,
      run: () => go({ to: '/organizations' }),
    },
    ...(user.isSuperuser
      ? [
          {
            id: 'action-admin',
            label: 'Administration',
            icon: <Shield />,
            run: () => go({ to: '/admin' }),
          },
        ]
      : []),
    {
      id: 'action-profile',
      label: 'Profile and token',
      icon: <User />,
      run: () => go({ to: '/profile' }),
    },
    {
      id: 'action-preferences',
      label: 'Preferences',
      icon: <Settings />,
      run: () => go({ to: '/settings' }),
    },
    {
      id: 'action-theme',
      label: mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      icon: mode === 'dark' ? <Sun /> : <Moon />,
      run: () => {
        setMode(mode === 'dark' ? 'light' : 'dark');
        setOpen(false);
      },
    },
    {
      id: 'action-shortcuts',
      label: 'Keyboard shortcuts',
      icon: <Keyboard />,
      shortcut: '?',
      run: () => {
        setOpen(false);
        onShowShortcuts();
      },
    },
  ].filter((entry) => !query.trim() || matches(entry.label, query));

  const groups: [string, Entry[]][] = [
    ['Runs', runEntries],
    ['Repositories in this product', repositoryEntries],
    ['Products in this organization', productEntries],
    ['Organizations', organizationEntries],
    ['Favorites', favoriteEntries],
    ['Recently started runs', recentRunEntries],
    ['Actions', actionEntries],
  ];

  // The highlighted entry. Results that arrive while typing replace the
  // entries, so the first one is highlighted whenever the highlighted one is
  // gone, and Enter always has something to open.
  const entryIds = groups.flatMap(([, entries]) =>
    entries.map((entry) => entry.id)
  );
  const highlighted = entryIds.includes(selectedId)
    ? selectedId
    : (entryIds[0] ?? '');

  const isLoading =
    organizations.isFetching || products.isFetching || repositories.isFetching;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='top-[15%] translate-y-0 overflow-hidden p-0 sm:max-w-xl'>
        <DialogTitle className='sr-only'>Go to</DialogTitle>
        <DialogDescription className='sr-only'>
          Search organizations, products, repositories and runs, or run an
          action.
        </DialogDescription>
        <Command
          shouldFilter={false}
          loop
          value={highlighted}
          onValueChange={setSelectedId}
          className='[&_[cmdk-group-heading]]:label-caps [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1'
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder='Go to an organization, product, repository or run…'
          />
          <CommandList className='max-h-[min(60vh,28rem)]'>
            <CommandEmpty>
              {isLoading ? 'Searching…' : 'Nothing found.'}
            </CommandEmpty>
            {groups.map(
              ([heading, entries]) =>
                entries.length > 0 && (
                  <CommandGroup key={heading} heading={heading}>
                    {entries.map((entry) => (
                      <CommandItem
                        key={entry.id}
                        value={entry.id}
                        onSelect={entry.run}
                        className='gap-2.5'
                      >
                        <span className='text-muted-foreground [&_svg]:size-4'>
                          {entry.icon}
                        </span>
                        <span className='truncate'>{entry.label}</span>
                        {entry.hint && (
                          <span className='text-muted-foreground min-w-0 truncate text-xs'>
                            {entry.hint}
                          </span>
                        )}
                        {entry.shortcut && (
                          <CommandShortcut>{entry.shortcut}</CommandShortcut>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** The button in the header that opens the command palette. */
export function CommandPaletteButton({ onOpen }: { onOpen: () => void }) {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <button
      type='button'
      onClick={onOpen}
      aria-label='Go to… (search)'
      aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
      className='border-input text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 items-center gap-2 rounded-sm border px-2.5 text-[0.8125rem] transition-colors sm:w-56'
    >
      <Search className='size-3.5 shrink-0' />
      <span className='hidden sm:inline'>Go to…</span>
      <kbd className='bg-muted ml-auto hidden rounded-xs px-1.5 font-mono text-[0.6875rem] sm:inline'>
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}
