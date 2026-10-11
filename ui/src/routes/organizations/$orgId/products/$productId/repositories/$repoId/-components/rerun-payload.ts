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

import type { OrtRun, PostRepositoryRun } from '@/api';

export type RevisionChoice = 'resolved' | 'branch';

/**
 * The request that starts a run with the configuration of an earlier one, on
 * the commit that run analyzed or on the latest commit of its revision.
 */
export const buildRerunPayload = (
  ortRun: OrtRun,
  revisionChoice: RevisionChoice,
  isSuperuser: boolean
): PostRepositoryRun => {
  const jobConfigs = structuredClone(ortRun.jobConfigs);
  // Keeping workers alive is reserved to superusers.
  if (!isSuperuser) {
    for (const job of Object.values(jobConfigs)) {
      if (job && typeof job === 'object' && 'keepAliveWorker' in job) {
        delete (job as { keepAliveWorker?: boolean }).keepAliveWorker;
      }
    }
  }

  return {
    revision:
      revisionChoice === 'resolved' && ortRun.resolvedRevision
        ? ortRun.resolvedRevision
        : ortRun.revision,
    path: ortRun.path,
    jobConfigs,
    jobConfigContext: ortRun.jobConfigContext,
    environmentConfigPath: ortRun.environmentConfigPath,
    labels: ortRun.labels,
  };
};
