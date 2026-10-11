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

import { Link } from '@tanstack/react-router';
import { screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { UnsavedChangesGuard } from '@/components/unsaved-changes-guard';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

const FormPage = () => {
  const form = useForm({ defaultValues: { name: '' } });

  return (
    <>
      <UnsavedChangesGuard control={form.control} />
      <input aria-label='Name' {...form.register('name')} />
      <Link to='/about'>Leave</Link>
    </>
  );
};

const renderFormPage = () =>
  renderInteractiveWithRouter(null, {
    path: '/form',
    routes: [
      { path: '/form', component: FormPage },
      { path: '/about', component: () => <p>Other page</p> },
    ],
  });

describe('UnsavedChangesGuard', () => {
  it('lets the user leave a form without changes', async () => {
    const { user } = renderFormPage();

    await user.click(await screen.findByRole('link', { name: 'Leave' }));

    expect(await screen.findByText('Other page')).toBeVisible();
  });

  it('asks before leaving a form with changes and stays when asked to', async () => {
    const { user, router } = renderFormPage();

    await user.type(await screen.findByLabelText('Name'), 'Draft');
    await user.click(screen.getByRole('link', { name: 'Leave' }));

    expect(
      await screen.findByRole('alertdialog', {
        name: 'Discard unsaved changes?',
      })
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Stay' }));

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
    expect(router.state.location.pathname).toBe('/form');
    expect(screen.getByLabelText('Name')).toHaveValue('Draft');
  });

  it('leaves the page when the changes are discarded', async () => {
    const { user } = renderFormPage();

    await user.type(await screen.findByLabelText('Name'), 'Draft');
    await user.click(screen.getByRole('link', { name: 'Leave' }));
    await user.click(await screen.findByRole('button', { name: 'Discard' }));

    expect(await screen.findByText('Other page')).toBeVisible();
  });
});
