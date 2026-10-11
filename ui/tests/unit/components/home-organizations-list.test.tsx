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

import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getOrganizations } from '@/api/sdk.gen';
import { HomeOrganizationsList } from '@/routes/-components/home-organizations-section';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getOrganizations: vi.fn(),
}));

const renderList = (count: number, totalCount = count) => {
  vi.mocked(getOrganizations).mockResolvedValue({
    data: {
      data: Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        name: `Organization ${index + 1}`,
        description: index === 0 ? 'The first one' : undefined,
      })),
      pagination: { limit: 12, offset: 0, totalCount },
    },
  } as unknown as Awaited<ReturnType<typeof getOrganizations>>);

  return renderInteractiveWithRouter(<HomeOrganizationsList />, {
    path: '/',
    routes: [
      { path: '/' },
      { path: '/organizations' },
      { path: '/organizations/$orgId' },
    ],
    withQueryClient: true,
  });
};

describe('HomeOrganizationsList', () => {
  it('links to the organizations of the user', async () => {
    renderList(2);

    expect(
      await screen.findByRole('link', { name: /Organization 1/ })
    ).toHaveAttribute('href', '/organizations/1');
    expect(screen.getByText('The first one')).toBeInTheDocument();
    expect(screen.getByText('2 in total')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'All organizations' })
    ).not.toBeInTheDocument();
  });

  it('links to all organizations when not all of them are shown', async () => {
    renderList(12, 20);

    expect(
      await screen.findByRole('link', { name: 'All organizations' })
    ).toHaveAttribute('href', '/organizations');
    expect(screen.getByText('20 in total')).toBeInTheDocument();
  });

  it('explains how to get access without organizations', async () => {
    renderList(0);

    expect(
      await screen.findByText(/You don't have access to any organization yet/)
    ).toBeInTheDocument();
  });
});
