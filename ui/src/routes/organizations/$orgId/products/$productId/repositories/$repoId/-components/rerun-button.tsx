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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Loader2, Repeat } from 'lucide-react';
import { useState } from 'react';

import {
  getOrganizationOptions,
  getProductOptions,
  getRepositoryOptions,
  getRepositoryRunOptions,
  postRepositoryRunMutation,
} from '@/api/@tanstack/react-query.gen';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUser } from '@/hooks/use-user';
import { ApiError } from '@/lib/api-error';
import { runCreated } from '@/lib/entity-cache';
import { toast, toastError } from '@/lib/toast';
import { buildRecentRun, useHomeRecentRunActions } from '@/providers/home-data';
import { buildRerunPayload, type RevisionChoice } from './rerun-payload';

type RerunButtonProps = {
  orgId: string;
  productId: string;
  repoId: string;
  runIndex: number;
  /** Whether the user may start runs; `undefined` while it is not known. */
  canTriggerRun: boolean | undefined;
  /** A labelled button, or an icon button for dense rows. */
  compact?: boolean;
  /**
   * The revision offered first: the latest commit of the run's revision, or
   * the commit the run analyzed, e.g. to apply new resolutions.
   */
  defaultRevision?: RevisionChoice;
};

/**
 * Starts a run with the configuration of an earlier one after one
 * confirmation, and leads to the form for changing the configuration first.
 */
export const RerunButton = ({
  orgId,
  productId,
  repoId,
  runIndex,
  canTriggerRun,
  compact = false,
  defaultRevision = 'branch',
}: RerunButtonProps) => {
  const [open, setOpen] = useState(false);
  const [revisionChoice, setRevisionChoice] =
    useState<RevisionChoice>(defaultRevision);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSuperuser = useUser().isSuperuser === true;
  const { recordRecentRun } = useHomeRecentRunActions();
  const repositoryId = Number.parseInt(repoId);

  const { data: ortRun, isPending: runIsPending } = useQuery({
    ...getRepositoryRunOptions({
      path: { repositoryId, ortRunIndex: runIndex },
    }),
    enabled: open,
  });
  const { data: organization } = useQuery({
    ...getOrganizationOptions({
      path: { organizationId: Number.parseInt(orgId) },
    }),
    enabled: open,
  });
  const { data: product } = useQuery({
    ...getProductOptions({ path: { productId: Number.parseInt(productId) } }),
    enabled: open,
  });
  const { data: repository } = useQuery({
    ...getRepositoryOptions({ path: { repositoryId } }),
    enabled: open,
  });

  const { mutate, isPending } = useMutation({
    ...postRepositoryRunMutation(),
    onSuccess(response) {
      if (organization && product && repository) {
        recordRecentRun(
          buildRecentRun(organization, product, repository, response)
        );
      }
      toast.info(`Run ${response.index} started`, {
        description: `With the configuration of run ${runIndex}.`,
      });
      runCreated(queryClient, response.repositoryId);
      setOpen(false);
      void navigate({
        to: '/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex',
        params: {
          orgId,
          productId,
          repoId,
          runIndex: response.index.toString(),
        },
      });
    },
    onError(error: ApiError) {
      toastError('Could not start the run', error);
    },
  });

  const resolvedRevision = ortRun?.resolvedRevision;
  const hasResolvedRevision =
    !!resolvedRevision && resolvedRevision !== ortRun.revision;

  const trigger = compact ? (
    <Button
      variant='outline'
      size='icon'
      disabled={canTriggerRun === false}
      aria-label={`Rerun run ${runIndex}`}
    >
      <Repeat />
    </Button>
  ) : (
    <Button disabled={canTriggerRun === false}>
      <Repeat />
      Rerun
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className='inline-flex'
            tabIndex={canTriggerRun === false ? 0 : undefined}
          >
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {canTriggerRun === false
            ? 'Insufficient permissions.'
            : `Start a new run with the configuration of run ${runIndex}`}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align='end' className='flex w-80 flex-col gap-3'>
        <div className='flex flex-col gap-1'>
          <div className='text-[0.9375rem] font-semibold'>
            Rerun run {runIndex}
          </div>
          <p className='text-muted-foreground text-[0.8125rem]'>
            Starts a new run with the same configuration.
          </p>
        </div>
        {runIsPending ? (
          <div className='text-muted-foreground flex items-center gap-2 text-[0.8125rem]'>
            <Loader2 className='size-3.5 animate-spin' />
            Loading the configuration…
          </div>
        ) : ortRun ? (
          <RadioGroup
            value={hasResolvedRevision ? revisionChoice : 'branch'}
            onValueChange={(value) =>
              setRevisionChoice(value as RevisionChoice)
            }
            aria-label='Revision'
            className='gap-2'
          >
            <div className='flex items-start gap-2'>
              <RadioGroupItem value='branch' id={`rerun-${runIndex}-branch`} />
              <Label
                htmlFor={`rerun-${runIndex}-branch`}
                className='flex flex-col items-start gap-0.5 font-normal'
              >
                <span>
                  Latest of{' '}
                  <span className='font-mono text-xs'>{ortRun.revision}</span>
                </span>
                <span className='text-muted-foreground text-xs'>
                  Includes changes made since run {runIndex}.
                </span>
              </Label>
            </div>
            {hasResolvedRevision && (
              <div className='flex items-start gap-2'>
                <RadioGroupItem
                  value='resolved'
                  id={`rerun-${runIndex}-resolved`}
                />
                <Label
                  htmlFor={`rerun-${runIndex}-resolved`}
                  className='flex flex-col items-start gap-0.5 font-normal'
                >
                  <span>
                    The same commit{' '}
                    <span className='font-mono text-xs'>
                      {resolvedRevision.slice(0, 7)}
                    </span>
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    Repeats the analysis of run {runIndex}, e.g. to apply new
                    resolutions.
                  </span>
                </Label>
              </div>
            )}
          </RadioGroup>
        ) : (
          <p className='text-muted-foreground text-[0.8125rem]'>
            The configuration of run {runIndex} could not be loaded.
          </p>
        )}
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            disabled={!ortRun || isPending}
            onClick={() => {
              if (!ortRun) return;
              mutate({
                path: { repositoryId },
                body: buildRerunPayload(
                  ortRun,
                  hasResolvedRevision ? revisionChoice : 'branch',
                  isSuperuser
                ),
              });
            }}
          >
            {isPending && <Loader2 className='animate-spin' />}
            Start run
          </Button>
          <Button asChild variant='outline'>
            <Link
              to='/organizations/$orgId/products/$productId/repositories/$repoId/create-run'
              params={{ orgId, productId, repoId }}
              search={{ rerunIndex: runIndex }}
            >
              Change configuration…
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
