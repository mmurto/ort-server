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

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import z from 'zod';

import {
  getRepositorySecretOptions,
  patchRepositorySecretMutation,
} from '@/api/@tanstack/react-query.gen';
import { PasswordInput } from '@/components/form/password-input';
import { LoadingIndicator } from '@/components/loading-indicator';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-error';
import { toast, toastError } from '@/lib/toast';

const editSecretFormSchema = z.object({
  name: z.string().optional(),
  value: z.string().optional(),
  description: z.string().optional(),
});

export type EditSecretFormValues = z.infer<typeof editSecretFormSchema>;

const EditRepositorySecretPage = () => {
  const params = Route.useParams();
  const navigate = useNavigate();

  const { data: secret } = useSuspenseQuery({
    ...getRepositorySecretOptions({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        secretName: params.secretName,
      },
    }),
  });

  const form = useForm<EditSecretFormValues>({
    resolver: zodResolver(editSecretFormSchema),
    values: {
      name: secret.name,
      value: '',
      description: secret.description ?? undefined,
    },
  });

  const { mutateAsync: editSecret, isPending } = useMutation({
    ...patchRepositorySecretMutation(),
    onSuccess(data) {
      toast.info('Edit Repository Secret', {
        description: `Secret "${data.name}" updated successfully.`,
      });
      navigate({
        to: '/organizations/$orgId/products/$productId/repositories/$repoId/secrets',
        params: {
          orgId: params.orgId,
          productId: params.productId,
          repoId: params.repoId,
        },
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  const onSubmit = (values: EditSecretFormValues) => {
    editSecret({
      path: {
        repositoryId: Number.parseInt(params.repoId),
        secretName: secret.name,
      },
      body: {
        // An empty value keeps the current one.
        value: values.value || undefined,
        description: values.description,
      },
    });
  };

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Edit Repository Secret'
        description={'Replace the value or the description of the secret.'}
      />
      <Card className='max-w-2xl'>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-6'
          >
            <CardContent className='flex flex-col gap-5'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the secret (cannot be changed).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
                disabled
              />
              <FormField
                control={form.control}
                name='value'
                render={({ field }) => (
                  <FormItem className='mt-0'>
                    <FormLabel>Value</FormLabel>
                    <FormControl autoFocus>
                      <PasswordInput {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave empty to keep the current value.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='(optional)' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className='gap-2'>
              <Button type='submit' disabled={isPending}>
                {isPending ? (
                  <>
                    <span className='sr-only'>Editing secret...</span>
                    <Loader2 size={16} className='mx-3 animate-spin' />
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  navigate({
                    to: '/organizations/$orgId/products/$productId/repositories/$repoId/secrets',
                    params: {
                      orgId: params.orgId,
                      productId: params.productId,
                      repoId: params.repoId,
                    },
                  })
                }
                disabled={isPending}
              >
                Cancel
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/secrets/$secretName/edit/'
)({
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.ensureQueryData({
      ...getRepositorySecretOptions({
        path: {
          repositoryId: Number.parseInt(params.repoId),
          secretName: params.secretName,
        },
      }),
    });
  },
  component: EditRepositorySecretPage,
  pendingComponent: LoadingIndicator,
});
