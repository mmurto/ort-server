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
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  deleteOrganizationMutation,
  getOrganizationOptions,
  patchOrganizationMutation,
} from '@/api/@tanstack/react-query.gen';
import { DeleteDialog } from '@/components/delete-dialog';
import { PageHeader, SheetSection } from '@/components/page-header';
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
import { UnsavedChangesGuard } from '@/components/unsaved-changes-guard';
import { ApiError } from '@/lib/api-error';
import { organizationDeleted, organizationUpdated } from '@/lib/entity-cache';
import { toast, toastError } from '@/lib/toast';

const formSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
});

const OrganizationSettingsPage = () => {
  const params = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const organizationId = Number.parseInt(params.orgId);

  const { data: organization } = useSuspenseQuery({
    ...getOrganizationOptions({
      path: {
        organizationId,
      },
    }),
  });

  const { mutateAsync, isPending } = useMutation({
    ...patchOrganizationMutation(),
    async onSuccess(data) {
      toast.info('Edit Organization', {
        description: `Organization "${data.name}" updated successfully.`,
      });
      organizationUpdated(queryClient, data);
      // The breadcrumb, and through it the document title, is written by the loader of the parent
      // route, which saving on this page does not re-run.
      await router.invalidate();
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name,
      description: organization.description || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const saved = await mutateAsync({
      path: {
        organizationId: organization.id,
      },
      body: {
        name: values.name,
        description: values.description,
      },
    }).catch(() => undefined);
    // The mutation has reported the error. The changes stay in the form to be saved again.
    if (!saved) return;
    // Stay on the page with the saved values as the new starting point of the form.
    form.reset({ name: saved.name, description: saved.description || '' });
  }

  const { mutateAsync: deleteOrganization } = useMutation({
    ...deleteOrganizationMutation(),
    onSuccess() {
      toast.info('Delete Organization', {
        description: `Organization "${organization.name}" deleted successfully.`,
      });
      organizationDeleted(queryClient, organizationId);
      navigate({
        to: '/organizations',
        // The deletion has been confirmed, so unsaved changes in the form do not hold it up.
        ignoreBlocker: true,
      });
    },
    onError(error: ApiError) {
      toastError(error.message, error);
    },
  });

  async function handleDelete() {
    await deleteOrganization({
      path: {
        organizationId: organizationId,
      },
    });
  }

  return (
    <div className='flex flex-col gap-8'>
      <UnsavedChangesGuard control={form.control} />
      <PageHeader
        title='Settings'
        description={`Edit the details of ${organization.name} or delete it.`}
      />
      <SheetSection title='Edit organization'>
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
                        <Input {...field} />
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
                      <span className='sr-only'>Editing organization...</span>
                      <Loader2 size={16} className='mx-3 animate-spin' />
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => form.reset()}
                  disabled={isPending || !form.formState.isDirty}
                >
                  Reset
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </SheetSection>
      <SheetSection title='Danger zone'>
        <div className='border-err/30 flex max-w-2xl flex-col divide-y border'>
          <div className='flex flex-wrap items-center justify-between gap-4 p-4'>
            <div className='flex flex-col gap-0.5'>
              <div className='font-medium'>Delete this organization</div>
              <p className='text-muted-foreground text-[0.8125rem]'>
                This cannot be undone.
              </p>
            </div>
            <DeleteDialog
              thingName={'organization'}
              thingId={organization.name}
              uiComponent={
                <Button variant='destructive'>Delete organization</Button>
              }
              onDelete={handleDelete}
            />
          </div>
        </div>
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute('/organizations/$orgId/settings/')({
  component: OrganizationSettingsPage,
});
