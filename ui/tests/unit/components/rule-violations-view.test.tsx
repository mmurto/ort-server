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

// @vitest-environment jsdom

import { defaultParseSearch } from '@tanstack/react-router';
import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GetRunRuleViolationsData, RuleViolation } from '@/api';
import { TooltipProvider } from '@/components/ui/tooltip';
import { identifierToString } from '@/helpers/identifier-conversion';
import { Route } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations/index';
import { packageIdTypeSchema } from '@/schemas';
import { useUserSettingsStore } from '@/store/user-settings.store';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  rules: vi.fn(),
  statistics: vi.fn(),
  violations: vi.fn(),
}));

vi.mock('@/components/resolutions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/resolutions')>()),
  Resolutions: () => null,
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getRepositoryRun: mocks.run,
  getRunRuleViolationRules: mocks.rules,
  getRunRuleViolations: mocks.violations,
  getRunStatistics: mocks.statistics,
  getUserInfo: () => Promise.resolve({ data: {} }),
}));

vi.mock('@/hooks/use-user', () => ({
  useUser: () => ({ isSuperuser: false }),
}));

const RuleViolationsComponent = Route.options.component!;
const identifier = {
  type: 'Maven',
  namespace: 'com.example',
  name: 'library',
  version: '1.0',
};
const id = identifierToString(identifier);
const purl = 'pkg:maven/com.example/library@1.0';

beforeEach(() => {
  vi.clearAllMocks();
  useUserSettingsStore.setState({
    packageIdType: packageIdTypeSchema.enum.PURL,
  });
  mocks.run.mockResolvedValue({ data: { id: 42, jobs: {} } });
  mocks.rules.mockResolvedValue({ data: [] });
  mocks.statistics.mockResolvedValue({
    data: {
      ruleViolationsCountBySeverity: { ERROR: 1, WARNING: 2, HINT: 0 },
      ruleViolationsCountTotalBySeverity: { ERROR: 2, WARNING: 3, HINT: 0 },
    },
  });
});

const renderViolation = (violationPurl: string | null) => {
  const violation: RuleViolation = {
    id: identifier,
    purl: violationPurl,
    howToFix: '',
    message: 'A violation',
    rule: 'TestRule',
    severity: 'WARNING',
  };
  mocks.violations.mockResolvedValue({
    data: {
      data: [violation],
      pagination: { totalCount: 1, limit: 10, offset: 0 },
    },
  });

  renderInteractiveWithRouter(
    <TooltipProvider>
      <RuleViolationsComponent />
    </TooltipProvider>,
    {
      path: '/organizations/1/products/2/repositories/3/runs/4/rule-violations',
      routes: [
        {
          path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations/',
        },
      ],
      withQueryClient: true,
    }
  );
};

it.each([
  {
    purl: '',
    linkText: id,
    table: 'packages',
    search: { pkgId: id, pkgIdType: 'ORT_ID', marked: '0' },
  },
  {
    purl,
    linkText: purl,
    table: 'packages',
    search: { pkgId: purl, pkgIdType: 'PURL', marked: '0' },
  },
  {
    purl: null,
    linkText: id,
    table: 'projects',
    search: { projectId: id, marked: id },
  },
])(
  'links a rule violation with PURL $purl to $table',
  async ({ purl, linkText, table, search }) => {
    renderViolation(purl);

    const link = await screen.findByRole('link', { name: linkText });
    const target = new URL(link.getAttribute('href')!, 'http://localhost');

    expect(target.pathname).toBe(
      `/organizations/1/products/2/repositories/3/runs/4/${table}`
    );
    expect(defaultParseSearch(target.search)).toEqual(search);
  }
);

