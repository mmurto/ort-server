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

import { useEffect } from 'react';

import type { VulnerabilityRating, VulnerabilityWithDetails } from '@/api';
import { getRunVulnerabilitiesInfiniteOptions } from '@/api/@tanstack/react-query.gen';
import { zVulnerabilityRating } from '@/api/zod.gen';
import { identifierToString } from '@/helpers/identifier-conversion';
import { useInfiniteList } from '@/hooks/use-infinite-list';

/** The vulnerabilities of a package in a run. */
export type PackageVulnerabilities = {
  count: number;
  /** The highest rating of the vulnerabilities. */
  rating: VulnerabilityRating;
};

/** The largest page the API returns. */
const VULNERABILITIES_PAGE_SIZE = 100;

const ratingRank = (rating: VulnerabilityRating) =>
  zVulnerabilityRating.options.indexOf(rating);

/** Groups vulnerabilities by their package, keyed by the package's ORT ID. */
export const groupVulnerabilitiesByPackage = (
  vulnerabilities: Pick<VulnerabilityWithDetails, 'identifier' | 'rating'>[]
) => {
  const byPackage = new Map<string, PackageVulnerabilities>();

  for (const { identifier, rating } of vulnerabilities) {
    const id = identifierToString(identifier);
    const current = byPackage.get(id);
    byPackage.set(id, {
      count: (current?.count ?? 0) + 1,
      rating:
        current && ratingRank(current.rating) >= ratingRank(rating)
          ? current.rating
          : rating,
    });
  }

  return byPackage;
};

/**
 * Loads all vulnerabilities of a run, page by page, and groups them by their
 * package.
 */
export const usePackageVulnerabilities = (runId: number, enabled: boolean) => {
  const list = useInfiniteList(
    getRunVulnerabilitiesInfiniteOptions({
      path: { runId },
      query: { limit: VULNERABILITIES_PAGE_SIZE },
    }),
    { enabled }
  );
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return groupVulnerabilitiesByPackage(list.items);
};
