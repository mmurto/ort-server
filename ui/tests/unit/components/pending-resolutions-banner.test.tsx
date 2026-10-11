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
import { beforeEach, expect, it, vi } from 'vitest';

import { PendingResolutionsBanner } from '@/components/resolutions';
import { TooltipProvider } from '@/components/ui/tooltip';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';
import { createRuleViolation } from '../fixtures/resolutions';

const mocks = vi.hoisted(() => ({ userInfo: vi.fn() }));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  getUserInfo: mocks.userInfo,
}));

vi.mock('@/hooks/use-user', () => ({
  useUser: () => ({ isSuperuser: false }),
}));

const run = { orgId: '1', productId: '2', repoId: '3', runIndex: '4' };

const renderBanner = (
  items: Parameters<typeof PendingResolutionsBanner>[0]['items']
) =>
  renderInteractiveWithRouter(
    <TooltipProvider>
      <PendingResolutionsBanner items={items} run={run} />
    </TooltipProvider>,
    { path: '/', withQueryClient: true }
  );

beforeEach(() => {
  mocks.userInfo.mockResolvedValue({
    data: { repositoryPermissions: ['TRIGGER_ORT_RUN'] },
  });
});

it('offers a rerun while resolution changes are pending', async () => {
  renderBanner([
    createRuleViolation({ resolutions: [], unappliedResolutions: [] }),
    createRuleViolation({
      resolutions: [],
      unappliedResolutions: [
        {
          message: 'Rule violation message',
          reason: 'CANT_FIX_EXCEPTION',
          comment: '',
          source: 'SERVER',
        },
      ],
    }),
  ]);

  expect(
    await screen.findByText('Resolution changes are pending.')
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Rerun' })).toBeVisible();
});

it('offers a rerun when a resolution was deleted after the run', async () => {
  renderBanner([
    createRuleViolation({
      resolutions: [
        {
          message: 'Rule violation message',
          reason: 'CANT_FIX_EXCEPTION',
          comment: '',
          source: 'SERVER',
          isDeleted: true,
        },
      ],
      unappliedResolutions: [],
    }),
  ]);

  expect(
    await screen.findByText('Resolution changes are pending.')
  ).toBeVisible();
});

it('shows nothing without pending changes', async () => {
  renderBanner([
    createRuleViolation({
      resolutions: [
        {
          message: 'Rule violation message',
          reason: 'CANT_FIX_EXCEPTION',
          comment: '',
          source: 'REPOSITORY_FILE',
          isDeleted: false,
        },
      ],
      unappliedResolutions: [],
    }),
  ]);

  await screen.findByText((_, element) => element?.tagName === 'BODY');
  expect(
    screen.queryByText('Resolution changes are pending.')
  ).not.toBeInTheDocument();
});
