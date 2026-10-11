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

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type Search = Record<string, unknown>;

type State = {
  /** The last search parameters of each page of a run, by the page's path. */
  searchByPath: Record<string, Search>;
};

type Actions = {
  rememberSearch: (path: string, search: Search) => void;
};

/**
 * The search parameters that open the details of a finding. Going back to a
 * page keeps its filters, sorting and paging, but not the open details.
 */
const DETAILS_SEARCH_PARAMETERS = new Set([
  'marked',
  'packageMarked',
  'licenseTables',
]);

/** A path without its trailing slash, so both spellings of a page match. */
export const normalizeRunPagePath = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, '') : path;

/** The search parameters worth remembering, without the open details. */
export const withoutDetailsSearch = (search: Search): Search =>
  Object.fromEntries(
    Object.entries(search).filter(
      ([key, value]) => !DETAILS_SEARCH_PARAMETERS.has(key) && value != null
    )
  );

/**
 * Remembers the filters, sorting and paging of the pages of a run for the
 * browser tab, so the links of the run rail return to them instead of to the
 * defaults of the pages.
 */
export const useRunPageSearchStore = create<State & Actions>()(
  persist(
    (set) => ({
      searchByPath: {},
      rememberSearch: (path, search) =>
        set((state) => ({
          searchByPath: {
            ...state.searchByPath,
            [normalizeRunPagePath(path)]: withoutDetailsSearch(search),
          },
        })),
    }),
    {
      name: 'run-page-search',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

/** The remembered search parameters of a page, if it was visited. */
export const getRememberedSearch = (
  searchByPath: Record<string, Search>,
  path: string
): Search | undefined => {
  const key = normalizeRunPagePath(path);

  return Object.hasOwn(searchByPath, key) ? searchByPath[key] : undefined;
};
