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

import { createPortal } from 'react-dom';

import { useRail } from '@/components/rail-context';
import { Sidebar, SidebarNavProps } from '@/components/sidebar';

interface PageLayoutProps {
  sections: SidebarNavProps['sections'] | undefined;
  topBar?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Lays out a scoped page: its section navigation goes into the app rail, the optional top bar
 * heads the work sheet, and the content fills the rest.
 */
export const PageLayout = ({ sections, topBar, children }: PageLayoutProps) => {
  const { slot } = useRail();

  return (
    <>
      {sections && slot && createPortal(<Sidebar sections={sections} />, slot)}
      {topBar && <div className='w-full'>{topBar}</div>}
      <div className='flex w-full flex-col gap-6'>{children}</div>
    </>
  );
};
