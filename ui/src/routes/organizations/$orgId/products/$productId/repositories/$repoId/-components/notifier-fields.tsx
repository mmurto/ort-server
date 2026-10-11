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

import { PlusIcon, TrashIcon } from 'lucide-react';
import { useFieldArray, UseFormReturn, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CreateRunFormValues } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components';
import {
  JobSection,
  SwitchField,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/form-section';
import { KEEP_ALIVE_DESCRIPTION } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/form-sections';
import { summarizeNotifier } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/section-summaries';

type NotifierFieldsProps = {
  form: UseFormReturn<CreateRunFormValues>;
  isSuperuser: boolean;
};

export const NotifierFields = ({ form, isSuperuser }: NotifierFieldsProps) => {
  const { fields, append, remove } = useFieldArray({
    name: 'jobConfigs.notifier.recipientAddresses',
    control: form.control,
  });
  const recipientAddresses = useWatch({
    control: form.control,
    name: 'jobConfigs.notifier.recipientAddresses',
  });

  return (
    <JobSection
      control={form.control}
      job='notifier'
      summary={summarizeNotifier(recipientAddresses)}
    >
      <div className='flex flex-col gap-2'>
        <h3 className='text-sm font-medium'>Recipient addresses</h3>
        {fields.length === 0 && (
          <p className='text-muted-foreground text-[0.8125rem]'>
            No recipients yet. Add the e-mail addresses to notify.
          </p>
        )}
        {fields.map((field, index) => (
          <div key={field.id} className='flex flex-row items-end gap-2'>
            <div className='flex-auto'>
              <FormField
                control={form.control}
                name={`jobConfigs.notifier.recipientAddresses.${index}.email`}
                render={({ field }) => (
                  <FormItem>
                    {index === 0 ? (
                      <FormLabel>E-mail address</FormLabel>
                    ) : (
                      <FormLabel className='sr-only'>
                        E-mail address {index + 1}
                      </FormLabel>
                    )}
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type='button'
              variant='outline'
              size='icon'
              aria-label={`Remove recipient ${index + 1}`}
              onClick={() => {
                remove(index);
              }}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
        <Button
          size='sm'
          className='mt-1 w-fit'
          variant='outline'
          type='button'
          onClick={() => {
            append({ email: '' });
          }}
        >
          <PlusIcon />
          Add recipient address
        </Button>
      </div>
      {isSuperuser && (
        <SwitchField
          control={form.control}
          name='jobConfigs.notifier.keepAliveWorker'
          label='Keep worker alive'
          description={KEEP_ALIVE_DESCRIPTION}
        />
      )}
    </JobSection>
  );
};
