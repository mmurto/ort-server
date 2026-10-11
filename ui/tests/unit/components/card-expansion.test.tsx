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

// @vitest-environment jsdom

import type { ExpandedState, SortingState } from '@tanstack/react-table';
import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { expect, it } from 'vitest';

import { DataTableCards } from '@/components/data-table-cards/data-table-cards';
import { EMPTY_SORTING_STATE } from '@/helpers/handle-multisort';
import {
  selectNoTableState,
  useAppTable,
  type AppColumnDef,
} from '@/hooks/use-app-table';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

type TestRow = {
  category: string;
  name: string;
};

const data: TestRow[] = [
  { category: 'Example category', name: 'Example project' },
  { category: 'Other category', name: 'Other project' },
];
const CardTableHarness = ({ sortBy }: { sortBy?: SortingState }) => {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const columns: AppColumnDef<TestRow>[] = [
    {
      id: 'project',
      header: 'Project',
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'category',
      header: 'Category',
    },
  ];
  const table = useAppTable(
    {
      columns,
      data,
      pageCount: 1,
      state: {
        columnFilters: [],
        columnVisibility: { category: false, name: false },
        expanded,
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: sortBy ?? EMPTY_SORTING_STATE,
      },
      onExpandedChange: setExpanded,
      getRowCanExpand: () => true,
      getRowId: (row) => row.name,
      manualFiltering: true,
      manualPagination: true,
      manualSorting: true,
    },
    selectNoTableState
  );

  return (
    <>
      <input aria-label='Search' />
      <DataTableCards
        table={table}
        aria-label='Projects'
        layout={[{ id: 'project', sortBy: 'name', mobile: 'main' }]}
        renderSubComponent={({ row }) => <div>{row.original.name} details</div>}
        setCurrentPageOptions={() => ({ to: '/' })}
        setPageSizeOptions={() => ({ to: '/' })}
        setSortingOptions={() => ({ to: '/' })}
      />
    </>
  );
};

const renderCards = () =>
  renderInteractiveWithRouter(<CardTableHarness />, {
    path: '/cards',
    routes: [{ path: '/cards' }],
  });

const getRow = (name: string) =>
  screen.getByText(name).closest<HTMLElement>('[role="row"]')!;

it('expands a card when sorting defaults to an empty state', async () => {
  const { user } = renderCards();

  await user.click(
    within(
      await screen
        .findByText('Example project')
        .then((cell) => cell.closest<HTMLElement>('[role="row"]')!)
    ).getByRole('button', {
      name: 'Expand row',
    })
  );

  expect(await screen.findByText('Example project details')).toBeVisible();
});

it('shows the column labels in a header row', async () => {
  renderCards();

  const grid = await screen.findByRole('grid', { name: 'Projects' });

  expect(within(grid).getAllByRole('columnheader')[0]).toHaveTextContent(
    'Project'
  );
});

it('steps through the rows with J and K and toggles a row with Enter', async () => {
  const { user } = renderCards();

  await screen.findByText('Example project');
  await user.keyboard('j');

  expect(screen.getByRole('grid')).toHaveFocus();
  expect(getRow('Example project')).toHaveAttribute('aria-selected', 'true');
  expect(getRow('Example project')).toHaveAttribute('data-state', 'selected');

  await user.keyboard('j');

  expect(getRow('Example project')).toHaveAttribute('aria-selected', 'false');
  expect(getRow('Other project')).toHaveAttribute('aria-selected', 'true');

  await user.keyboard('{Enter}');
  expect(await screen.findByText('Other project details')).toBeVisible();

  await user.keyboard('{ArrowUp}');
  expect(getRow('Example project')).toHaveAttribute('aria-selected', 'true');

  await user.keyboard(' ');
  expect(await screen.findByText('Example project details')).toBeVisible();
});

it('ignores the keys while typing', async () => {
  const { user } = renderCards();

  await screen.findByText('Example project');
  await user.click(screen.getByRole('textbox', { name: 'Search' }));
  await user.keyboard('j');

  expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('j');
  expect(getRow('Example project')).toHaveAttribute('aria-selected', 'false');
});
