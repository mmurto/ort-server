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

import type { Jobs } from '@/api';
import {
  getJobDuration,
  getLogStepNames,
  getLogSteps,
  LOG_LEVELS,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/logs/-components/log-steps';

const job = (status: 'FINISHED' | 'RUNNING' | 'CREATED', minutes?: number) => ({
  status,
  startedAt: status === 'CREATED' ? null : '2026-01-01T10:00:00Z',
  finishedAt:
    minutes === undefined
      ? null
      : new Date(
          Date.parse('2026-01-01T10:00:00Z') + minutes * 60_000
        ).toISOString(),
});

const jobs = {
  analyzer: job('FINISHED', 2),
  scanner: job('RUNNING'),
  advisor: job('CREATED'),
  notifier: job('FINISHED', 1),
} as unknown as Jobs;

describe('getLogSteps', () => {
  it('lists the configuration step and the jobs of the run in pipeline order', () => {
    expect(getLogSteps(jobs).map((step) => step.label)).toEqual([
      'Configuration',
      'Analyzer',
      'Advisor',
      'Scanner',
      'Notifier',
    ]);
    expect(getLogSteps(jobs)[0]!.job).toBeUndefined();
  });
});

describe('getLogStepNames', () => {
  it('requests the jobs of the run and the configuration step', () => {
    expect(getLogStepNames(jobs)).toEqual([
      'analyzer',
      'scanner',
      'advisor',
      'notifier',
      'config',
    ]);
  });
});

describe('getJobDuration', () => {
  const now = Date.parse('2026-01-01T10:05:00Z');

  it('measures finished jobs until they finished', () => {
    expect(getJobDuration(jobs.analyzer!, now)).toBe(120_000);
  });

  it('measures running jobs until now', () => {
    expect(getJobDuration(jobs.scanner!, now)).toBe(300_000);
  });

  it('has no duration before a job started', () => {
    expect(getJobDuration(jobs.advisor!, now)).toBeUndefined();
  });
});

describe('LOG_LEVELS', () => {
  it('offers the levels from the least to the most detail', () => {
    expect(LOG_LEVELS.map(({ level }) => level)).toEqual([
      'ERROR',
      'WARN',
      'INFO',
      'DEBUG',
    ]);
  });
});
