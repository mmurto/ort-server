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

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EditRepositoryForm } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/settings/-components/edit-repository-form';
import { isCompiledByReactCompiler } from '../fixtures/react-compiler';

// The guard needs a router, which is not part of this test.
vi.mock('@/components/unsaved-changes-guard', () => ({
  UnsavedChangesGuard: () => null,
}));

const defaultValues = {
  description: '',
  name: '',
  type: 'GIT' as const,
  url: 'https://example.com/repository.git',
};

describe('EditRepositoryForm', () => {
  // The form reads `formState.isValid` during render, on the compiled form.
  it('is compiled with React Compiler', () => {
    expect(isCompiledByReactCompiler(EditRepositoryForm)).toBe(true);
  });

  it('enables submitting only when the URL is valid', async () => {
    const user = userEvent.setup();

    render(
      <EditRepositoryForm
        defaultValues={{
          description: '',
          name: '',
          type: 'GIT',
          url: 'https://example.com/repository.git',
        }}
        isPending={false}
        onSubmit={vi.fn()}
      />
    );

    const urlInput = screen.getByLabelText('URL');
    const typeInput = screen.getByLabelText('Type');
    const submitButton = screen.getByRole('button', { name: 'Save' });
    const urlField = urlInput.closest('[data-slot="form-item"]');
    const typeField = typeInput.closest('[data-slot="form-item"]');

    expect(urlField?.parentElement).toBe(typeField?.parentElement);
    expect(urlField?.parentElement).toHaveClass(
      'grid',
      'md:grid-cols-[minmax(0,1fr)_auto]'
    );
    await waitFor(() => expect(submitButton).toBeEnabled());

    for (const invalidUrl of ['not a URL', 's:', 'httttps:']) {
      await user.clear(urlInput);
      await user.type(urlInput, invalidUrl);
      expect(submitButton).toBeDisabled();
    }

    await user.clear(urlInput);
    await user.type(urlInput, 'https://example.com/updated-repository.git');
    expect(submitButton).toBeEnabled();
  });

  it('resets the changes and stays on the form after saving', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <EditRepositoryForm
        defaultValues={defaultValues}
        isPending={false}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByLabelText('Name');
    const resetButton = screen.getByRole('button', { name: 'Reset' });

    expect(resetButton).toBeDisabled();

    await user.type(nameInput, 'Draft');
    expect(resetButton).toBeEnabled();

    await user.click(resetButton);
    expect(nameInput).toHaveValue('');
    expect(resetButton).toBeDisabled();

    await user.type(nameInput, 'Saved name');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Saved name' })
      )
    );
    await waitFor(() => expect(resetButton).toBeDisabled());
    expect(nameInput).toHaveValue('Saved name');
  });

  it('keeps the changes when saving fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Failed.'));

    render(
      <EditRepositoryForm
        defaultValues={defaultValues}
        isPending={false}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByLabelText('Name');
    await user.type(nameInput, 'Unsaved name');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(nameInput).toHaveValue('Unsaved name');
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
  });
});
