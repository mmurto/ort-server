/*
 * Copyright (C) 2024 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
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

import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Boxes, Bug, Scale, ShieldQuestion } from 'lucide-react';
import type { ReactNode } from 'react';
import z from 'zod';

import { getOrganizationOptions } from '@/api/@tanstack/react-query.gen';
import { OrganizationFavoriteButton } from '@/components/favorite-button';
import { LoadingIndicator } from '@/components/loading-indicator';
import { PageHeader, SheetSection } from '@/components/page-header';
import { QueryBoundary, QueryErrorFallback } from '@/components/query-boundary';
import { StatisticsCard, StatisticsRow } from '@/components/statistics-card';
import { Skeleton } from '@/components/ui/skeleton';
import { toastError } from '@/lib/toast';
import {
  filterByNameSearchParameterSchema,
  paginationSearchParameterSchema,
} from '@/schemas';
import { OrganizationIssuesStatisticsCard } from './-components/organization-issues-statistics-card';
import { OrganizationPackagesStatisticsCard } from './-components/organization-packages-statistics-card';
import { OrganizationProductTable } from './-components/organization-product-table';
import { OrganizationProductsStatisticsCard } from './-components/organization-products-statistics-card';
import { OrganizationViolationsStatisticsCard } from './-components/organization-violations-statistics-card';
import { OrganizationVulnerabilitiesStatisticsCard } from './-components/organization-vulnerabilities-statistics-card';

type StatisticsFallbackProps = {
  value: ReactNode;
};

const OrganizationProductsStatisticsFallback = ({
  value,
}: StatisticsFallbackProps) => (
  <div className='flex h-8 items-center'>{value}</div>
);

const OrganizationStatisticsFallback = ({ value }: StatisticsFallbackProps) => (
  <StatisticsRow>
    <StatisticsCard
      title='Vulnerabilities'
      icon={() => <ShieldQuestion className='size-3.5' />}
      value={value}
    />
    <StatisticsCard
      title='Issues'
      icon={() => <Bug className='size-3.5' />}
      value={value}
    />
    <StatisticsCard
      title='Rule Violations'
      icon={() => <Scale className='size-3.5' />}
      value={value}
    />
    <StatisticsCard
      title='Packages'
      icon={() => <Boxes className='size-3.5' />}
      value={value}
    />
  </StatisticsRow>
);

const OrganizationComponent = () => {
  const params = Route.useParams();

  const {
    data: organization,
    error: orgError,
    isPending: orgIsPending,
    isError: orgIsError,
  } = useQuery({
    ...getOrganizationOptions({
      path: { organizationId: Number.parseInt(params.orgId) },
    }),
  });

  if (orgIsPending) {
    return <LoadingIndicator />;
  }

  if (orgIsError) {
    toastError('Unable to load data', orgError);
    return;
  }

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title={organization.name}
        adornment={
          <OrganizationFavoriteButton
            organization={organization}
            size='xs'
            variant='ghost'
            className='size-6 p-0'
          />
        }
        description={organization.description}
        actions={
          <QueryBoundary
            fallback={
              <OrganizationProductsStatisticsFallback
                value={<Skeleton className='h-8 w-12' />}
              />
            }
            errorFallback={(props) => (
              <OrganizationProductsStatisticsFallback
                value={<QueryErrorFallback {...props} />}
              />
            )}
            resetKey={`${organization.id}-products`}
          >
            <OrganizationProductsStatisticsCard orgId={params.orgId} />
          </QueryBoundary>
        }
      />
      <QueryBoundary
        fallback={
          <OrganizationStatisticsFallback
            value={<Skeleton className='h-8 w-12' />}
          />
        }
        errorFallback={(props) => (
          <OrganizationStatisticsFallback
            value={<QueryErrorFallback {...props} />}
          />
        )}
        resetKey={`${organization.id}-statistics`}
      >
        <StatisticsRow className='[&>a:hover]:bg-muted/60'>
          <Link
            to='/organizations/$orgId/vulnerabilities'
            params={{
              orgId: params.orgId,
            }}
            search={{
              sortBy: [
                { id: 'rating', desc: true },
                { id: 'repositoriesCount', desc: true },
              ],
            }}
          >
            <OrganizationVulnerabilitiesStatisticsCard
              organizationId={organization.id}
            />
          </Link>
          <OrganizationIssuesStatisticsCard organizationId={organization.id} />
          <OrganizationViolationsStatisticsCard
            organizationId={organization.id}
          />
          <OrganizationPackagesStatisticsCard
            organizationId={organization.id}
          />
        </StatisticsRow>
      </QueryBoundary>
      <SheetSection title='Products'>
        <OrganizationProductTable />
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute('/organizations/$orgId/')({
  validateSearch: z.object({
    ...paginationSearchParameterSchema.shape,
    ...filterByNameSearchParameterSchema.shape,
  }),
  component: OrganizationComponent,
  pendingComponent: LoadingIndicator,
});
