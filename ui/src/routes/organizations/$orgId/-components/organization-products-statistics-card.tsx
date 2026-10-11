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

import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import { getOrganizationProductsOptions } from '@/api/@tanstack/react-query.gen';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOrganizationPermission } from '@/hooks/use-authorization';
import { cn } from '@/lib/utils';

type OrganizationProductsStatisticsCardProps = {
  orgId: string;
  className?: string;
};

export const OrganizationProductsStatisticsCard = ({
  orgId,
  className,
}: OrganizationProductsStatisticsCardProps) => {
  const { isAllowed: canCreateProduct } = useOrganizationPermission(
    Number.parseInt(orgId),
    'CREATE_PRODUCT'
  );

  const { data } = useSuspenseQuery({
    ...getOrganizationProductsOptions({
      path: { organizationId: Number.parseInt(orgId) },
      query: { limit: 1 },
    }),
  });

  const total = data.pagination.totalCount;

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <span className='text-muted-foreground text-[0.8125rem]'>
        <span className='text-foreground font-medium'>{total}</span> products
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            size='sm'
            className='gap-1.5'
            disabled={canCreateProduct === false}
          >
            <Link
              to='/organizations/$orgId/create-product'
              params={{
                orgId: orgId,
              }}
            >
              Add product
              <PlusIcon className='h-4 w-4' />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {canCreateProduct !== false
            ? 'Add a product to this organization'
            : 'Insufficient permissions.'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
