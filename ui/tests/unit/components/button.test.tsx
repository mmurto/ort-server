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

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('marks a disabled slotted link as disabled without passing disabled to it', () => {
    render(
      <Button asChild disabled>
        <a href='/create'>Create</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Create' });

    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(link).toHaveAttribute('data-disabled');
    expect(link).not.toHaveAttribute('disabled');
    expect(link.className).toContain('aria-disabled:pointer-events-none');
    expect(link.className).toContain('aria-disabled:opacity-50');
  });

  it('prevents navigation from a disabled slotted link', () => {
    const onClick = vi.fn();
    render(
      <Button asChild disabled onClick={onClick}>
        <a href='/create'>Create</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Create' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(link, event);

    expect(event.defaultPrevented).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('leaves an enabled slotted link untouched', () => {
    render(
      <Button asChild>
        <a href='/create'>Create</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Create' });

    expect(link).not.toHaveAttribute('aria-disabled');
    expect(link).not.toHaveAttribute('tabindex');
  });

  it('keeps the native disabled attribute on a plain button', () => {
    render(<Button disabled>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
