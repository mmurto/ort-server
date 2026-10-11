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

import { useRouterState } from '@tanstack/react-router';
import { createPortal } from 'react-dom';

import { useRail } from '@/components/rail-context';
import { Sidebar, SidebarNavProps } from '@/components/sidebar';

interface PageLayoutProps {
  sections: SidebarNavProps['sections'] | undefined;
  topBar?: React.ReactNode;
  children: React.ReactNode;
}

const SCOPES = [
  {
    routeId:
      '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex',
    caption: 'Run',
  },
  {
    routeId: '/organizations/$orgId/products/$productId/repositories/$repoId',
    caption: 'Repository',
  },
  { routeId: '/organizations/$orgId/products/$productId', caption: 'Product' },
  { routeId: '/admin', caption: 'Administration' },
] as const;

/** Names the scope the rail's sections belong to, below the organization switcher. */
const RailScope = () => {
  const matches = useRouterState({ select: (state) => state.matches });

  for (const scope of SCOPES) {
    const match = matches.find((m) => m.routeId === scope.routeId);
    if (!match) continue;
    const { breadcrumbs } = match.context;
    const repoName = breadcrumbs.repo
      ?.split('/')
      .pop()
      ?.replace(/\.git$/, '');
    const name =
      scope.caption === 'Run'
        ? `${repoName ?? 'Repository'} · Run ${breadcrumbs.run ?? ''}`
        : scope.caption === 'Repository'
          ? repoName
          : scope.caption === 'Product'
            ? breadcrumbs.product
            : undefined;
    return (
      <div className='border-rail-border mx-3 mt-1 mb-1 border-t px-2 pt-4'>
        <div className='text-rail-muted text-[0.625rem] leading-3 font-medium tracking-[0.06em] uppercase'>
          {scope.caption}
        </div>
        {name && (
          <div className='mt-1 truncate text-[0.8125rem] leading-5 font-medium text-white'>
            {name}
          </div>
        )}
      </div>
    );
  }
  return <div className='border-rail-border mx-3 mt-1 border-t' />;
};

/**
 * Lays out a scoped page: its section navigation goes into the app rail, the optional top bar
 * heads the work sheet, and the content fills the rest.
 */
export const PageLayout = ({ sections, topBar, children }: PageLayoutProps) => {
  const { slot } = useRail();

  return (
    <>
      {sections &&
        slot &&
        createPortal(
          <>
            <RailScope />
            <Sidebar sections={sections} />
          </>,
          slot
        )}
      {topBar && <div className='w-full'>{topBar}</div>}
      <div className='flex w-full flex-col gap-6'>{children}</div>
    </>
  );
};
