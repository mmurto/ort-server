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

import type { ExpandedState } from '@tanstack/react-table';
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
import { compiledFunctionNames } from '../fixtures/react-compiler';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

type TestRow = { name: string };

const pages: TestRow[][] = [
  [
    { name: 'Alpha' },
    { name: 'Bravo' },
    { name: 'Charlie' },
    { name: 'Delta' },
  ],
  [{ name: 'Echo' }],
];

const columns: AppColumnDef<TestRow>[] = [
  { id: 'name', header: 'Name', cell: ({ row }) => row.original.name },
];

const Harness = () => {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const table = useAppTable(
    {
      columns,
      data: pages[page]!,
      pageCount: pages.length,
      state: {
        columnFilters: [],
        columnVisibility: {},
        expanded,
        pagination: { pageIndex: page, pageSize: 10 },
        sorting: EMPTY_SORTING_STATE,
      },
      onExpandedChange: setExpanded,
      getRowCanExpand: () => true,
      manualFiltering: true,
      manualPagination: true,
      manualSorting: true,
    },
    selectNoTableState
  );

  return (
    <>
      <input aria-label='Search' />
      <button type='button' onClick={() => setPage(1)}>
        Next page
      </button>
      <DataTableCards
        table={table}
        aria-label='Findings'
        layout={[{ id: 'name', mobile: 'main' }]}
        renderDetails={({ row }) => ({
          title: row.original.name,
          content: (
            <div data-resolution-form=''>
              <button type='button'>Other</button>
              <button type='button' data-autofocus=''>
                Reason of {row.original.name}
              </button>
            </div>
          ),
        })}
        resolveTarget='[data-resolution-form]'
        bulkActions={({ rows }) => (
          <span>
            Acting on {rows.map((row) => row.original.name).join(', ')}
          </span>
        )}
        setCurrentPageOptions={() => ({ to: '/' })}
        setPageSizeOptions={() => ({ to: '/' })}
      />
    </>
  );
};

const renderGrid = () =>
  renderInteractiveWithRouter(<Harness />, {
    path: '/cards',
    routes: [{ path: '/cards' }],
  });

const checkbox = (index: number) =>
  screen.getByRole('checkbox', { name: `Select item ${index}` });

const bar = () => screen.queryByRole('toolbar', { name: 'Bulk actions' });

it('checks rows for a bulk action and clears them', async () => {
  const { user } = renderGrid();

  await screen.findByText('Alpha');
  expect(bar()).not.toBeInTheDocument();

  await user.click(checkbox(1));
  expect(checkbox(1)).toBeChecked();
  // Checking a row does not open its details.
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(bar()).toHaveTextContent('1 selected');
  expect(bar()).toHaveTextContent('Acting on Alpha');

  // Shift-click checks the range from the last checked row.
  await user.keyboard('{Shift>}');
  await user.click(checkbox(3));
  await user.keyboard('{/Shift}');
  expect(bar()).toHaveTextContent('3 selected');
  expect(checkbox(4)).not.toBeChecked();

  const selectAll = screen.getByRole('checkbox', {
    name: 'Select all items on this page',
  });
  expect(selectAll).toHaveAttribute('data-state', 'indeterminate');
  await user.click(selectAll);
  expect(bar()).toHaveTextContent('4 selected');
  await user.click(selectAll);
  expect(bar()).not.toBeInTheDocument();

  await user.click(checkbox(2));
  await user.click(within(bar()!).getByRole('button', { name: 'Clear' }));
  expect(checkbox(2)).not.toBeChecked();
  expect(bar()).not.toBeInTheDocument();
});

it('clears the checked rows when the data changes', async () => {
  const { user } = renderGrid();

  await user.click(
    await screen.findByRole('checkbox', { name: 'Select item 2' })
  );
  expect(bar()).toHaveTextContent('1 selected');

  await user.click(screen.getByRole('button', { name: 'Next page' }));

  expect(await screen.findByText('Echo')).toBeVisible();
  expect(checkbox(1)).not.toBeChecked();
  expect(bar()).not.toBeInTheDocument();
});

it('checks the selected row with X, but not while typing', async () => {
  const { user } = renderGrid();

  await screen.findByText('Alpha');
  await user.keyboard('jj');
  await user.keyboard('x');
  expect(checkbox(2)).toBeChecked();
  await user.keyboard('x');
  expect(checkbox(2)).not.toBeChecked();

  await user.click(screen.getByRole('textbox', { name: 'Search' }));
  await user.keyboard('x');
  expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('x');
  expect(bar()).not.toBeInTheDocument();
});

it('opens the details of the selected row with R and focuses the resolution form', async () => {
  const { user } = renderGrid();

  await screen.findByText('Alpha');
  await user.keyboard('jj');
  await user.keyboard('r');

  const details = await screen.findByRole('dialog');
  expect(
    within(details).getByRole('button', { name: 'Reason of Bravo' })
  ).toHaveFocus();
});

it('ignores R while typing and without a selected row', async () => {
  const { user } = renderGrid();

  await screen.findByText('Alpha');
  await user.keyboard('r');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  await user.click(screen.getByRole('textbox', { name: 'Search' }));
  await user.keyboard('r');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('is compiled by React Compiler', () => {
  expect(
    compiledFunctionNames(
      'src/components/data-table-cards/data-table-cards.tsx'
    )
  ).toContain('DataTableCards');
});
