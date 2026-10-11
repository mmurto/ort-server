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

import { describe, expect, it } from 'vitest';

import type { OrtRun } from '@/api';
import { buildRerunPayload } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/rerun-payload';

const ortRun = {
  revision: 'main',
  resolvedRevision: '3f9c2e1aa',
  path: 'sub',
  jobConfigContext: 'ctx',
  environmentConfigPath: 'env.yml',
  labels: { team: 'a' },
  jobConfigs: {
    analyzer: { allowDynamicVersions: false, keepAliveWorker: true },
    ruleSet: 'strict',
  },
} as unknown as OrtRun;

describe('buildRerunPayload', () => {
  it('keeps the configuration of the run', () => {
    const payload = buildRerunPayload(ortRun, 'branch', true);

    expect(payload).toEqual({
      revision: 'main',
      path: 'sub',
      jobConfigContext: 'ctx',
      environmentConfigPath: 'env.yml',
      labels: { team: 'a' },
      jobConfigs: {
        analyzer: { allowDynamicVersions: false, keepAliveWorker: true },
        ruleSet: 'strict',
      },
    });
  });

  it('uses the analyzed commit when asked to', () => {
    expect(buildRerunPayload(ortRun, 'resolved', true).revision).toBe(
      '3f9c2e1aa'
    );
  });

  it('drops keeping workers alive for other users than superusers', () => {
    const payload = buildRerunPayload(ortRun, 'branch', false);

    expect(payload.jobConfigs.analyzer).toEqual({
      allowDynamicVersions: false,
    });
    expect(ortRun.jobConfigs.analyzer?.keepAliveWorker).toBe(true);
  });
});
