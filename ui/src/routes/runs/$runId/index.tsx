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

import { createFileRoute, redirect } from '@tanstack/react-router';

import { getRun } from '@/api';
import { NotFoundError } from '@/components/not-found-error';
import { PageHeader } from '@/components/page-header';

export const Route = createFileRoute('/runs/$runId/')({
  beforeLoad: async ({ params }) => {
    const { data: ortRun, error } = await getRun({
      path: { runId: Number.parseInt(params.runId) },
    });
    if (error) throw new NotFoundError(params.runId);

    const organizationId = ortRun?.organizationId.toString();
    const productId = ortRun?.productId.toString();
    const repositoryId = ortRun?.repositoryId.toString();
    const index = ortRun?.index.toString();

    if (organizationId && productId && repositoryId && index) {
      throw redirect({
        to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex',
        params: {
          orgId: organizationId,
          productId: productId,
          repoId: repositoryId,
          runIndex: index,
        },
      });
    }
  },
  errorComponent: ({ error }) => {
    if (error instanceof NotFoundError) {
      return (
        <PageHeader
          title='Resource not found'
          description={`There is no run with ID ${error.message}.`}
        />
      );
    }

    throw error;
  },
});
