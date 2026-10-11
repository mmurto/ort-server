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

import {
  hasPendingResolutionChanges,
  ItemWithResolutions,
} from '@/helpers/resolutions';
import { useRepositoryPermission } from '@/hooks/use-authorization';
import { RerunButton } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/rerun-button';

type RunParams = {
  orgId: string;
  productId: string;
  repoId: string;
  runIndex: string;
};

/** Reruns the run, on the same commit if possible, to apply the changes. */
function PendingRerun({ orgId, productId, repoId, runIndex }: RunParams) {
  const { isAllowed: canTriggerRun } = useRepositoryPermission(
    Number.parseInt(repoId),
    'TRIGGER_ORT_RUN'
  );

  return (
    <RerunButton
      orgId={orgId}
      productId={productId}
      repoId={repoId}
      runIndex={Number.parseInt(runIndex)}
      canTriggerRun={canTriggerRun}
      defaultRevision='resolved'
    />
  );
}

/**
 * Says that resolutions of the shown items were created, changed or deleted
 * after the run, so they only apply to the next run, and offers to start it.
 * Shows nothing without such changes.
 */
export function PendingResolutionsBanner({
  items,
  run,
}: {
  items: ItemWithResolutions[];
  /** The run whose findings are shown, offered for a rerun. */
  run: RunParams;
}) {
  if (!items.some(hasPendingResolutionChanges)) return null;

  return (
    <div
      role='status'
      className='border-warn/40 bg-warn-soft flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-sm border px-3 py-2 text-[0.8125rem]'
    >
      <p>
        <span className='font-medium'>Resolution changes are pending.</span>{' '}
        They apply to the next run.
      </p>
      <PendingRerun {...run} />
    </div>
  );
}
