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

import { createFileRoute } from '@tanstack/react-router';

import { PageHeader, SheetSection } from '@/components/page-header';

const Authorization = () => {
  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Authorization'
        description='How access to organizations, products and repositories is granted'
      />
      <SheetSection title='Roles'>
        <div className='flex max-w-[75ch] flex-col gap-2 text-[0.8125rem]'>
          <p>
            Organizations, products, and repositories have reader, writer, and
            admin roles.
          </p>
          <p>
            To give a user access to an organization, product, or repository,
            browse to it and assign the appropriate role in its "Users" section.
          </p>
        </div>
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute('/admin/users/authorization/')({
  component: Authorization,
});
