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

import type { JobSummaries } from '@/api';

/** The jobs of an ORT run in pipeline order, with the ORT brand colour of each worker. */
export const RUN_JOBS = [
  { key: 'analyzer', label: 'Analyzer', color: 'var(--analyzer)' },
  { key: 'advisor', label: 'Advisor', color: 'var(--advisor)' },
  { key: 'scanner', label: 'Scanner', color: 'var(--scanner)' },
  { key: 'evaluator', label: 'Evaluator', color: 'var(--evaluator)' },
  { key: 'reporter', label: 'Reporter', color: 'var(--reporter)' },
] as const satisfies readonly {
  key: keyof JobSummaries;
  label: string;
  color: string;
}[];

export type RunJobKey = (typeof RUN_JOBS)[number]['key'];
