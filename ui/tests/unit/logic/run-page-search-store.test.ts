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

import { beforeEach, describe, expect, it } from 'vitest';

import {
  getRememberedSearch,
  normalizeRunPagePath,
  useRunPageSearchStore,
  withoutDetailsSearch,
} from '@/store/run-page-search.store';

const page =
  '/organizations/1/products/2/repositories/3/runs/4/vulnerabilities';

beforeEach(() => {
  useRunPageSearchStore.setState({ searchByPath: {} });
  sessionStorage.clear();
});

describe('run page search store', () => {
  it('remembers the search of a page without the open details', () => {
    useRunPageSearchStore.getState().rememberSearch(page, {
      rating: ['HIGH'],
      page: 2,
      marked: '3',
      packageMarked: 'Maven:a:b:1',
      licenseTables: { MIT: {} },
      pkgId: undefined,
    });

    expect(
      getRememberedSearch(useRunPageSearchStore.getState().searchByPath, page)
    ).toEqual({ rating: ['HIGH'], page: 2 });
  });

  it('matches a page with and without a trailing slash', () => {
    useRunPageSearchStore.getState().rememberSearch(`${page}/`, { page: 3 });

    expect(normalizeRunPagePath(`${page}/`)).toBe(page);
    expect(
      getRememberedSearch(useRunPageSearchStore.getState().searchByPath, page)
    ).toEqual({ page: 3 });
  });

  it('keeps an emptied search apart from a page that was never visited', () => {
    useRunPageSearchStore.getState().rememberSearch(page, {});
    const { searchByPath } = useRunPageSearchStore.getState();

    expect(getRememberedSearch(searchByPath, page)).toEqual({});
    expect(getRememberedSearch(searchByPath, `${page}-other`)).toBeUndefined();
    expect(getRememberedSearch(searchByPath, 'constructor')).toBeUndefined();
  });

  it('keeps the searches for the browser tab only', () => {
    useRunPageSearchStore.getState().rememberSearch(page, { page: 2 });

    expect(sessionStorage.getItem('run-page-search')).toContain(page);
    expect(localStorage.getItem('run-page-search')).toBeNull();
  });

  it('drops empty values', () => {
    expect(withoutDetailsSearch({ a: null, b: undefined, c: 0 })).toEqual({
      c: 0,
    });
  });
});
