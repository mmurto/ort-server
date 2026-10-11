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
import { createFileRoute } from '@tanstack/react-router';

import { getServerSettingByKeyOptions } from '@/api/@tanstack/react-query.gen';
import { PageHeader } from '@/components/page-header';
import { useUser } from '@/hooks/use-user';
import { useHomeFavorites, useHomeRecentRuns } from '@/providers/home-data';
import { HomeFavoritesSection } from './-components/home-favorites-section';
import {
  HomeOrganizationsList,
  HomeOrganizationsSection,
} from './-components/home-organizations-section';
import { HomeRecentRunsSection } from './-components/home-recent-runs-section';

const PRODUCT_NAME = 'ORT Server';

const HomePage = () => {
  const favorites = useHomeFavorites();
  const recentRuns = useHomeRecentRuns();
  const isNew = favorites.length === 0 && recentRuns.length === 0;
  const user = useUser();
  const userDisplayName =
    user.fullName || user.username || user.user?.profile.email;
  const { data: dbProductName } = useQuery({
    ...getServerSettingByKeyOptions({ path: { key: 'MAIN_PRODUCT_NAME' } }),
  });
  const productName =
    dbProductName?.value && dbProductName.isEnabled
      ? dbProductName.value
      : PRODUCT_NAME;

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title={`Welcome to ${productName}${userDisplayName ? `, ${userDisplayName}` : ''}!`}
        description='Your favorites and the runs you started recently. Both are kept in this browser only.'
        actions={<HomeOrganizationsSection />}
      />
      {/* Before anything is starred or started here, the organizations lead the way in. */}
      {isNew && <HomeOrganizationsList />}
      <div className='grid gap-x-12 gap-y-10 xl:grid-cols-2'>
        <HomeFavoritesSection favorites={favorites} />
        <HomeRecentRunsSection recentRuns={recentRuns} />
      </div>
      {!isNew && <HomeOrganizationsList />}
    </div>
  );
};

export const Route = createFileRoute('/')({
  component: HomePage,
});
