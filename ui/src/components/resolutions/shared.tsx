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
import { Pencil, Trash2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Control, Resolver, useForm } from 'react-hook-form';

import {
  getRunIssuesQueryKey,
  getRunRuleViolationsQueryKey,
  getRunVulnerabilitiesQueryKey,
  patchIssueResolutionForRepositoryMutation,
  patchRuleViolationResolutionForRepositoryMutation,
  patchVulnerabilityResolutionMutation,
  postIssueResolutionForRepositoryMutation,
  postRuleViolationResolutionForRepositoryMutation,
  postVulnerabilityResolutionMutation,
} from '@/api/@tanstack/react-query.gen';
import {
  IssueResolutionReason,
  PatchIssueResolution,
  PatchRuleViolationResolution,
  PatchVulnerabilityResolution,
  PostIssueResolution,
  PostRuleViolationResolution,
  PostVulnerabilityResolution,
  RuleViolationResolutionReason,
  VulnerabilityResolutionReason,
} from '@/api/types.gen';
import { DeleteDialog } from '@/components/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ResolutionItemType } from '@/helpers/resolutions';
import { ApiError } from '@/lib/api-error';
import { toast, toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  getResolutionReasonLabel,
  resolutionReasonOptions,
  resolutionSourceNotes,
} from './reasons';
import {
  getResolutionSchema,
  ManagedResolutionContext,
  ResolutionDisplayItem,
  ResolutionFormValues,
} from './utils';

const COLLAPSIBLE_MESSAGE_MAX_LINES = 4;
const COLLAPSIBLE_MESSAGE_CHAR_THRESHOLD = 280;

/** Marks the part of the details that the R shortcut focuses. */
export const RESOLUTION_FORM_SELECTOR = '[data-resolution-form]';

type ExpandableResolutionMessageProps = {
  message: string;
};

function ExpandableResolutionMessage({
  message,
}: ExpandableResolutionMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const lineCount = message.split(/\r?\n/).length;
  const isCollapsible =
    lineCount > COLLAPSIBLE_MESSAGE_MAX_LINES ||
    message.length > COLLAPSIBLE_MESSAGE_CHAR_THRESHOLD;

  if (!isCollapsible) {
    return (
      <div className='text-muted-foreground flex-1 break-all whitespace-pre-wrap'>
        {message}
      </div>
    );
  }

  return (
    <div className='flex min-w-0 flex-1 flex-col items-start gap-1'>
      <div
        className={cn(
          'text-muted-foreground w-full break-all whitespace-pre-wrap',
          !isExpanded && 'overflow-hidden'
        )}
        style={
          !isExpanded
            ? {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: COLLAPSIBLE_MESSAGE_MAX_LINES,
              }
            : undefined
        }
      >
        {message}
      </div>
      <Button
        variant='link'
        size='sm'
        className='h-auto p-0 text-xs'
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Show less' : 'Show the whole message'}
      </Button>
    </div>
  );
}

type ResolutionFormFieldsProps = {
  control: Control<ResolutionFormValues>;
  itemType: ResolutionItemType;
  disabled?: boolean;
};

/**
 * The reason of a resolution as a list of plain choices with a line of help
 * each, and a comment. The chosen reason is marked for the R shortcut, which
 * focuses it.
 */
