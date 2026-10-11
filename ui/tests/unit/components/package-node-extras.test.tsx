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
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { identifierToString } from '@/helpers/identifier-conversion';
import { PackageNodeExtras } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/dependencies/-components/package-node-extras';
import { groupVulnerabilitiesByPackage } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/dependencies/-components/package-vulnerabilities';
import { packageIdTypeSchema } from '@/schemas';
import { createDependencyGraph } from '../fixtures/dependency-graph';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

const graph = createDependencyGraph();
const params = { orgId: '1', productId: '2', repoId: '3', runIndex: '4' };

const renderExtras = (
  props: Partial<React.ComponentProps<typeof PackageNodeExtras>> = {}
) =>
  renderInteractiveWithRouter(
    <PackageNodeExtras
      graph={graph}
      packageIndex={0}
      packageIdType={packageIdTypeSchema.enum.ORT_ID}
      vulnerabilities={undefined}
      params={params}
      {...props}
    />,
    {
      path: '/organizations/1/products/2/repositories/3/runs/4/dependencies',
      routes: [
        {
          path: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/dependencies/',
        },
      ],
    }
  );

const linkTarget = (link: HTMLElement) => {
  const url = new URL(link.getAttribute('href')!, 'http://localhost');

  return { pathname: url.pathname, search: defaultParseSearch(url.search) };
};

describe('PackageNodeExtras', () => {
  it('links to the package in the packages table', async () => {
    const id = identifierToString(graph.packages[0]);
    renderExtras();

    const link = await screen.findByRole('link', {
      name: `Package details of ${id}`,
    });

    expect(link).toHaveTextContent('Package details');
    expect(linkTarget(link)).toEqual({
      pathname: '/organizations/1/products/2/repositories/3/runs/4/packages',
      search: {
        pkgId: id,
        pkgIdType: packageIdTypeSchema.enum.ORT_ID,
        marked: '0',
      },
    });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('links by the PURL when PURLs are shown', async () => {
    renderExtras({ packageIdType: packageIdTypeSchema.enum.PURL });

    const link = await screen.findByRole('link', {
      name: `Package details of ${graph.purls[0]}`,
    });

    expect(linkTarget(link).search).toEqual({
      pkgId: graph.purls[0],
      pkgIdType: packageIdTypeSchema.enum.PURL,
      marked: '0',
    });
  });

  it('marks a package with vulnerabilities', async () => {
    renderExtras({ vulnerabilities: { count: 2, rating: 'HIGH' } });

    expect(
      await screen.findByRole('img', {
        name: '2 vulnerabilities, highest rating high',
      })
    ).toBeInTheDocument();
  });
});

describe('groupVulnerabilitiesByPackage', () => {
  it('counts the vulnerabilities per package and keeps the highest rating', () => {
    const [first, second] = graph.packages;
    const grouped = groupVulnerabilitiesByPackage([
      { identifier: first!, rating: 'LOW' },
      { identifier: first!, rating: 'CRITICAL' },
      { identifier: first!, rating: 'MEDIUM' },
      { identifier: second!, rating: 'NONE' },
    ]);

    expect(grouped.get(identifierToString(first!))).toEqual({
      count: 3,
      rating: 'CRITICAL',
    });
    expect(grouped.get(identifierToString(second!))).toEqual({
      count: 1,
      rating: 'NONE',
    });
  });
});
