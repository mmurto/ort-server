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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { postProductMutation } from '@/api/@tanstack/react-query.gen';
import { asOptionalField } from '@/components/form/as-optional-field';
import { OptionalInput } from '@/components/form/optional-input';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { ApiError } from '@/lib/api-error';
import { productCreated } from '@/lib/entity-cache';
import { toast, toastError } from '@/lib/toast';

const formSchema = z.object({
  name: z.string().trim().min(1),
  description: asOptionalField(z.string().min(1)),
});

const CreateProductPage = () => {
  const navigate = useNavigate();
  const params = Route.useParams();
  const queryClient = useQueryClient();
  const { refreshUser } = useUser();

  const { mutateAsync, isPending } = useMutation({
    ...postProductMutation(),
    onSuccess(data) {
      // Refresh the user token and data to get the new roles after adding a new product.
      refreshUser();

      toast.info('Add Product', {
        description: `Product "${data.name}" added successfully.`,
      });
      productCreated(queryClient, data.organizationId);
      navigate({
        to: '/organizations/$orgId/products/$productId',
        params: { orgId: params.orgId, productId: data.id.toString() },
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await mutateAsync({
      path: {
        organizationId: Number.parseInt(params.orgId),
      },
      body: {
        name: values.name,
        description: values.description,
      },
    });
  }

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Add Product'
        description='A product groups the repositories that make up one deliverable.'
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
                    <FormControl autoFocus>
                      <Input {...field} />
                    </FormControl>
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
                      <OptionalInput {...field} />
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
                    <span className='sr-only'>Adding product...</span>
                    <Loader2 size={16} className='mx-3 animate-spin' />
                  </>
                ) : (
                  'Add'
                )}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  navigate({
                    to: '/organizations/$orgId',
                    params: { orgId: params.orgId },
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

export const Route = createFileRoute('/organizations/$orgId/create-product/')({
  component: CreateProductPage,
});