export function ResolutionFormFields({
  control,
  itemType,
  disabled,
}: ResolutionFormFieldsProps) {
  const labelId = useId();
  const idPrefix = useId();

  return (
    <>
      <FormField
        control={control}
        name='reason'
        render={({ field }) => (
          <FormItem className='gap-1.5'>
            <div id={labelId} className='text-[0.8125rem] font-medium'>
              Reason
            </div>
            <FormControl>
              <RadioGroup
                aria-labelledby={labelId}
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
                className='gap-0'
              >
                {resolutionReasonOptions[itemType].map((option) => {
                  const id = `${idPrefix}-${option.value}`;
                  const checked = field.value === option.value;

                  return (
                    <label
                      key={option.value}
                      htmlFor={id}
                      className='hover:bg-accent has-data-[state=checked]:bg-muted flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5'
                    >
                      <RadioGroupItem
                        id={id}
                        value={option.value}
                        className='mt-0.5'
                        data-autofocus={checked ? '' : undefined}
                        aria-labelledby={`${id}-label`}
                        aria-describedby={`${id}-help`}
                      />
                      <span className='flex min-w-0 flex-col'>
                        <span
                          id={`${id}-label`}
                          className='text-[0.8125rem] font-medium'
                        >
                          {option.label}
                        </span>
                        <span
                          id={`${id}-help`}
                          className='text-muted-foreground text-xs'
                        >
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name='comment'
        render={({ field }) => (
          <FormItem className='gap-1.5'>
            <FormLabel>Comment</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                disabled={disabled}
                rows={3}
                className='min-h-16 text-[0.8125rem]'
                placeholder='Why the resolution applies, e.g. a link to the assessment'
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

/** Runs a submission whose errors are already reported by the mutation. */
const ignoreRejection = async (submit: () => Promise<unknown>) => {
  try {
    await submit();
    return true;
  } catch {
    return false;
  }
};

type ResolutionFormProps = {
  context: ManagedResolutionContext;
  mode: 'create' | 'edit';
  defaultValues: ResolutionFormValues;
  onCancel?: () => void;
  onSuccess?: () => void;
};

export function ResolutionForm({
  context,
  mode,
  defaultValues,
  onCancel,
  onSuccess,
}: ResolutionFormProps) {
  const queryClient = useQueryClient();
  const isIssue = context.itemType === 'issue';
  const isRuleViolation = context.itemType === 'rule-violation';

  const form = useForm<ResolutionFormValues>({
    resolver: zodResolver(
      getResolutionSchema(context.itemType, mode)
    ) as Resolver<ResolutionFormValues>,
    defaultValues,
  });

  const issueCreateMutation = useMutation({
    ...postIssueResolutionForRepositoryMutation(),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: getRunIssuesQueryKey({
          path: { runId: context.runId },
        }),
      });
      toast.info('Resolution created', {
        description: 'Issue resolution created successfully.',
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });
  const issueUpdateMutation = useMutation({
    ...patchIssueResolutionForRepositoryMutation(),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: getRunIssuesQueryKey({
          path: { runId: context.runId },
        }),
      });
      toast.info('Resolution updated', {
        description: 'Issue resolution updated successfully.',
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  const vulnerabilityCreateMutation = useMutation({
    ...postVulnerabilityResolutionMutation(),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: getRunVulnerabilitiesQueryKey({
          path: { runId: context.runId },
        }),
      });
      toast.info('Resolution created', {
        description: 'Vulnerability resolution created successfully.',
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });
  const vulnerabilityUpdateMutation = useMutation({
    ...patchVulnerabilityResolutionMutation(),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: getRunVulnerabilitiesQueryKey({
          path: { runId: context.runId },
        }),
      });
      toast.info('Resolution updated', {
        description: 'Vulnerability resolution updated successfully.',
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  const ruleViolationCreateMutation = useMutation({
    ...postRuleViolationResolutionForRepositoryMutation(),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: getRunRuleViolationsQueryKey({
          path: { runId: context.runId },
        }),
      });
      toast.info('Resolution created', {
        description: 'Rule violation resolution created successfully.',
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });
  const ruleViolationUpdateMutation = useMutation({
    ...patchRuleViolationResolutionForRepositoryMutation(),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: getRunRuleViolationsQueryKey({
          path: { runId: context.runId },
        }),
      });
      toast.info('Resolution updated', {
        description: 'Rule violation resolution updated successfully.',
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  const isPending = isIssue
    ? mode === 'create'
      ? issueCreateMutation.isPending
      : issueUpdateMutation.isPending
    : isRuleViolation
      ? mode === 'create'
        ? ruleViolationCreateMutation.isPending
        : ruleViolationUpdateMutation.isPending
      : mode === 'create'
        ? vulnerabilityCreateMutation.isPending
        : vulnerabilityUpdateMutation.isPending;

  const submit = (values: ResolutionFormValues) => {
    if (isIssue) {
      return mode === 'create'
        ? issueCreateMutation.mutateAsync({
            path: { repositoryId: context.repositoryId },
            body: {
              comment: values.comment,
              message: context.identifier,
              reason: values.reason as IssueResolutionReason,
            } satisfies PostIssueResolution,
          })
        : issueUpdateMutation.mutateAsync({
            path: {
              repositoryId: context.repositoryId,
              messageHash: context.identifier,
            },
            body: {
              comment: values.comment,
              reason: values.reason as IssueResolutionReason,
            } satisfies PatchIssueResolution,
          });
    }
    if (isRuleViolation) {
      return mode === 'create'
        ? ruleViolationCreateMutation.mutateAsync({
            path: { repositoryId: context.repositoryId },
            body: {
              comment: values.comment,
              message: context.identifier,
              reason: values.reason as RuleViolationResolutionReason,
            } satisfies PostRuleViolationResolution,
          })
        : ruleViolationUpdateMutation.mutateAsync({
            path: {
              repositoryId: context.repositoryId,
              messageHash: context.identifier,
            },
            body: {
              comment: values.comment,
              reason: values.reason as RuleViolationResolutionReason,
            } satisfies PatchRuleViolationResolution,
          });
    }
    return mode === 'create'
      ? vulnerabilityCreateMutation.mutateAsync({
          path: {
            repositoryId: context.repositoryId,
            externalId: context.identifier,
          },
          body: {
            comment: values.comment,
            reason: values.reason as VulnerabilityResolutionReason,
          } satisfies PostVulnerabilityResolution,
        })
      : vulnerabilityUpdateMutation.mutateAsync({
          path: {
            repositoryId: context.repositoryId,
            externalId: context.identifier,
          },
          body: {
            comment: values.comment,
            reason: values.reason as VulnerabilityResolutionReason,
          } satisfies PatchVulnerabilityResolution,
        });
  };

  const onSubmit = async (values: ResolutionFormValues) => {
    const succeeded = await ignoreRejection(() => submit(values));
    if (succeeded && mode === 'edit') onSuccess?.();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex flex-col gap-4'
        aria-label={mode === 'create' ? 'New resolution' : 'Edit resolution'}
      >
        <ResolutionFormFields
          control={form.control}
          itemType={context.itemType}
          disabled={isPending}
        />
        <div className='flex flex-wrap gap-2'>
          <Button type='submit' disabled={isPending}>
            {mode === 'create'
              ? isPending
                ? 'Resolving…'
                : 'Resolve'
              : isPending
                ? 'Saving…'
                : 'Save'}
          </Button>
          {mode === 'edit' && (
            <Button type='button' variant='outline' onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

const pendingLabels: Record<ResolutionDisplayItem['state'], string | null> = {
  applied: null,
  'pending-create': 'Added · pending rerun',
  'pending-update': 'Changed · pending rerun',
  'pending-delete': 'Deleted · pending rerun',
};

type ResolutionEntryProps = {
  displayItem: ResolutionDisplayItem;
  editingKey: string | null;
  setEditingKey: (key: string | null) => void;
  context?: ManagedResolutionContext;
  onDelete?: () => void | Promise<unknown>;
};

/**
 * One resolution of an item: its reason, comment and what it matches, where it
 * is defined, and whether it only applies to the next run.
 */
export function ResolutionEntry({
  displayItem,
  editingKey,
  setEditingKey,
  context,
  onDelete,
}: ResolutionEntryProps) {
  const { key, resolution, state, showActions } = displayItem;
  const isEditing = editingKey === key;
  const pendingLabel = pendingLabels[state];
  const reasonLabel = getResolutionReasonLabel(resolution.reason);
  const canManage = showActions && context !== undefined && !!onDelete;

  return (
    <li className='flex flex-col gap-2 py-3'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
        <span
          className={cn(
            'font-medium',
            state === 'pending-delete' && 'text-muted-foreground line-through'
          )}
          title={resolution.reason}
        >
          {reasonLabel}
        </span>
        {pendingLabel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant='small'
                className='bg-warn-soft text-warn'
                tabIndex={0}
              >
                {pendingLabel}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              The change applies to the next run of the repository.
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {isEditing && context ? (
        <ResolutionForm
          context={context}
          mode='edit'
          defaultValues={{
            comment: resolution.comment,
            reason: resolution.reason as ResolutionFormValues['reason'],
          }}
          onCancel={() => setEditingKey(null)}
          onSuccess={() => setEditingKey(null)}
        />
      ) : (
        <>
          {resolution.comment.trim() ? (
            <p className='break-words whitespace-pre-wrap'>
              {resolution.comment}
            </p>
          ) : (
            <p className='text-muted-foreground'>No comment.</p>
          )}
          <div className='flex items-start gap-2 text-xs'>
            <span className='text-muted-foreground shrink-0'>
              {'externalId' in resolution ? 'Matches ID' : 'Matches message'}
            </span>
            <div className='min-w-0 flex-1 font-mono'>
              {'externalId' in resolution ? (
                <div className='text-muted-foreground break-all'>
                  {resolution.externalId}
                </div>
              ) : (
                <ExpandableResolutionMessage message={resolution.message} />
              )}
            </div>
          </div>
          <p className='text-muted-foreground text-xs'>
            {resolutionSourceNotes[resolution.source]}
          </p>
          {canManage && (
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setEditingKey(key)}
              >
                <Pencil />
                Edit
              </Button>
              <DeleteDialog
                thingName='resolution'
                thingLabel={
                  'externalId' in resolution
                    ? `${reasonLabel} for ${resolution.externalId}`
                    : reasonLabel
                }
                description='The resolution stops applying with the next run.'
                tooltip='Delete the resolution'
                uiComponent={
                  <Button
                    variant='outline'
                    size='sm'
                    className='text-err hover:text-err'
                  >
                    <Trash2 />
                    Delete
                  </Button>
                }
                onDelete={async () => {
                  await ignoreRejection(async () => onDelete());
                }}
              />
            </div>
          )}
        </>
      )}
    </li>
  );
}

/** The resolutions of an item, and the form for a new one. */
export function ResolutionList({
  children,
  form,
}: {
  children: ReactNode;
  form?: ReactNode;
}) {
  const hasEntries = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <div data-resolution-form='' className='flex flex-col gap-3'>
      {hasEntries && (
        <ul className='flex flex-col divide-y border-y'>{children}</ul>
      )}
      {form}
    </div>
  );
}
