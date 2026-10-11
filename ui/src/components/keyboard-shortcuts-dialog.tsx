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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

const groups: { title: string; shortcuts: [string[], string][] }[] = [
  {
    title: 'Everywhere',
    shortcuts: [
      [
        [isMac ? '⌘' : 'Ctrl', 'K'],
        'Go to an organization, product, repository or run',
      ],
      [['/'], 'Go to…'],
      [['?'], 'Show these shortcuts'],
    ],
  },
  {
    title: 'Lists of findings',
    shortcuts: [
      [['J'], 'Next item'],
      [['K'], 'Previous item'],
      [['↓', '↑'], 'Next or previous item, in the list'],
      [['Enter'], 'Open or close the details'],
      [['Esc'], 'Close the details'],
      [['R'], 'Resolve the selected item'],
      [['X'], 'Select the item for a bulk action'],
    ],
  },
];

/** Lists the keyboard shortcuts of the UI. */
export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Shortcuts work while you are not typing in a field.
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-5'>
          {groups.map((group) => (
            <section key={group.title} className='flex flex-col gap-1.5'>
              <h3 className='label-caps'>{group.title}</h3>
              <dl className='flex flex-col divide-y border-y text-[0.8125rem]'>
                {group.shortcuts.map(([keys, description]) => (
                  <div
                    key={description}
                    className='flex items-center justify-between gap-4 py-1.5'
                  >
                    <dt className='text-muted-foreground'>{description}</dt>
                    <dd className='flex shrink-0 gap-1'>
                      {keys.map((key) => (
                        <kbd
                          key={key}
                          className='bg-muted min-w-6 rounded-xs border px-1.5 text-center font-mono text-[0.6875rem]'
                        >
                          {key}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
