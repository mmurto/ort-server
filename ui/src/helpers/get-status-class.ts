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

import { JobStatus, OrtRunStatus, Severity, VulnerabilityRating } from '@/api';
import { ItemResolved } from '@/schemas';

// Combine statuses reported either by ORT Runs or the individual jobs within them.
export type Status = JobStatus | OrtRunStatus | undefined;

// There is no vulnerability rating in the OpenApi spec, so define it here.
export const vulnerabilityRatings = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
} as const;

// TailwindCSS classes matching to statuses
//
// Note: all color classes need to be defined as they are here, as they
// are formed in compilation time and cannot be interpolated in runtimet.

const STATUS_BACKGROUND_COLOR: {
  [K in Exclude<Status, undefined>]: string;
} = {
  CREATED: 'bg-neutral-soft text-muted-foreground',
  SCHEDULED: 'bg-input text-foreground',
  RUNNING: 'bg-brand text-brand-foreground',
  ACTIVE: 'bg-brand text-brand-foreground',
  FAILED: 'bg-err text-background',
  FINISHED: 'bg-ok text-background',
  FINISHED_WITH_ISSUES: 'bg-warn text-background',
} as const;

const STATUS_FONT_COLOR: { [K in Exclude<Status, undefined>]: string } = {
  CREATED: 'text-muted-foreground',
  SCHEDULED: 'text-muted-foreground',
  RUNNING: 'text-brand',
  ACTIVE: 'text-brand',
  FAILED: 'text-err',
  FINISHED: 'text-ok',
  FINISHED_WITH_ISSUES: 'text-warn',
} as const;

// Job statuses are drawn as short flat segments of a run's timeline.
const STATUS_CLASS: {
  [K in Exclude<Status, undefined>]: string;
} = {
  CREATED: 'block h-1.5',
  SCHEDULED: 'block h-1.5',
  RUNNING: 'block h-1.5 animate-pulse',
  ACTIVE: 'block h-1.5 animate-pulse',
  FAILED: 'block h-1.5',
  FINISHED: 'block h-1.5',
  FINISHED_WITH_ISSUES: 'block h-1.5',
} as const;

const RULE_VIOLATION_SEVERITY_BG_COLOR: {
  [K in Severity]: string;
} = {
  ERROR: 'bg-err text-background',
  WARNING: 'bg-warn text-background',
  HINT: 'bg-muted-foreground text-background',
} as const;

const ISSUE_SEVERITY_BG_COLOR: {
  [K in Severity]: string;
} = {
  ERROR: 'bg-err text-background',
  WARNING: 'bg-warn text-background',
  HINT: 'bg-muted-foreground text-background',
} as const;

// TailwindCSS class accessor functions
//
// As some TailwindCSS classes need to be returned with an
// accessor function which handles an undefined status specifically,
// access all classes through functions for the sake of consistency
// in code which uses these classes.

// Get the color class for coloring the background of elements
export function getStatusBackgroundColor(status: Status): string {
  if (status === undefined) {
    return 'bg-border text-muted-foreground';
  }
  return STATUS_BACKGROUND_COLOR[status];
}

// Get the color class for font coloring
export function getStatusFontColor(status: Status): string {
  if (status === undefined) {
    return 'text-muted-foreground/60';
  }
  return STATUS_FONT_COLOR[status];
}

// Get the general class for the elements
export function getStatusClass(status: Status): string {
  if (status === undefined) {
    return 'block h-1.5';
  }
  return STATUS_CLASS[status];
}

// Get the color class for coloring the background of vulnerability ratings
export function getVulnerabilityRatingBackgroundColor(
  rating: VulnerabilityRating
): string {
  switch (rating) {
    case 'CRITICAL':
      return 'bg-sev-critical text-background';
    case 'HIGH':
      return 'bg-sev-high text-background';
    case 'MEDIUM':
      return 'bg-sev-medium text-[#16171b]';
    case 'LOW':
      return 'bg-sev-low text-[#16171b]';
    case 'NONE':
    default:
      return 'bg-neutral-soft text-muted-foreground';
  }
}

// Get the color class for coloring the background of rule violation severities
export function getRuleViolationSeverityBackgroundColor(
  severity: Severity
): string {
  return RULE_VIOLATION_SEVERITY_BG_COLOR[severity];
}

// Get the color class for coloring the background of issue severities
export function getIssueSeverityBackgroundColor(severity: Severity): string {
  return ISSUE_SEVERITY_BG_COLOR[severity];
}

// Get the color class for resolved status of items like issues, vulnerabilities, and rule violations.
// Reuse the issue severity background colors for 'Resolved' status.
export function getResolvedBackgroundColor(status: ItemResolved): string {
  return status === 'Resolved'
    ? getIssueSeverityBackgroundColor('HINT')
    : getIssueSeverityBackgroundColor('WARNING');
}

// Get the color class for coloring the background of ecosystems.
// These color classes are defined as follows:
// 1. To avoid clashing with "status indicator colors" (e.g., red for "FAILED")
//    elsewhere in the UI, those TailwindCSS color palettes which are already
//    used for status indicators are excluded, which leaves 15 different color
//    palettes to choose from.
// 2. The package managers are grouped according to the programming languages,
//    with a total of 14 different groups.
// 3. Package managers which belong to the same group are chosen from inside
//    these 14 color palettes in a way that the colors are visually distinct.
export function getEcosystemBackgroundColor(ecosystem: string): string {
  // Ecosystems are set in ink tones by language family, so that no colour that carries a
  // meaning elsewhere (status, severity, job) is spent on them.
  switch (ecosystem) {
    case 'Gradle':
    case 'GradleInspector':
    case 'Maven':
    case 'SBT':
    case 'Tycho':
      return 'bg-foreground';
    case 'Bower':
    case 'NPM':
    case 'PNPM':
    case 'Yarn':
    case 'Yarn2':
      return 'bg-foreground/60';
    case 'PIP':
    case 'Pipenv':
    case 'Poetry':
      return 'bg-foreground/40';
    case 'Bundler':
    case 'Cargo':
    case 'Carthage':
    case 'CocoaPods':
    case 'Composer':
    case 'Conan':
    case 'GoMod':
    case 'Hex':
    case 'NuGet':
    case 'Pub':
    case 'Stack':
    case 'SwiftPM':
      return 'bg-foreground/25';
    default:
      return 'bg-input';
  }
}
