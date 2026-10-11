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

import type {
  IssueResolutionReason,
  ResolutionSource,
  RuleViolationResolutionReason,
  VulnerabilityResolutionReason,
} from '@/api/types.gen';
import {
  zIssueResolutionReason,
  zRuleViolationResolutionReason,
  zVulnerabilityResolutionReason,
} from '@/api/zod.gen';
import type { ResolutionItemType } from '@/helpers/resolutions';

type ReasonText = { label: string; description: string };

export type ResolutionReason =
  | IssueResolutionReason
  | RuleViolationResolutionReason
  | VulnerabilityResolutionReason;

export type ResolutionReasonOption = ReasonText & { value: ResolutionReason };

const vulnerabilityReasons: Record<VulnerabilityResolutionReason, ReasonText> =
  {
    CANT_FIX_VULNERABILITY: {
      label: "Can't fix",
      description: 'No fix is available, or it cannot be applied.',
    },
    INEFFECTIVE_VULNERABILITY: {
      label: 'Not exploitable here',
      description: 'The vulnerable code is not used or cannot be reached.',
    },
    INVALID_MATCH_VULNERABILITY: {
      label: 'Wrong match',
      description: 'The advisor matched the wrong package or version.',
    },
    MITIGATED_VULNERABILITY: {
      label: 'Mitigated',
      description:
        'Other measures keep the vulnerability from being exploited.',
    },
    NOT_A_VULNERABILITY: {
      label: 'Not a vulnerability',
      description: 'The report is a false positive.',
    },
    WILL_NOT_FIX_VULNERABILITY: {
      label: "Won't fix",
      description: 'The risk is accepted and will not be fixed.',
    },
    WORKAROUND_FOR_VULNERABILITY: {
      label: 'Workaround in place',
      description: 'A workaround avoids the vulnerable behaviour.',
    },
  };

const ruleViolationReasons: Record<RuleViolationResolutionReason, ReasonText> =
  {
    CANT_FIX_EXCEPTION: {
      label: "Can't fix",
      description: 'The violation cannot be fixed, e.g. no alternative exists.',
    },
    DYNAMIC_LINKAGE_EXCEPTION: {
      label: 'Dynamically linked',
      description: 'The code is linked dynamically, which the license allows.',
    },
    EXAMPLE_OF_EXCEPTION: {
      label: 'Example only',
      description: 'The finding is in example code that is not distributed.',
    },
    LICENSE_ACQUIRED_EXCEPTION: {
      label: 'License acquired',
      description: 'A license for this use has been acquired.',
    },
    NOT_MODIFIED_EXCEPTION: {
      label: 'Not modified',
      description: 'The code is used unmodified, which the license allows.',
    },
    PATENT_GRANT_EXCEPTION: {
      label: 'Patent grant',
      description: 'A patent grant covers this use.',
    },
  };

const issueReasons: Record<IssueResolutionReason, ReasonText> = {
  BUILD_TOOL_ISSUE: {
    label: 'Build tool issue',
    description: 'The issue comes from the build tool, not from the project.',
  },
  CANT_FIX_ISSUE: {
    label: "Can't fix",
    description: 'The issue cannot be fixed, e.g. it is in a third party.',
  },
  SCANNER_ISSUE: {
    label: 'Scanner issue',
    description:
      'The issue comes from the scanner and does not affect results.',
  },
};

const toOptions = <TReason extends ResolutionReason>(
  values: readonly TReason[],
  texts: Record<TReason, ReasonText>
): ResolutionReasonOption[] =>
  values.map((value) => ({ value, ...texts[value] }));

/** The reasons for resolving each kind of item, with plain labels. */
export const resolutionReasonOptions: Record<
  ResolutionItemType,
  ResolutionReasonOption[]
> = {
  vulnerability: toOptions(
    zVulnerabilityResolutionReason.options,
    vulnerabilityReasons
  ),
  'rule-violation': toOptions(
    zRuleViolationResolutionReason.options,
    ruleViolationReasons
  ),
  issue: toOptions(zIssueResolutionReason.options, issueReasons),
};

/** The reason preselected in a new resolution. */
export const defaultResolutionReason: Record<
  ResolutionItemType,
  ResolutionReason
> = {
  vulnerability: 'CANT_FIX_VULNERABILITY',
  'rule-violation': 'CANT_FIX_EXCEPTION',
  issue: 'CANT_FIX_ISSUE',
};

const allReasons: Record<string, ReasonText> = {
  ...vulnerabilityReasons,
  ...ruleViolationReasons,
  ...issueReasons,
};

/** The plain label of a reason; unknown reasons are shown as they are. */
export const getResolutionReasonLabel = (reason: string) =>
  allReasons[reason]?.label ?? reason;

/** Where a resolution is defined, and where to change it if not here. */
export const resolutionSourceNotes: Record<ResolutionSource, string> = {
  SERVER: 'Added in ORT Server.',
  REPOSITORY_FILE: 'Defined in the repository configuration; change it there.',
  GLOBAL_FILE: 'Defined in the global resolutions file; change it there.',
};