describe('rule violations table', () => {
  type ViolationsQuery = NonNullable<GetRunRuleViolationsData['query']>;

  const purlOf = (name: string) => `pkg:maven/com.example/${name}@1.0`;

  const getViolationsPage = (query: ViolationsQuery = {}) => {
    const name = query.rule ? 'filtered' : 'violation';
    const violation: RuleViolation = {
      id: { ...identifier, name },
      purl: purlOf(name),
      howToFix: '',
      message: 'A violation',
      rule: query.rule ?? 'TestRule',
      severity: 'WARNING',
    };

    return {
      data: [violation],
      pagination: {
        limit: query.limit ?? 10,
        offset: query.offset ?? 0,
        totalCount: query.rule ? 1 : 5,
      },
    };
  };

  beforeEach(() => {
    mocks.violations.mockImplementation(
      async ({ query }: { query?: ViolationsQuery }) => ({
        data: getViolationsPage(query),
      })
    );
  });

  it('is compiled by React Compiler', () => {
    expect(RuleViolationsComponent.toString()).toContain(
      'react.memo_cache_sentinel'
    );
  });

  it('applies filters from the URL', async () => {
    const { container, router } = renderInteractiveWithRouter(
      <TooltipProvider>
        <RuleViolationsComponent />
      </TooltipProvider>,
      {
        path: '/organizations/1/products/2/repositories/3/runs/4/rule-violations',
        routes: [
          {
            path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations/',
          },
        ],
        withQueryClient: true,
      }
    );

    expect(
      await screen.findByRole('link', { name: purlOf('violation') })
    ).toBeInTheDocument();

    await act(() =>
      router.navigate({
        to: '.',
        search: { severity: ['ERROR'], rule: ['RuleA', 'RuleB'] },
      })
    );

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: purlOf('filtered') })
      ).toBeVisible()
    );
    expect(
      screen.queryByRole('link', { name: purlOf('violation') })
    ).not.toBeInTheDocument();
    expect(mocks.violations.mock.calls.at(-1)?.[0].query).toMatchObject({
      severity: 'ERROR',
      rule: 'RuleA,RuleB',
    });
    expect(container).toHaveTextContent('5 in total, 1 matching filters');
  });

  it('filters by severity with the chips, which show the counts of the run statistics', async () => {
    const { router, user } = renderInteractiveWithRouter(
      <TooltipProvider>
        <RuleViolationsComponent />
      </TooltipProvider>,
      {
        path: '/organizations/1/products/2/repositories/3/runs/4/rule-violations',
        routes: [
          {
            path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations/',
          },
        ],
        withQueryClient: true,
      }
    );

    const chips = await screen.findByRole('group', {
      name: 'Filter by severity',
    });
    await waitFor(() => expect(chips).toHaveTextContent('All5'));
    expect(chips).toHaveTextContent('Error2');

    await user.click(within(chips).getByRole('button', { name: /Error/ }));

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        page: 1,
        severity: ['ERROR'],
      })
    );
    // The page shows the chips again once the filtered violations have loaded.
    await waitFor(() =>
      expect(
        within(
          screen.getByRole('group', { name: 'Filter by severity' })
        ).getByRole('button', { name: /Error/ })
      ).toHaveAttribute('aria-pressed', 'true')
    );
  });

  it('shows the resolved mark next to the rule', async () => {
    mocks.violations.mockImplementation(
      async ({ query }: { query?: ViolationsQuery }) => {
        const page = getViolationsPage(query);

        return {
          data: {
            ...page,
            data: page.data.map((violation) => ({
              ...violation,
              resolutions: [
                {
                  message: violation.message,
                  reason: 'CANT_FIX_EXCEPTION',
                  comment: '',
                  isDeleted: false,
                  source: 'REPOSITORY_FILE',
                },
              ],
            })),
          },
        };
      }
    );
    renderInteractiveWithRouter(
      <TooltipProvider>
        <RuleViolationsComponent />
      </TooltipProvider>,
      {
        path: '/organizations/1/products/2/repositories/3/runs/4/rule-violations',
        routes: [
          {
            path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations/',
          },
        ],
        withQueryClient: true,
      }
    );

    const rule = await screen.findByText('TestRule');

    expect(rule.closest('[role="gridcell"]')).toHaveTextContent(
      'TestRuleResolved'
    );
    expect(
      screen.queryByRole('columnheader', { name: /^Status/ })
    ).not.toBeInTheDocument();
  });

  it('marks a rule violation resolved only with the next run, and offers the rerun', async () => {
    mocks.violations.mockImplementation(
      async ({ query }: { query?: ViolationsQuery }) => {
        const page = getViolationsPage(query);

        return {
          data: {
            ...page,
            data: page.data.map((violation) => ({
              ...violation,
              resolutions: [],
              unappliedResolutions: [
                {
                  message: violation.message,
                  reason: 'CANT_FIX_EXCEPTION',
                  comment: '',
                  source: 'SERVER',
                },
              ],
            })),
          },
        };
      }
    );
    renderInteractiveWithRouter(
      <TooltipProvider>
        <RuleViolationsComponent />
      </TooltipProvider>,
      {
        path: '/organizations/1/products/2/repositories/3/runs/4/rule-violations',
        routes: [
          {
            path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations/',
          },
        ],
        withQueryClient: true,
      }
    );

    const rule = await screen.findByText('TestRule');

    expect(rule.closest('[role="gridcell"]')).toHaveTextContent(
      'TestRuleResolved (pending)'
    );
    expect(rule).not.toHaveClass('line-through');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Resolution changes are pending. They apply to the next run.'
    );
    expect(screen.getByRole('button', { name: 'Rerun' })).toBeVisible();
  });

  it('opens the details of a rule violation by clicking its row', async () => {
    const { router, user } = renderInteractiveWithRouter(
      <TooltipProvider>
        <RuleViolationsComponent />
      </TooltipProvider>,
      {
        path: '/organizations/1/products/2/repositories/3/runs/4/rule-violations',
        routes: [
          {
            path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/rule-violations/',
          },
        ],
        withQueryClient: true,
      }
    );

    await user.click(await screen.findByText('TestRule'));

    const details = await screen.findByRole('dialog');
    expect(within(details).getByText('A violation')).toBeVisible();
    for (const heading of ['Package', 'License', 'How to fix']) {
      expect(
        within(details).getByRole('heading', { name: heading })
      ).toBeVisible();
    }
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ marked: '0' })
    );
  });
});
