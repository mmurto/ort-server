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
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  getProductOptions,
  getProductUsersQueryKey,
  putProductRoleToUserMutation,
} from '@/api/@tanstack/react-query.gen';
import { PageHeader, SheetSection } from '@/components/page-header';
import { RoleSelect } from '@/components/role-select';
import { Button } from '@/components/ui/button';
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
import { roleSchema } from '@/schemas';
import { ProductUsersTable } from './-components/product-users-table';

const formSchema = z.object({
  username: z.string().trim().min(1),
  role: roleSchema,
});

const ManageUsers = () => {
  const params = Route.useParams();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      role: 'READER',
    },
  });

  const { data: product } = useSuspenseQuery({
    ...getProductOptions({
      path: {
        productId: Number.parseInt(params.productId),
      },
    }),
  });

  const queryClient = useQueryClient();

  const { mutateAsync: addUser, isPending: isAddUserPending } = useMutation({
    ...putProductRoleToUserMutation(),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: getProductUsersQueryKey({
          path: {
            productId: Number.parseInt(params.productId),
          },
        }),
      });
      toast.info('Add User', {
        description: `Successfully assigned role "${form.getValues().role}" to user "${form.getValues().username}".`,
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  async function onAddUser(values: z.infer<typeof formSchema>) {
    await addUser({
      path: {
        productId: Number.parseInt(params.productId),
        role: values.role,
      },
      body: {
        username: values.username,
      },
    });

    form.setValue('username', '');
  }

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Manage Users'
        description={
          <>
            Assign or remove roles to users in the{' '}
            <span className='text-foreground font-medium'>{product.name}</span>{' '}
            product.
          </>
        }
      />
      <SheetSection title='Assign role'>
        <Form {...form}>
          <form className='flex max-w-2xl flex-col items-start gap-4'>
            <div className='grid w-full items-start gap-4 md:grid-cols-[minmax(0,1fr)_auto]'>
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl autoFocus>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the exact username of an existing user account.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <RoleSelect
                      value={field.value}
                      onChange={field.onChange}
                      level='product'
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type='submit'
              disabled={isAddUserPending}
              onClick={form.handleSubmit(onAddUser)}
            >
              {isAddUserPending ? (
                <>
                  <span className='sr-only'>Adding user...</span>
                  <Loader2 size={16} className='mx-3 animate-spin' />
                </>
              ) : (
                'Assign role'
              )}
            </Button>
          </form>
        </Form>
      </SheetSection>
      <SheetSection title='Users'>
        <ProductUsersTable />
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute(
  '/organizations/$orgId/products/$productId/users/'
)({
  component: ManageUsers,
});
