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

import { Link } from '@tanstack/react-router';

import type { DependencyGraph } from '@/api';
import { getVulnerabilityRatingBackgroundColor } from '@/helpers/get-status-class';
import { identifierToString } from '@/helpers/identifier-conversion';
import { cn } from '@/lib/utils';
import { packageIdTypeSchema, type PackageIdType } from '@/schemas';
import type { PackageVulnerabilities } from './package-vulnerabilities';

/** A mark for a package with vulnerabilities, coloured by the highest rating. */
export const PackageVulnerabilityMark = ({
  vulnerabilities,
}: {
  vulnerabilities: PackageVulnerabilities;
}) => {
  const label = `${vulnerabilities.count} ${
    vulnerabilities.count === 1 ? 'vulnerability' : 'vulnerabilities'
  }, highest rating ${vulnerabilities.rating.toLowerCase()}`;

  return (
    <span
      role='img'
      aria-label={label}
      title={label}
      className='mt-[5px] flex shrink-0 items-center'
    >
      <span
        className={cn(
          'size-2',
          getVulnerabilityRatingBackgroundColor(vulnerabilities.rating)
        )}
      />
    </span>
  );
};

/**
 * What follows a package in the dependency tree: a mark when the package has
 * vulnerabilities in the run, and a link to its details in the packages table.
 */
export const PackageNodeExtras = ({
  graph,
  packageIndex,
  packageIdType,
  vulnerabilities,
  params,
}: {
  graph: DependencyGraph;
  packageIndex: number;
  packageIdType: PackageIdType;
  vulnerabilities: PackageVulnerabilities | undefined;
  params: {
    orgId: string;
    productId: string;
    repoId: string;
    runIndex: string;
  };
}) => {
  const purl = graph.purls[packageIndex] as string | null | undefined;
  const usePurl = packageIdType === packageIdTypeSchema.enum.PURL && !!purl;
  const id = usePurl ? purl : identifierToString(graph.packages[packageIndex]);

  return (
    <div className='flex shrink-0 items-start gap-2'>
      {vulnerabilities && (
        <PackageVulnerabilityMark vulnerabilities={vulnerabilities} />
      )}
      <Link
        className='link text-muted-foreground text-xs whitespace-nowrap'
        to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/packages'
        params={params}
        search={{
          pkgId: id,
          pkgIdType: usePurl
            ? packageIdTypeSchema.enum.PURL
            : packageIdTypeSchema.enum.ORT_ID,
          marked: '0',
        }}
        aria-label={`Package details of ${id}`}
      >
        Package details
      </Link>
    </div>
  );
};
