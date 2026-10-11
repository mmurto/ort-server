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
import {
  createFileRoute,
  Outlet,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import {
  Boxes,
  Bug,
  CalendarCheck,
  Eye,
  Files,
  FileText,
  FolderKanban,
  FolderTree,
  ListCheck,
  Logs,
  Scale,
  ShieldQuestion,
  SquareScissors,
} from 'lucide-react';
import { Suspense, useEffect } from 'react';

import {
  getRepositoryRunOptions,
  getRunStatisticsOptions,
} from '@/api/@tanstack/react-query.gen';
import { PageLayout } from '@/components/page-layout';
import { SidebarNavProps } from '@/components/sidebar';
import { config } from '@/config';
import { isJobFinished, isRunFinished } from '@/helpers/job-helpers';
import {
  getRememberedSearch,
  useRunPageSearchStore,
} from '@/store/run-page-search.store';
import { RunDetailsBar } from './-components/run-details-bar';

type RailItem = SidebarNavProps['sections'][number]['items'][number];

const Layout = () => {
  const params = Route.useParams();
  const repoParams = {
    orgId: params.orgId,
    productId: params.productId,
    repoId: params.repoId,
  };
  const repositoryPermissions = Route.useRouteContext().permissions.repository;
  const router = useRouter();
  const location = useLocation();
  const searchByPath = useRunPageSearchStore((state) => state.searchByPath);
  const rememberSearch = useRunPageSearchStore((state) => state.rememberSearch);

  // Remember the filters of every page of the run, so its rail link returns to
  // them.
  useEffect(() => {
    rememberSearch(location.pathname, location.search);
  }, [location.pathname, location.search, rememberSearch]);

  /** Links a rail item to the search last used on its page, if any. */
  const withRememberedSearch = (item: RailItem): RailItem => {
    if (item.to === undefined) return item;
    const { pathname } = router.buildLocation({
      to: item.to,
      params: item.params,
    } as Parameters<typeof router.buildLocation>[0]);
    const remembered = getRememberedSearch(searchByPath, pathname);

    return remembered === undefined ? item : { ...item, search: remembered };
  };

  // The rail shows how many unresolved items each result section holds, once the run has them.
  const { data: ortRun } = useQuery(
    getRepositoryRunOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        ortRunIndex: Number.parseInt(params.runIndex),
      },
    })
  );
  const { data: statistics } = useQuery({
    ...getRunStatisticsOptions({ path: { runId: ortRun?.id ?? 0 } }),
    enabled:
      ortRun !== undefined &&
      Object.values(ortRun.jobs).some((job) => isJobFinished(job?.status)),
    // The counts grow while the run is still going.
    refetchInterval: isRunFinished(ortRun?.status)
      ? false
      : config.pollInterval,
  });

  const sections: SidebarNavProps['sections'] = [
    {
      items: [
        {
          title: 'Overview',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex',
          params,
          icon: () => <Eye className='h-4 w-4' />,
        },
      ],
    },
    {
      label: 'Compliance',
      items: [
        {
          title: 'Rule Violations',
          count: statistics?.ruleViolationsCount ?? undefined,
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations',
          params,
          search: {
            sortBy: [{ id: 'severity', desc: true }],
            itemResolved: ['Unresolved'],
          },
          icon: () => <Scale className='h-4 w-4' />,
        },
        {
          title: 'Detected Licenses',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/license-findings',
          params,
          search: {
            sortBy: [{ id: 'packageCount', desc: true }],
          },
          icon: () => <FileText className='h-4 w-4' />,
        },
        {
          title: 'Detected Snippets',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/snippet-findings',
          params,
          search: {
            sortBy: [{ id: 'name', desc: false }],
          },
          icon: () => <SquareScissors className='h-4 w-4' />,
        },
        {
          title: 'Vulnerabilities',
          count: statistics?.vulnerabilitiesCount ?? undefined,
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/vulnerabilities',
          params,
          search: {
            sortBy: [{ id: 'rating', desc: true }],
            itemResolved: ['Unresolved'],
          },
          icon: () => <ShieldQuestion className='h-4 w-4' />,
        },
      ],
    },
    {
      label: 'Components',
      items: [
        {
          title: 'Projects',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/projects',
          params,
          icon: () => <FolderKanban className='h-4 w-4' />,
        },
        {
          title: 'Packages',
          count: statistics?.packagesCount ?? undefined,
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages',
          params,
          icon: () => <Boxes className='h-4 w-4' />,
        },
        {
          title: 'Dependency Graphs',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/dependencies',
          params,
          icon: () => <FolderTree className='h-4 w-4' />,
        },
      ],
    },
    {
      label: 'Reports',
      items: [
        {
          title: 'SBOMs',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/sbom',
          params,
          icon: () => <ListCheck className='h-4 w-4' />,
        },
        {
          title: 'Other',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/reports',
          params,
          icon: () => <Files className='h-4 w-4' />,
        },
      ],
    },
    {
      label: 'Technical',
      items: [
        {
          title: 'Issues',
          count: statistics?.issuesCount ?? undefined,
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/issues',
          params,
          search: {
            sortBy: [{ id: 'severity', desc: true }],
            itemResolved: ['Unresolved'],
          },
          icon: () => <Bug className='h-4 w-4' />,
        },
        {
          title: 'Logs',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/logs',
          params,
          icon: () => <Logs className='h-4 w-4' />,
        },
        {
          title: 'Configuration',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/config',
          params,
          icon: () => <CalendarCheck className='h-4 w-4' />,
        },
      ],
    },
    // The repository of the run, so that its runs and actions are one step away.
    {
      label: 'Repository',
      items: [
        {
          title: 'All runs',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs',
          params: repoParams,
        },
        {
          title: 'New run',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/create-run',
          params: repoParams,
          visible: repositoryPermissions?.includes('TRIGGER_ORT_RUN'),
        },
        {
          title: 'Settings',
          to: '/organizations/$orgId/products/$productId/repositories/$repoId/settings',
          params: repoParams,
          visible: repositoryPermissions?.includes('WRITE'),
        },
      ],
    },
  ];

  return (
    <PageLayout
      sections={sections.map((section) => ({
        ...section,
        items: section.items.map(withRememberedSearch),
      }))}
      topBar={<RunDetailsBar />}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <Outlet />
      </Suspense>
    </PageLayout>
  );
};
export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex'
)({
  loader: async ({ context, params }) => {
    const run = await context.queryClient.ensureQueryData({
      ...getRepositoryRunOptions({
        path: {
          repositoryId: Number.parseInt(params.repoId),
          ortRunIndex: Number.parseInt(params.runIndex),
        },
      }),
      revalidateIfStale: true,
    });
    context.breadcrumbs.run = run.index.toString();
  },
  component: Layout,
});
