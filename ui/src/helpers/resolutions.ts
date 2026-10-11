/*
 * Copyright (C) 2025 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
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

import { Issue, RuleViolation, VulnerabilityWithDetails } from '@/api';

export type ItemWithResolutions =
  Issue | RuleViolation | VulnerabilityWithDetails;

export function isVulnerabilityItem(
  item: ItemWithResolutions
): item is VulnerabilityWithDetails {
  return 'vulnerability' in item;
}

export function isRuleViolationItem(
  item: ItemWithResolutions
): item is RuleViolation {
  return 'rule' in item;
}

export function isIssueItem(item: ItemWithResolutions): item is Issue {
  return 'source' in item && !isRuleViolationItem(item);
}

export function getAppliedVulnerabilityResolutions(
  item: VulnerabilityWithDetails
) {
  return item.resolutions.filter(
    (resolution) => resolution.externalId === item.vulnerability.externalId
  );
}

export function getUnappliedVulnerabilityResolutions(
  item: VulnerabilityWithDetails
) {
  return item.unappliedResolutions.filter(
    (resolution) => resolution.externalId === item.vulnerability.externalId
  );
}

export function hasVulnerabilityResolutionActivity(
  item: VulnerabilityWithDetails
) {
  return (
    getAppliedVulnerabilityResolutions(item).length > 0 ||
    getUnappliedVulnerabilityResolutions(item).length > 0
  );
}

export function getAppliedIssueResolutions(item: Issue, repositoryId?: string) {
  void repositoryId;

  return item.resolutions ?? [];
}

export function getUnappliedIssueResolutions(item: Issue) {
  return (item.unappliedResolutions ?? []).filter(
    (resolution) => resolution.message === item.message
  );
}

export function hasIssueResolutionActivity(item: Issue) {
  return (
    getAppliedIssueResolutions(item).length > 0 ||
    getUnappliedIssueResolutions(item).length > 0
  );
}

export function getAppliedRuleViolationResolutions(item: RuleViolation) {
  return item.resolutions ?? [];
}

export function getUnappliedRuleViolationResolutions(item: RuleViolation) {
  return (item.unappliedResolutions ?? []).filter(
    (resolution) => resolution.message === item.message
  );
}

export function hasRuleViolationResolutionActivity(item: RuleViolation) {
  return (
    getAppliedRuleViolationResolutions(item).length > 0 ||
    getUnappliedRuleViolationResolutions(item).length > 0
  );
}

function hasResolutionActivity(item: ItemWithResolutions) {
  if (isVulnerabilityItem(item)) {
    return hasVulnerabilityResolutionActivity(item);
  }

  if (isRuleViolationItem(item)) {
    return hasRuleViolationResolutionActivity(item);
  }

  if (isIssueItem(item)) {
    return hasIssueResolutionActivity(item);
  }

  return false;
}

export function getResolutionAccordionDefaultValue(item: ItemWithResolutions) {
  if (hasResolutionActivity(item)) return ['resolutions'];

  if (isVulnerabilityItem(item) && (item.firstFixedVersions?.length ?? 0) > 0)
    return ['fixed-versions', 'details'];

  return ['details'];
}

export function getResolutionAccordionLabel(item: ItemWithResolutions) {
  if (isVulnerabilityItem(item)) {
    return 'Resolve vulnerability';
  }

  if (isRuleViolationItem(item)) {
    return 'Resolve rule violation';
  }

  if (isIssueItem(item)) {
    return 'Resolve issue';
  }

  return 'Resolve item';
}

/** The kind of item a resolution is for. */
export type ResolutionItemType = 'issue' | 'rule-violation' | 'vulnerability';

export function getResolutionItemType(
  item: ItemWithResolutions
): ResolutionItemType {
  if (isVulnerabilityItem(item)) return 'vulnerability';
  if (isRuleViolationItem(item)) return 'rule-violation';
  return 'issue';
}

/**
 * What a resolution of the item matches: the external ID of a vulnerability,
 * the message of a rule violation or an issue.
 */
export function getResolutionIdentifier(item: ItemWithResolutions): string {
  return isVulnerabilityItem(item)
    ? item.vulnerability.externalId
    : (item as Issue | RuleViolation).message;
}

function getAppliedResolutions(item: ItemWithResolutions) {
  if (isVulnerabilityItem(item))
    return getAppliedVulnerabilityResolutions(item);
  if (isRuleViolationItem(item))
    return getAppliedRuleViolationResolutions(item);
  return getAppliedIssueResolutions(item);
}

function getUnappliedResolutions(item: ItemWithResolutions) {
  if (isVulnerabilityItem(item))
    return getUnappliedVulnerabilityResolutions(item);
  if (isRuleViolationItem(item))
    return getUnappliedRuleViolationResolutions(item);
  return getUnappliedIssueResolutions(item);
}

/**
 * Whether the item is resolved in this run (`resolved`), only by resolutions
 * that apply to the next run (`pending`), or not at all (`unresolved`). The
 * same for all kinds of items: only resolutions the run applied count as
 * resolved, as for the server's resolved filter.
 */
export type ResolutionState = 'resolved' | 'pending' | 'unresolved';

export function getResolutionState(item: ItemWithResolutions): ResolutionState {
  if (getAppliedResolutions(item).length > 0) return 'resolved';
  if (getUnappliedResolutions(item).length > 0) return 'pending';
  return 'unresolved';
}

/**
 * Whether resolutions of the item were created, changed or deleted after the
 * run, so they only apply to the next run.
 */
export function hasPendingResolutionChanges(item: ItemWithResolutions) {
  return (
    getUnappliedResolutions(item).length > 0 ||
    getAppliedResolutions(item).some((resolution) => resolution.isDeleted)
  );
}

/** Whether the item has a resolution managed in ORT Server. */
export function hasServerResolution(item: ItemWithResolutions) {
  return (
    getAppliedResolutions(item).some(
      (resolution) => resolution.source === 'SERVER' && !resolution.isDeleted
    ) ||
    getUnappliedResolutions(item).some(
      (resolution) => resolution.source === 'SERVER'
    )
  );
}

export function getResolvedStatus(
  item: ItemWithResolutions
): 'Resolved' | 'Unresolved' {
  return getResolutionState(item) === 'resolved' ? 'Resolved' : 'Unresolved';
}
