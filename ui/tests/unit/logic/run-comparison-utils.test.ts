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

import {
  compareRunStatistics,
  countChangeClassName,
  describeCountChange,
  formatCountDelta,
  getCountChange,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components/run-comparison-utils';

describe('formatCountDelta', () => {
  it('signs increases, decreases and no change', () => {
    expect(formatCountDelta(3)).toBe('+3');
    expect(formatCountDelta(-2)).toBe('−2');
    expect(formatCountDelta(0)).toBe('±0');
  });
});

describe('getCountChange', () => {
  it('marks more problems as worse and fewer as better', () => {
    expect(getCountChange(4, 7)).toEqual({
      delta: 3,
      text: '+3',
      tone: 'worse',
    });
    expect(getCountChange(7, 5)).toMatchObject({ delta: -2, tone: 'better' });
    expect(getCountChange(5, 5)).toMatchObject({ delta: 0, tone: 'neutral' });
  });

  it('passes no judgement on counts that are not problems', () => {
    expect(getCountChange(10, 12, false)).toMatchObject({
      delta: 2,
      tone: 'neutral',
    });
  });

  it('has no change when a count is unknown', () => {
    expect(getCountChange(undefined, 3)).toBeUndefined();
    expect(getCountChange(3, null)).toBeUndefined();
  });
});

describe('describeCountChange', () => {
  it('describes the change against the earlier run', () => {
    expect(describeCountChange(getCountChange(1, 4)!, 4)).toBe(
      '3 more than run 4'
    );
    expect(describeCountChange(getCountChange(4, 2)!, 4)).toBe(
      '2 fewer than run 4'
    );
    expect(describeCountChange(getCountChange(2, 2)!, 4)).toBe('Same as run 4');
  });
});

describe('countChangeClassName', () => {
  it('uses the state tokens', () => {
    expect(countChangeClassName(getCountChange(1, 2)!)).toBe('text-err');
    expect(countChangeClassName(getCountChange(2, 1)!)).toBe('text-ok');
    expect(countChangeClassName(getCountChange(2, 2)!)).toBe(
      'text-muted-foreground'
    );
  });
});

describe('compareRunStatistics', () => {
  it('compares each category of two runs', () => {
    const rows = compareRunStatistics(
      {
        issuesCount: 2,
        vulnerabilitiesCount: 5,
        ruleViolationsCount: 1,
        packagesCount: 40,
      },
      {
        issuesCount: 3,
        vulnerabilitiesCount: 1,
        ruleViolationsCount: null,
        packagesCount: 41,
      }
    );

    expect(rows.map((row) => row.label)).toEqual([
      'Issues',
      'Vulnerabilities',
      'Rule violations',
      'Packages',
    ]);
    expect(rows[0]).toMatchObject({
      before: 2,
      after: 3,
      change: { text: '+1', tone: 'worse' },
    });
    expect(rows[1]!.change).toMatchObject({ delta: -4, tone: 'better' });
    expect(rows[2]).toMatchObject({
      before: 1,
      after: null,
      change: undefined,
    });
    expect(rows[3]!.change).toMatchObject({ delta: 1, tone: 'neutral' });
  });

  it('has no counts for missing statistics', () => {
    expect(compareRunStatistics(undefined, undefined)[0]).toMatchObject({
      before: undefined,
      after: undefined,
      change: undefined,
    });
  });
});
