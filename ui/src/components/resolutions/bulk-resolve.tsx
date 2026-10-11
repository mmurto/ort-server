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

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';

import {
  getRunIssuesQueryKey,
  getRunRuleViolationsQueryKey,
  getRunVulnerabilitiesQueryKey,
  postIssueResolutionForRepositoryMutation,
  postRuleViolationResolutionForRepositoryMutation,
  postVulnerabilityResolutionMutation,
} from '@/api/@tanstack/react-query.gen';
import type {
  IssueResolutionReason,
  RuleViolationResolutionReason,
  VulnerabilityResolutionReason,
} from '@/api/types.gen';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import {
  getResolutionIdentifier,
  hasServerResolution,
  type ItemWithResolutions,
  type ResolutionItemType,
} from '@/helpers/resolutions';
import { toast } from '@/lib/toast';
import {
  applySequentially,
  countItems,
  getItemName,
  nouns,
  type BulkResolveFailure,
} from './bulk-resolve-utils';
import { defaultResolutionReason } from './reasons';
import { ResolutionFormFields } from './shared';
import { getResolutionSchema, type ResolutionFormValues } from './utils';

type Phase =
  | { name: 'form' }
  | { name: 'running'; current: number; total: number }
  | { name: 'done'; resolved: number; failures: BulkResolveFailure[] };

type BulkResolveProps = {
  /** The checked items; those with a resolution in ORT Server are skipped. */
  items: ItemWithResolutions[];
  itemType: ResolutionItemType;
  repositoryId: string;
  runId: number;
  /** Called once the resolutions were created, e.g. to clear the selection. */
  onDone?: () => void;
};

/**
 * Resolves several items with one reason and comment: a "Resolve…" button
 * that opens the form in a dialog, then creates the resolutions one after the
 * other with the progress, and lists the items that failed.
 */
export function BulkResolve({
  items,
  itemType,
  repositoryId,
  runId,
  onDone,
}: BulkResolveProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: 'form' });
  const form = useForm<ResolutionFormValues>({
    resolver: zodResolver(
      getResolutionSchema(itemType, 'create')
    ) as Resolver<ResolutionFormValues>,
    defaultValues: { comment: '', reason: defaultResolutionReason[itemType] },
  });

  const { mutateAsync: createVulnerabilityResolution } = useMutation(
    postVulnerabilityResolutionMutation()
  );
  const { mutateAsync: createRuleViolationResolution } = useMutation(
    postRuleViolationResolutionForRepositoryMutation()
  );
  const { mutateAsync: createIssueResolution } = useMutation(
    postIssueResolutionForRepositoryMutation()
  );

  const toResolve = items.filter((item) => !hasServerResolution(item));
  const skipped = items.length - toResolve.length;
  const isRunning = phase.name === 'running';

  const refetchItems = () =>
    queryClient.invalidateQueries({
      queryKey:
        itemType === 'vulnerability'
          ? getRunVulnerabilitiesQueryKey({ path: { runId } })
          : itemType === 'rule-violation'
            ? getRunRuleViolationsQueryKey({ path: { runId } })
            : getRunIssuesQueryKey({ path: { runId } }),
    });

  const close = () => {
    setOpen(false);
    if (phase.name === 'done') {
      // The new data clears the selection, which holds this dialog, so the
      // items are only refetched once the failures were read.
      void refetchItems();
      onDone?.();
    }
    setPhase({ name: 'form' });
  };

  const onSubmit = async (values: ResolutionFormValues) => {
    const targets = toResolve;
    const create = (item: ItemWithResolutions) => {
      const identifier = getResolutionIdentifier(item);
      switch (itemType) {
        case 'vulnerability':
          return createVulnerabilityResolution({
            path: { repositoryId, externalId: identifier },
            body: {
              comment: values.comment,
              reason: values.reason as VulnerabilityResolutionReason,
            },
          });
        case 'rule-violation':
          return createRuleViolationResolution({
            path: { repositoryId },
            body: {
              comment: values.comment,
              message: identifier,
              reason: values.reason as RuleViolationResolutionReason,
            },
          });
        case 'issue':
          return createIssueResolution({
            path: { repositoryId },
            body: {
              comment: values.comment,
              message: identifier,
              reason: values.reason as IssueResolutionReason,
            },
          });
      }
    };

    setPhase({ name: 'running', current: 0, total: targets.length });
    const failures = await applySequentially(targets, create, (current) =>
      setPhase({ name: 'running', current, total: targets.length })
    );
    const resolved = targets.length - failures.length;

    if (failures.length === 0) {
      void refetchItems();
      toast.info(`Resolved ${countItems(resolved, itemType)}`, {
        description: 'The resolutions apply to the next run.',
      });
      setOpen(false);
      setPhase({ name: 'form' });
      form.reset();
      onDone?.();
      return;
    }

    toast.error(
      `${countItems(failures.length, itemType)} could not be resolved`,
      {
        description: `Resolved ${resolved} of ${targets.length}.`,
      }
    );
    setPhase({ name: 'done', resolved, failures });
  };

  return (
    <>
      <Button size='sm' onClick={() => setOpen(true)}>
        Resolve…
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // The resolutions are being created; closing would hide the progress.
          if (isRunning) return;
          if (next) setOpen(true);
          else close();
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              Resolve {countItems(items.length, itemType)}
            </DialogTitle>
            <DialogDescription>
              Every selected {nouns[itemType][0]} gets a resolution with this
              reason and comment. They apply to the next run.
            </DialogDescription>
          </DialogHeader>
          {phase.name === 'done' ? (
            <div className='flex flex-col gap-3 text-[0.8125rem]'>
              <p>
                Resolved {phase.resolved} of{' '}
                {phase.resolved + phase.failures.length}.{' '}
                {countItems(phase.failures.length, itemType)} could not be
                resolved:
              </p>
              <ul
                aria-label='Failed items'
                className='flex max-h-60 flex-col divide-y overflow-y-auto border-y'
              >
                {phase.failures.map(({ item, message }, index) => (
                  <li key={index} className='flex flex-col gap-0.5 py-2'>
                    <span className='font-mono text-xs break-all'>
                      {getItemName(item)}
                    </span>
                    <span className='text-err'>{message}</span>
                  </li>
                ))}
              </ul>
              <DialogFooter>
                <Button onClick={close}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className='flex flex-col gap-4'
                aria-label='Bulk resolution'
              >
                {skipped > 0 && (
                  <p className='text-muted-foreground text-[0.8125rem]'>
                    {skipped === items.length
                      ? `The selected ${nouns[itemType][skipped === 1 ? 0 : 1]} already have a resolution in ORT Server.`
                      : `${countItems(skipped, itemType)} already ${skipped === 1 ? 'has' : 'have'} a resolution in ORT Server and ${skipped === 1 ? 'is' : 'are'} skipped.`}
                  </p>
                )}
                <ResolutionFormFields
                  control={form.control}
                  itemType={itemType}
                  disabled={isRunning}
                />
                {phase.name === 'running' && (
                  <p
                    role='status'
                    className='flex items-center gap-2 text-[0.8125rem]'
                  >
                    <Loader2 className='size-3.5 animate-spin' />
                    Resolving {phase.current} of {phase.total}…
                  </p>
                )}
                <DialogFooter className='sm:justify-start'>
                  <Button
                    type='submit'
                    disabled={isRunning || toResolve.length === 0}
                  >
                    Resolve {countItems(toResolve.length, itemType)}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={isRunning}
                    onClick={close}
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
