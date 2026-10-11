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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Resolutions } from '@/components/resolutions';
import { TooltipProvider } from '@/components/ui/tooltip';
import { compiledFunctionNames } from '../fixtures/react-compiler';
import {
  createRuleViolation,
  createVulnerability,
} from '../fixtures/resolutions';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  postVulnerabilityResolution: mocks.post,
  patchVulnerabilityResolution: mocks.patch,
  deleteVulnerabilityResolution: mocks.remove,
}));

const renderWithProviders = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{ui}</TooltipProvider>
      </QueryClientProvider>
    ),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.post.mockResolvedValue({ data: undefined });
  mocks.patch.mockResolvedValue({ data: undefined });
  mocks.remove.mockResolvedValue({ data: undefined });
});

describe('resolution form', () => {
  it('offers the reasons with plain labels and help, and creates a resolution', async () => {
    const { user } = renderWithProviders(
      <Resolutions
        item={createVulnerability({
          resolutions: [],
          unappliedResolutions: [],
        })}
        repositoryId='3'
        runId={42}
      />
    );

    const reasons = screen.getByRole('radiogroup', { name: 'Reason' });
    expect(
      within(reasons).getByRole('radio', { name: "Can't fix" })
    ).toBeChecked();
    expect(
      within(reasons).getByRole('radio', { name: 'Not a vulnerability' })
    ).toHaveAccessibleDescription('The report is a false positive.');
    expect(screen.queryByText('NOT_A_VULNERABILITY')).not.toBeInTheDocument();

    await user.click(
      within(reasons).getByRole('radio', { name: 'Not a vulnerability' })
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Comment' }),
      'Only in tests.'
    );
    await user.click(screen.getByRole('button', { name: 'Resolve' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
    expect(mocks.post.mock.calls[0]?.[0]).toMatchObject({
      path: { repositoryId: '3', externalId: 'CVE-0000-0000' },
      body: { reason: 'NOT_A_VULNERABILITY', comment: 'Only in tests.' },
    });
  });

  it('shows a server resolution with labelled buttons to edit and delete it', async () => {
    const { user } = renderWithProviders(
      <Resolutions
        item={createVulnerability({
          resolutions: [
            {
              externalId: 'CVE-0000-0000',
              reason: 'MITIGATED_VULNERABILITY',
              comment: 'Behind a firewall.',
              source: 'SERVER',
              isDeleted: false,
            },
          ],
          unappliedResolutions: [],
        })}
        repositoryId='3'
        runId={42}
      />
    );

    expect(screen.getByText('Mitigated')).toBeVisible();
    expect(screen.getByText('Behind a firewall.')).toBeVisible();
    // An existing resolution replaces the form for a new one.
    expect(
      screen.queryByRole('button', { name: 'Resolve' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('radio', { name: "Won't fix" }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledOnce());
    expect(mocks.patch.mock.calls[0]?.[0]).toMatchObject({
      body: {
        reason: 'WILL_NOT_FIX_VULNERABILITY',
        comment: 'Behind a firewall.',
      },
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Save' })
      ).not.toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledOnce());
    expect(mocks.remove.mock.calls[0]?.[0]).toMatchObject({
      path: { repositoryId: '3', externalId: 'CVE-0000-0000' },
    });
  });

  it('marks a pending resolution and keeps it manageable', () => {
    renderWithProviders(
      <Resolutions
        item={createVulnerability({
          resolutions: [],
          unappliedResolutions: [
            {
              externalId: 'CVE-0000-0000',
              reason: 'CANT_FIX_VULNERABILITY',
              comment: '',
              source: 'SERVER',
            },
          ],
        })}
        repositoryId='3'
        runId={42}
      />
    );

    expect(screen.getByText('Added · pending rerun')).toBeVisible();
    expect(screen.getByText('No comment.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  it('shows a resolution from the repository configuration as read-only', () => {
    renderWithProviders(
      <Resolutions
        item={createRuleViolation({
          resolutions: [
            {
              message: 'Rule violation message',
              reason: 'LICENSE_ACQUIRED_EXCEPTION',
              comment: 'Bought.',
              source: 'REPOSITORY_FILE',
              isDeleted: false,
            },
          ],
          unappliedResolutions: [],
        })}
        repositoryId='3'
        runId={42}
      />
    );

    expect(screen.getByText('License acquired')).toBeVisible();
    expect(
      screen.getByText(
        'Defined in the repository configuration; change it there.'
      )
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Edit' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete' })
    ).not.toBeInTheDocument();
  });

  it('is compiled by React Compiler', () => {
    expect(
      compiledFunctionNames('src/components/resolutions/shared.tsx')
    ).toEqual(
      expect.arrayContaining([
        'ResolutionFormFields',
        'ResolutionForm',
        'ResolutionEntry',
      ])
    );
    expect(
      compiledFunctionNames('src/components/resolutions/bulk-resolve.tsx')
    ).toContain('BulkResolve');
  });
});
