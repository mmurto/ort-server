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

import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRail } from '@/components/app-rail';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

const mocks = vi.hoisted(() => ({ isSuperuser: false }));

vi.mock('@/hooks/use-user', () => ({
  useUser: () => ({ isSuperuser: mocks.isSuperuser }),
}));

vi.mock('@/components/rail-context', () => ({
  useRail: () => ({ open: false, setOpen: () => {} }),
}));

vi.mock('@/components/theme-provider-context', () => ({
  useTheme: () => ({ mode: 'light' }),
}));

vi.mock('@/components/org-switcher', () => ({ OrgSwitcher: () => null }));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getServerSettingByKey: vi.fn(async () => ({
    data: { isEnabled: false, value: null },
  })),
}));

const renderRail = (path: string) =>
  renderInteractiveWithRouter(<AppRail slotRef={() => {}} />, {
    path,
    routes: [
      { path: '/' },
      { path: '/settings' },
      { path: '/organizations/$orgId' },
    ],
    withQueryClient: true,
  });

describe('AppRail', () => {
  beforeEach(() => {
    mocks.isSuperuser = false;
  });

  it('shows the general navigation outside organizations', async () => {
    renderRail('/settings');

    const nav = await screen.findByRole('navigation', { name: 'General' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['Home', 'Organizations', 'Profile', 'Preferences', 'About']);
    expect(
      within(nav).getByRole('link', { name: 'Preferences' })
    ).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('offers the administration to superusers', async () => {
    mocks.isSuperuser = true;
    renderRail('/');

    const nav = await screen.findByRole('navigation', { name: 'General' });
    expect(
      within(nav).getByRole('link', { name: 'Administration' })
    ).toHaveAttribute('href', '/admin');
  });

  it('leaves the rail to the sections of an organization', async () => {
    renderRail('/organizations/1');

    expect(
      await screen.findByRole('complementary', { name: 'Main navigation' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'General' })
    ).not.toBeInTheDocument();
  });
});
