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

import { VulnerabilityRating } from '@/api';
import { ChartDetailsLink, ChartPanel } from '@/components/charts/chart-panel';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getVulnerabilityRatingBackgroundColor } from '@/helpers/get-status-class';
import { Cvss4MacroVector } from '@/helpers/vulnerability-statistics';

type Cvss4VectorCardProps = { macroVector: Cvss4MacroVector };

export const Cvss4VectorCard = ({ macroVector }: Cvss4VectorCardProps) => {
  const {
    name,
    exploitability,
    complexity,
    vulnerableSystem,
    subsequentSystem,
    exploitation,
    sequrityRequirements,
  } = macroVector;

  return (
    <ChartPanel
      title={
        <>
          CVSS 4.0 Macro Vector (
          <ChartDetailsLink href='https://www.first.org/cvss/v4-0/specification-document' />
          )
        </>
      }
      description='Summary of the vulnerability’s base characteristics in CVSS 4.0 format.'
      actions={
        <Tooltip>
          <TooltipTrigger>
            <span className='cursor-default font-mono text-xs'>{name}</span>
          </TooltipTrigger>
          <TooltipContent>
            The Macro Vector is a representation of a CVSS 4.0 vector with a
            reduced amount of dimensions, used as an intermediate step in the
            calculation of a CVSS 4.0 score.
          </TooltipContent>
        </Tooltip>
      }
    >
      <div className='flex flex-col divide-y border-y text-[0.8125rem]'>
        <div className='flex items-center justify-between py-1.5'>
          <div>Exploitability</div>
          <Badge
            className={getVulnerabilityRatingBackgroundColor(
              exploitability as VulnerabilityRating
            )}
          >
            {exploitability}
          </Badge>
        </div>
        <div className='flex items-center justify-between py-1.5'>
          <div>Complexity</div>
          <Badge
            className={getVulnerabilityRatingBackgroundColor(
              complexity as VulnerabilityRating
            )}
          >
            {complexity}
          </Badge>
        </div>
        <div className='flex items-center justify-between py-1.5'>
          <div>Vulnerable System</div>
          <Badge
            className={getVulnerabilityRatingBackgroundColor(
              vulnerableSystem as VulnerabilityRating
            )}
          >
            {vulnerableSystem}
          </Badge>
        </div>
        <div className='flex items-center justify-between py-1.5'>
          <div>Subsequent System</div>
          <Badge
            className={getVulnerabilityRatingBackgroundColor(
              subsequentSystem as VulnerabilityRating
            )}
          >
            {subsequentSystem}
          </Badge>
        </div>
        <div className='flex items-center justify-between py-1.5'>
          <div>Exploitation</div>
          <Badge
            className={getVulnerabilityRatingBackgroundColor(
              exploitation as VulnerabilityRating
            )}
          >
            {exploitation}
          </Badge>
        </div>
        <div className='flex items-center justify-between py-1.5'>
          <div>Security Requirements</div>
          <Badge
            className={getVulnerabilityRatingBackgroundColor(
              sequrityRequirements as VulnerabilityRating
            )}
          >
            {sequrityRequirements}
          </Badge>
        </div>
      </div>
    </ChartPanel>
  );
};
