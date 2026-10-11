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

import { describe, expect, it } from 'vitest';

import {
  getResolutionReasonLabel,
  resolutionReasonOptions,
} from '@/components/resolutions/reasons';
import {
  getAppliedIssueResolutions,
  getResolutionAccordionDefaultValue,
  getResolutionAccordionLabel,
  getResolutionState,
  getResolvedStatus,
  hasPendingResolutionChanges,
  hasServerResolution,
} from '@/helpers/resolutions';
import {
  createIssue,
  createRuleViolation,
  createVulnerability,
} from '../fixtures/resolutions';

it('getAppliedIssueResolutions returns applied server issue resolutions without re-filtering by message', () => {
  const issue = createIssue({
    message: 'Rendered issue message',
    resolutions: [
      {
        message:
          'Persisted server resolution message that does not equal the rendered message',
        messageHash: 'abc123',
        reason: 'BUILD_TOOL_ISSUE',
        comment: 'Persisted after rerun',
        source: 'SERVER',
        isDeleted: false,
      },
    ],
  });

  expect(getAppliedIssueResolutions(issue)).toStrictEqual(
    issue.resolutions ?? []
  );
});

it('getResolutionAccordionDefaultValue expands details by default when a rule violation has no resolution activity', () => {
  const ruleViolation = createRuleViolation({
    resolutions: [],
    unappliedResolutions: [],
  });

  expect(getResolutionAccordionDefaultValue(ruleViolation)).toStrictEqual([
    'details',
  ]);
});

it('getResolutionAccordionDefaultValue expands resolutions by default when an issue has pending resolutions', () => {
  const issue = createIssue({
    message: 'Rendered issue message',
    resolutions: [],
    unappliedResolutions: [
      {
        message: 'Rendered issue message',
        reason: 'BUILD_TOOL_ISSUE',
        comment: 'Pending until rerun',
        source: 'SERVER',
      },
    ],
  });

  expect(getResolutionAccordionDefaultValue(issue)).toStrictEqual([
    'resolutions',
  ]);
});

it('getResolutionAccordionLabel returns an item-specific label', () => {
  const issue = createIssue();
  const ruleViolation = createRuleViolation();
  const vulnerability = createVulnerability();

  expect(getResolutionAccordionLabel(issue)).toBe('Resolve issue');
  expect(getResolutionAccordionLabel(ruleViolation)).toBe(
    'Resolve rule violation'
  );
  expect(getResolutionAccordionLabel(vulnerability)).toBe(
    'Resolve vulnerability'
  );
});

describe('resolution state', () => {
  const pendingIssue = createIssue({
    message: 'Issue message',
    resolutions: [],
    unappliedResolutions: [
      {
        message: 'Issue message',
        reason: 'CANT_FIX_ISSUE',
        comment: '',
        source: 'SERVER',
      },
    ],
  });
  const pendingVulnerability = createVulnerability({
    resolutions: [],
    unappliedResolutions: [
      {
        externalId: 'CVE-0000-0000',
        reason: 'CANT_FIX_VULNERABILITY',
        comment: '',
        source: 'SERVER',
      },
    ],
  });
  const appliedRuleViolation = createRuleViolation({
    resolutions: [
      {
        message: 'Rule violation message',
        reason: 'CANT_FIX_EXCEPTION',
        comment: '',
        source: 'REPOSITORY_FILE',
        isDeleted: false,
      },
    ],
    unappliedResolutions: [],
  });

  it('counts only applied resolutions as resolved, for every kind of item', () => {
    expect(getResolutionState(pendingIssue)).toBe('pending');
    expect(getResolvedStatus(pendingIssue)).toBe('Unresolved');
    expect(getResolutionState(pendingVulnerability)).toBe('pending');
    expect(getResolvedStatus(pendingVulnerability)).toBe('Unresolved');
    expect(getResolutionState(appliedRuleViolation)).toBe('resolved');
    expect(getResolvedStatus(appliedRuleViolation)).toBe('Resolved');
    expect(
      getResolutionState(
        createRuleViolation({ resolutions: [], unappliedResolutions: [] })
      )
    ).toBe('unresolved');
  });

  it('finds pending changes and server resolutions', () => {
    expect(hasPendingResolutionChanges(pendingIssue)).toBe(true);
    expect(hasPendingResolutionChanges(appliedRuleViolation)).toBe(false);
    expect(hasServerResolution(pendingVulnerability)).toBe(true);
    expect(hasServerResolution(appliedRuleViolation)).toBe(false);
  });

  it('labels the reasons in plain words', () => {
    expect(getResolutionReasonLabel('NOT_A_VULNERABILITY')).toBe(
      'Not a vulnerability'
    );
    expect(getResolutionReasonLabel('UNKNOWN_REASON')).toBe('UNKNOWN_REASON');
    for (const options of Object.values(resolutionReasonOptions)) {
      for (const option of options) {
        expect(option.label).not.toMatch(/_/);
        expect(option.description).not.toBe('');
      }
    }
  });
});
