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

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  getServerSettingByKeyOptions,
  getServerSettingByKeyQueryKey,
  setServerSettingByKeyMutation,
} from '@/api/@tanstack/react-query.gen';
import { LoadError } from '@/components/load-error';
import { LoadingIndicator } from '@/components/loading-indicator.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { ApiError } from '@/lib/api-error';
import { toast, toastError } from '@/lib/toast';

const formSchema = z.object({
  footer: z.string().min(1, 'Footer must not be empty'),
  isEnabled: z.boolean(),
});

export function FooterForm() {
  const queryClient = useQueryClient();

  const {
    data: footer,
    isFetching,
    error,
    isError,
  } = useQuery({
    ...getServerSettingByKeyOptions({ path: { key: 'FOOTER' } }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      footer: footer?.value || '',
      isEnabled: footer?.isEnabled || false,
    },
  });

  const { mutateAsync, isPending } = useMutation({
    ...setServerSettingByKeyMutation(),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: getServerSettingByKeyQueryKey({ path: { key: 'FOOTER' } }),
      });
      toast.info('Footer saved', {
        description: `Footer saved successfully.`,
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await mutateAsync({
      body: {
        isEnabled: values.isEnabled,
        value: values.footer,
      },
      path: { key: 'FOOTER' },
    });
  }

  if (isFetching) {
    return <LoadingIndicator />;
  }

  if (isError) {
    return <LoadError error={error} />;
  }

  return (
    <Card className='max-w-2xl'>
      <CardHeader>
        <CardTitle>Footer</CardTitle>
        <CardDescription>
          Use Markdown to customize the footer content, and toggle the footer
          section on or off.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='flex flex-col gap-6'
        >
          <CardContent className='flex flex-col gap-5'>
            <FormField
              control={form.control}
              name='footer'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer content</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder='Write some Markdown...'
                      rows={25}
                      className='border-input bg-background focus-visible:border-ring min-h-[200px] w-full rounded-sm border px-2.5 py-2 font-mono text-xs'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='isEnabled'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center gap-2'>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className='font-normal'>
                    Enable customization
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className='gap-2'>
            <Button type='submit' disabled={isPending}>
              {isPending ? (
                <>
                  <span className='sr-only'>Saving ...</span>
                  <Loader2 size={16} className='mx-3 animate-spin' />
                </>
              ) : (
                'Save'
              )}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => form.reset()}
                >
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Revert to the saved footer content and clear unsaved edits.
              </TooltipContent>
            </Tooltip>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
