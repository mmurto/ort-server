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

import { Link } from '@tanstack/react-router';
import { Network } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import { EmptyValue } from '@/components/data-table-cards/findings-cells';

/** Label and value pairs in the details of a finding. */
export const PanelFields = ({
  fields,
}: {
  fields: { label: string; value: ReactNode }[];
}) => (
  <dl className='grid grid-cols-[minmax(5.5rem,max-content)_minmax(0,1fr)] gap-x-4 gap-y-1.5'>
    {fields.map(({ label, value }) => (
      <Fragment key={label}>
        <dt className='text-muted-foreground'>{label}</dt>
        <dd className='min-w-0 wrap-break-word'>{value ?? <EmptyValue />}</dd>
      </Fragment>
    ))}
  </dl>
);

/** A value in the monospaced face, e.g. a hash or a path. */
export const PanelMono = ({ value }: { value?: string | null }) =>
  value ? (
    <span className='font-mono text-xs break-all'>{value}</span>
  ) : (
    <EmptyValue />
  );

/** An external link, or the placeholder of an empty value. */
export const PanelUrl = ({ url }: { url?: string | null }) =>
  url ? (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className='link break-all'
    >
      {url}
    </a>
  ) : (
    <EmptyValue />
  );

/** Opens the dependency graph of the run, searching for the given term. */
export const DependencyGraphLink = ({
  params,
  searchTerm,
}: {
  params: {
    orgId: string;
    productId: string;
    repoId: string;
    runIndex: string;
  };
  searchTerm: string;
}) => (
  <Link
    to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/dependencies'
    params={params}
    search={{ search: searchTerm }}
    className='link flex items-center gap-1 text-[0.8125rem]'
  >
    <Network className='size-3.5' />
    Show in dependency graph
  </Link>
);
