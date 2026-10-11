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
import { AxiosError } from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';

import { BulkResolve } from '@/components/resolutions';
import { createIssue } from '../fixtures/resolutions';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/api/sdk.gen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sdk.gen')>()),
  postIssueResolutionForRepository: mocks.post,
}));

vi.mock('@/lib/toast', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/toast')>();
  return {
    ...original,
    toast: {
      ...original.toast,
      info: mocks.toastInfo,
      error: mocks.toastError,
    },
  };
});

const items = [
  createIssue({
    message: 'First issue',
    resolutions: [],
    unappliedResolutions: [],
  }),
  createIssue({
    message: 'Second issue',
    resolutions: [],
    unappliedResolutions: [],
  }),
  createIssue({
    message: 'Resolved issue',
    resolutions: [
      {
        message: 'Resolved issue',
        messageHash: 'hash',
        reason: 'CANT_FIX_ISSUE',
        comment: '',
        source: 'SERVER',
        isDeleted: false,
      },
    ],
    unappliedResolutions: [],
  }),
  createIssue({
    message: 'Third issue',
    resolutions: [],
    unappliedResolutions: [],
  }),
];

const renderBulkResolve = (onDone = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <BulkResolve
        items={items}
        itemType='issue'
        repositoryId='3'
        runId={42}
        onDone={onDone}
      />
    </QueryClientProvider>
  );
  return { user: userEvent.setup(), onDone };
};

beforeEach(() => {
  vi.clearAllMocks();
});

it('resolves the items one after the other with progress, skipping resolved ones', async () => {
  const pending: (() => void)[] = [];
  mocks.post.mockImplementation(
    () =>
      new Promise((resolve) => {
        pending.push(() => resolve({ data: undefined }));
      })
  );
  const { user, onDone } = renderBulkResolve();

  await user.click(screen.getByRole('button', { name: 'Resolve…' }));
  const dialog = screen.getByRole('dialog', { name: 'Resolve 4 issues' });
  expect(dialog).toHaveTextContent(
    '1 issue already has a resolution in ORT Server and is skipped.'
  );

  await user.click(
    within(dialog).getByRole('radio', { name: 'Scanner issue' })
  );
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Comment' }),
    'Flaky'
  );
  await user.click(
    within(dialog).getByRole('button', { name: 'Resolve 3 issues' })
  );

  expect(await within(dialog).findByRole('status')).toHaveTextContent(
    'Resolving 1 of 3…'
  );
  // Only one call runs at a time.
  expect(mocks.post).toHaveBeenCalledOnce();
  pending.shift()!();
  await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
  expect(within(dialog).getByRole('status')).toHaveTextContent(
    'Resolving 2 of 3…'
  );
  pending.shift()!();
  await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(3));
  pending.shift()!();

  await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(mocks.toastInfo).toHaveBeenCalledWith(
    'Resolved 3 issues',
    expect.anything()
  );
  expect(mocks.post.mock.calls.map(([options]) => options.body)).toEqual(
    ['First issue', 'Second issue', 'Third issue'].map((message) => ({
      message,
      reason: 'SCANNER_ISSUE',
      comment: 'Flaky',
    }))
  );
});

it('lists the items that could not be resolved', async () => {
  mocks.post
    .mockResolvedValueOnce({ data: undefined })
    .mockRejectedValueOnce(new AxiosError('Request failed'))
    .mockResolvedValueOnce({ data: undefined });
  const { user, onDone } = renderBulkResolve();

  await user.click(screen.getByRole('button', { name: 'Resolve…' }));
  const dialog = screen.getByRole('dialog');
  await user.click(
    within(dialog).getByRole('button', { name: 'Resolve 3 issues' })
  );

  const failures = await within(dialog).findByRole('list', {
    name: 'Failed items',
  });
  expect(dialog).toHaveTextContent('Resolved 2 of 3.');
  expect(within(failures).getAllByRole('listitem')).toHaveLength(1);
  expect(failures).toHaveTextContent('Second issue');
  expect(failures).toHaveTextContent('Request failed');
  expect(mocks.toastError).toHaveBeenCalledWith(
    '1 issue could not be resolved',
    expect.anything()
  );
  expect(onDone).not.toHaveBeenCalled();

  await user.click(within(dialog).getByRole('button', { name: 'Done' }));
  expect(onDone).toHaveBeenCalledOnce();
});
