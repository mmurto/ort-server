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

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrtRunSummary } from '@/api';
import { RunItemCounts } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/run-item-counts';

type Statistics = {
  issuesCount: number;
  vulnerabilitiesCount: number;
  ruleViolationsCount: number;
};

type ItemCountsProps = {
  statistics: Statistics;
  showIssues: boolean;
  showVulnerabilities: boolean;
  showRuleViolations: boolean;
  wide: boolean;
  link: {
    params: Record<string, string>;
    issuesSearch: unknown;
    vulnerabilitiesSearch: unknown;
    ruleViolationsSearch: unknown;
  };
};

const mocks = vi.hoisted(() => ({
  statistics: {
    issuesCount: 3,
    vulnerabilitiesCount: 5,
    ruleViolationsCount: 7,
  } as Statistics,
  suspend: false,
  itemCountsProps: undefined as ItemCountsProps | undefined,
  skeletonWide: undefined as boolean | undefined,
  previousStatistics: undefined as Statistics | undefined,
  pendingPromise: new Promise<never>(() => undefined),
  useSuspenseQuery: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();

  return {
    ...actual,
    useSuspenseQuery: mocks.useSuspenseQuery,
    useQuery: mocks.useQuery,
  };
});

vi.mock('@/components/item-counts', () => ({
  ItemCounts: (props: ItemCountsProps) => {
    mocks.itemCountsProps = props;
    return <div>Item counts</div>;
  },
  ItemCountsSkeleton: ({ wide }: { wide?: boolean }) => {
    mocks.skeletonWide = wide;
    return <div data-slot='item-counts-skeleton' />;
  },
}));

const runSummary = {
  id: 11,
  index: 7,
  organizationId: 1,
  productId: 2,
  repositoryId: 3,
  jobs: {
    analyzer: { status: 'FINISHED' },
    advisor: { status: 'FINISHED' },
    evaluator: { status: 'FINISHED' },
  },
} as OrtRunSummary;

const previousRun = {
  ...runSummary,
  id: 10,
  index: 6,
} as OrtRunSummary;

const renderItemCounts = (
  summary: OrtRunSummary = runSummary,
  previous?: OrtRunSummary
) =>
  renderToStaticMarkup(<RunItemCounts summary={summary} previous={previous} />);

// The visible delta and its description of the given category.
const delta = (markup: string, key: string) => {
  const container = document.createElement('div');
  container.innerHTML = markup;
  const element = container.querySelector(
    `[data-testid="run-item-delta-${key}"]`
  );

  return (
    element && {
      text: element.querySelector('[aria-hidden]')?.textContent,
      className: element.querySelector('[aria-hidden]')?.className,
      description: element.querySelector('.sr-only')?.textContent,
    }
  );
};

describe('RunItemCounts', () => {
  beforeEach(() => {
    mocks.suspend = false;
    mocks.itemCountsProps = undefined;
    mocks.skeletonWide = undefined;
    mocks.useSuspenseQuery.mockReset();
    mocks.useSuspenseQuery.mockImplementation(() => {
      if (mocks.suspend) throw mocks.pendingPromise;

      return { data: mocks.statistics };
    });
    mocks.previousStatistics = undefined;
    mocks.useQuery.mockReset();
    mocks.useQuery.mockImplementation(({ enabled }: { enabled: boolean }) => ({
      data: enabled ? mocks.previousStatistics : undefined,
    }));
  });

  it('renders wide item-count badges linked to the run findings', () => {
    const markup = renderItemCounts();

    expect(markup).toContain('Item counts');
    expect(mocks.itemCountsProps).toMatchObject({
      statistics: mocks.statistics,
      showIssues: true,
      showVulnerabilities: true,
      showRuleViolations: true,
      wide: true,
      link: {
        params: {
          orgId: '1',
          productId: '2',
          repoId: '3',
          runIndex: '7',
        },
        issuesSearch: {
          sortBy: [{ id: 'severity', desc: true }],
          itemResolved: ['Unresolved'],
        },
        vulnerabilitiesSearch: {
          sortBy: [{ id: 'rating', desc: true }],
          itemResolved: ['Unresolved'],
        },
        ruleViolationsSearch: {
          sortBy: [{ id: 'severity', desc: true }],
          itemResolved: ['Unresolved'],
        },
      },
    });
  });

  it('renders a wide skeleton while the statistics are loading', () => {
    mocks.suspend = true;

    const markup = renderItemCounts();

    expect(markup).toContain('data-slot="item-counts-skeleton"');
    expect(markup).toContain('Loading data...');
    expect(mocks.skeletonWide).toBe(true);
    expect(mocks.itemCountsProps).toBeUndefined();
  });

  it('hides badges for jobs that have not finished', () => {
    renderItemCounts({
      ...runSummary,
      jobs: {
        ...runSummary.jobs,
        advisor: { ...runSummary.jobs.advisor!, status: 'RUNNING' },
        evaluator: null,
      },
    });

    expect(mocks.itemCountsProps).toMatchObject({
      showIssues: true,
      showVulnerabilities: false,
      showRuleViolations: false,
    });
  });

  it('shows no change without a previous run', () => {
    const markup = renderItemCounts();

    expect(markup).not.toContain('run-item-delta');
    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('shows the change of each count since the previous run', () => {
    mocks.previousStatistics = {
      issuesCount: 1,
      vulnerabilitiesCount: 7,
      ruleViolationsCount: 7,
    };

    const markup = renderItemCounts(runSummary, previousRun);

    expect(delta(markup, 'issues')).toEqual({
      text: '+2',
      className: 'text-err',
      description: '2 more than run 6',
    });
    expect(delta(markup, 'vulnerabilities')).toEqual({
      text: '\u22122',
      className: 'text-ok',
      description: '2 fewer than run 6',
    });
    expect(delta(markup, 'ruleViolations')).toEqual({
      text: '\u00b10',
      className: 'text-muted-foreground',
      description: 'Same as run 6',
    });
  });

  it('shows no change for a job that has not finished in either run', () => {
    mocks.previousStatistics = {
      issuesCount: 1,
      vulnerabilitiesCount: 7,
      ruleViolationsCount: 7,
    };

    const markup = renderItemCounts(runSummary, {
      ...previousRun,
      jobs: {
        ...previousRun.jobs,
        advisor: { ...previousRun.jobs.advisor!, status: 'FAILED' },
        evaluator: null,
      },
    });

    expect(delta(markup, 'issues')?.text).toBe('+2');
    expect(delta(markup, 'vulnerabilities')?.text).toBe('\u22122');
    expect(delta(markup, 'ruleViolations')).toBeNull();
  });

  it('waits for the statistics of the previous run', () => {
    const markup = renderItemCounts(runSummary, previousRun);

    expect(markup).toContain('Item counts');
    expect(markup).not.toContain('run-item-delta');
  });
});
