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

import { ChevronRight, Info } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import {
  useFormState,
  useWatch,
  type Control,
  type FieldPath,
  type FieldPathByValue,
} from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  formStateHasErrorAt,
  JOB_COLORS,
  SECTION_LABELS,
  sectionDomId,
  sectionHeadingId,
  type JobSectionId,
  type SectionId,
} from './form-sections';
import type { CreateRunFormValues } from './run-schema';

type FormControlOf = Control<CreateRunFormValues>;

/** An info button that shows a longer explanation of a field in a popover. */
export const FieldHelp = ({
  topic,
  children,
}: {
  /** The name of the field, used in the accessible name of the button. */
  topic: string;
  children: ReactNode;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type='button'
        aria-label={`About ${topic.toLowerCase()}`}
        className='text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex size-5 items-center justify-center rounded-xs outline-none focus-visible:ring-[3px]'
      >
        <Info className='size-3.5' />
      </button>
    </PopoverTrigger>
    <PopoverContent
      align='start'
      className='flex w-80 flex-col gap-2 text-[0.8125rem] leading-relaxed'
    >
      {children}
    </PopoverContent>
  </Popover>
);

/** A form label followed by an optional {@link FieldHelp} button. */
export const LabelWithHelp = ({
  label,
  help,
}: {
  label: string;
  help?: ReactNode;
}) =>
  help ? (
    <div className='flex items-center gap-1'>
      <FormLabel>{label}</FormLabel>
      <FieldHelp topic={label}>{help}</FieldHelp>
    </div>
  ) : (
    <FormLabel>{label}</FormLabel>
  );

/** A boolean field shown as a switch with its label and a one-sentence description. */
export const SwitchField = ({
  control,
  name,
  label,
  description,
}: {
  control: FormControlOf;
  name: FieldPathByValue<CreateRunFormValues, boolean>;
  label: string;
  description: ReactNode;
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className='flex flex-row items-center justify-between gap-4 rounded-xs border px-4 py-3'>
        <div className='flex flex-col gap-1'>
          <FormLabel>{label}</FormLabel>
          <FormDescription>{description}</FormDescription>
        </div>
        <FormControl>
          <Switch
            ref={field.ref}
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        </FormControl>
      </FormItem>
    )}
  />
);

type SectionHeaderProps = {
  section: SectionId;
  title: string;
  summary: ReactNode;
  marker?: ReactNode;
  actions?: ReactNode;
};

const SectionHeader = ({
  section,
  title,
  summary,
  marker,
  actions,
}: SectionHeaderProps) => (
  <div className='flex items-start gap-3'>
    {marker}
    <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
      {/* The heading receives focus when the section is opened from the navigation. */}
      <h2
        id={sectionHeadingId(section)}
        tabIndex={-1}
        className='text-[0.9375rem] font-semibold outline-none'
      >
        {title}
      </h2>
      <p
        className='text-muted-foreground truncate text-[0.8125rem]'
        title={typeof summary === 'string' ? summary : undefined}
      >
        {summary}
      </p>
    </div>
    {actions && (
      <div className='flex shrink-0 items-center gap-3'>{actions}</div>
    )}
  </div>
);

const sectionClassName = 'flex scroll-mt-16 flex-col gap-5 border-t pt-6';

/** A section of the create run form with a heading and a summary of its values. */
export const FormSection = ({
  section,
  title = SECTION_LABELS[section],
  summary,
  actions,
  children,
}: {
  section: SectionId;
  title?: string;
  summary: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <section
    id={sectionDomId(section)}
    aria-labelledby={sectionHeadingId(section)}
    className={sectionClassName}
  >
    <SectionHeader
      section={section}
      title={title}
      summary={summary}
      actions={actions}
    />
    {children}
  </section>
);

type JobSectionProps = {
  control: FormControlOf;
  job: JobSectionId;
  /** The summary of the job's current values, shown while the job is enabled. */
  summary: ReactNode;
  /** The job always runs, so its switch cannot be turned off. */
  alwaysEnabled?: boolean;
  children: ReactNode;
};

/**
 * A job section of the create run form. Its header holds the switch that enables the job.
 * While the job is disabled, the section collapses to its header; its settings can still be
 * shown, and they are always shown while they have validation errors.
 */
export const JobSection = ({
  control,
  job,
  summary,
  alwaysEnabled = false,
  children,
}: JobSectionProps) => {
  const bodyId = useId();
  const enabledName = `jobConfigs.${job}.enabled` as const;
  const enabled = useWatch({ control, name: enabledName });
  const formState = useFormState({ control, name: `jobConfigs.${job}` });
  const hasErrors = formStateHasErrorAt(formState, `jobConfigs.${job}`);
  const [revealed, setRevealed] = useState(false);
  const showSettings = enabled || revealed || hasErrors;

  return (
    <section
      id={sectionDomId(job)}
      aria-labelledby={sectionHeadingId(job)}
      className={sectionClassName}
    >
      <SectionHeader
        section={job}
        title={SECTION_LABELS[job]}
        summary={enabled ? summary : 'Not included in this run'}
        marker={
          <span
            aria-hidden
            className={cn(
              'mt-[0.4375rem] size-2 shrink-0',
              JOB_COLORS[job],
              !enabled && 'opacity-30'
            )}
          />
        }
        actions={
          <>
            {!enabled && !hasErrors && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                aria-expanded={revealed}
                aria-controls={revealed ? bodyId : undefined}
                onClick={() => setRevealed(!revealed)}
              >
                {revealed ? 'Hide settings' : 'Show settings'}
              </Button>
            )}
            <FormField
              control={control}
              name={enabledName}
              render={({ field }) => (
                <Switch
                  ref={field.ref}
                  aria-labelledby={sectionHeadingId(job)}
                  className='mt-0.5'
                  checked={field.value}
                  disabled={alwaysEnabled}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </>
        }
      />
      {showSettings && (
        <div id={bodyId} className='flex min-w-0 flex-col gap-6 pl-5'>
          {children}
        </div>
      )}
    </section>
  );
};

/**
 * A disclosure for the less common fields of a section. It opens by itself while one of the
 * fields in it has a validation error.
 */
export const MoreOptions = ({
  control,
  names,
  defaultOpen = false,
  children,
}: {
  control: FormControlOf;
  /** The form paths of the fields inside, to open the disclosure on their errors. */
  names: FieldPath<CreateRunFormValues>[];
  defaultOpen?: boolean;
  children: ReactNode;
}) => {
  const contentId = useId();
  const formState = useFormState({ control, name: names });
  const hasErrors = names.some((name) => formStateHasErrorAt(formState, name));
  const [open, setOpen] = useState(defaultOpen);
  const shown = open || hasErrors;

  return (
    <div className='flex flex-col gap-6'>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='-ml-2 w-fit'
        aria-expanded={shown}
        aria-controls={shown ? contentId : undefined}
        onClick={() => setOpen(!shown)}
      >
        <ChevronRight
          className={cn(
            'transition-transform duration-150 motion-reduce:transition-none',
            shown && 'rotate-90'
          )}
        />
        More options
      </Button>
      {shown && (
        <div id={contentId} className='flex flex-col gap-6'>
          {children}
        </div>
      )}
    </div>
  );
};
