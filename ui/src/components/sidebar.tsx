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

import { Link, LinkProps } from '@tanstack/react-router';

import { railActiveClass, railItemClass } from '@/components/app-rail';
import { cn } from '@/lib/utils';

export interface SidebarNavProps {
  sections: {
    label?: string;
    items: {
      to?: LinkProps['to'];
      params?: LinkProps['params'];
      search?: LinkProps['search'];
      title: string;
      icon?: React.ComponentType<{
        className?: string;
      }>;
      visible?: boolean; // default: true
      activeOptions?: {
        exact?: boolean; // default: true
        includeSearch?: boolean; // default: false
        includeHash?: boolean; // default: false
      };
    }[];
    visible?: boolean; // default: true
  }[];
  className?: string;
}

export const Sidebar = ({ sections, className, ...props }: SidebarNavProps) => {
  return (
    <nav className={cn('flex w-full flex-col', className)} {...props}>
      {sections.map((section, index) => {
        if (section.visible === false) {
          return null;
        }
        return (
          <div key={index} className='flex flex-col'>
            {section.label && (
              <h2 className='text-rail-muted px-5 pt-5 pb-1.5 text-[0.6875rem] leading-4 font-medium tracking-[0.06em] uppercase'>
                {section.label}
              </h2>
            )}
            {!section.label && index > 0 && <div className='h-3' />}
            {section.items.map((item) => {
              const disabled = item.to === undefined;
              return item.visible === undefined || item.visible ? (
                <Link
                  key={item.title}
                  // When a link is disabled, make it point to completely separate
                  // (but existing) route on the server. Otherwise, all disabled links
                  // are grouped together with an existing one in the UI.
                  to={disabled ? '/' : item.to}
                  disabled={disabled}
                  params={item.params}
                  search={item.search}
                  activeProps={{ className: railActiveClass }}
                  inactiveProps={
                    disabled
                      ? { className: 'text-rail-muted/70 pointer-events-none' }
                      : undefined
                  }
                  activeOptions={{
                    exact:
                      item.activeOptions?.exact === undefined
                        ? true
                        : item.activeOptions.exact,
                    includeSearch:
                      item.activeOptions?.includeSearch === undefined
                        ? false
                        : item.activeOptions.includeSearch,
                    includeHash:
                      item.activeOptions?.includeHash === undefined
                        ? false
                        : item.activeOptions.includeHash,
                  }}
                  className={railItemClass}
                >
                  {item.title}
                </Link>
              ) : null;
            })}
          </div>
        );
      })}
    </nav>
  );
};
