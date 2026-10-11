/*
 * Copyright (C) 2025 The ORT Server Authors (See <https://github.com/eclipse-apoapsis/ort-server/blob/main/NOTICE>)
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

import { Eye, Pen, Shield } from 'lucide-react';
import { useState } from 'react';

import { UserGroup, UserWithGroups } from '@/api';
import { ConfirmDialog } from '@/components/confirm-dialog.tsx';
import { EllipsisIconButton } from '@/components/ellipsis-icon-button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import type { AppRow } from '@/hooks/use-app-table';

type Role = 'ADMIN' | 'WRITER' | 'READER';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  WRITER: 'Writer',
  READER: 'Reader',
};

/** The highest role represented by the given groups, if any. */
const getCurrentRole = (groups: UserGroup[]): Role | undefined => {
  if (groups.includes('ADMINS')) return 'ADMIN';
  if (groups.includes('WRITERS')) return 'WRITER';
  if (groups.includes('READERS')) return 'READER';
  return undefined;
};

type UserRoleRowActionsProps = {
  row: AppRow<UserWithGroups>;
  onAssignAdminRole: (user: UserWithGroups) => Promise<void>;
  onAssignWriterRole: (user: UserWithGroups) => Promise<void>;
  onAssignReaderRole: (user: UserWithGroups) => Promise<void>;
  disabled: boolean;
};

/**
 * Render actions for assigning hierarchy roles to a user. A role is only assigned after the change
 * has been confirmed, because it takes effect immediately.
 *
 * @param {UserRoleRowActionsProps} props - The props for the component.
 * @returns {JSX.Element} The rendered component.
 */
export function UserRoleRowActions({
  row,
  onAssignAdminRole,
  onAssignWriterRole,
  onAssignReaderRole,
  ...nativeButtonAttributes // From standard HTML button attributes
}: UserRoleRowActionsProps) {
  const userWithGroups: UserWithGroups = row.original;
  const groups: UserGroup[] = row.original.groups;
  const username = row.original.user.username;
  const currentRole = getCurrentRole(groups);
  const [requestedRole, setRequestedRole] = useState<Role | null>(null);

  const assignRole = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return onAssignAdminRole(userWithGroups);
      case 'WRITER':
        return onAssignWriterRole(userWithGroups);
      case 'READER':
        return onAssignReaderRole(userWithGroups);
    }
  };

  return (
    <>
      {/* Not modal, so that the menu has let go of the page before the confirmation opens. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <EllipsisIconButton {...nativeButtonAttributes} />
        </DropdownMenuTrigger>

        <DropdownMenuContent side='bottom' align='end'>
          {!groups.includes('ADMINS') && (
            <DropdownMenuItem onSelect={() => setRequestedRole('ADMIN')}>
              <div className='flex items-center gap-x-2'>
                <span>Assign ADMIN role</span>
                <Shield size={16} />
              </div>
            </DropdownMenuItem>
          )}

          {!groups.includes('WRITERS') && (
            <DropdownMenuItem onSelect={() => setRequestedRole('WRITER')}>
              <div className='flex items-center gap-x-2'>
                <span>Assign WRITER role</span>
                <Pen size={16} />
              </div>
            </DropdownMenuItem>
          )}

          {!groups.includes('READERS') && (
            <DropdownMenuItem onSelect={() => setRequestedRole('READER')}>
              <div className='flex items-center gap-x-2'>
                <span>Assign READER role</span>
                <Eye size={16} />
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={requestedRole !== null}
        onOpenChange={(open) => {
          if (!open) setRequestedRole(null);
        }}
        title={
          requestedRole &&
          (currentRole
            ? `Change ${username}'s role from ${roleLabels[currentRole]} to ${roleLabels[requestedRole]}?`
            : `Give ${username} the ${roleLabels[requestedRole]} role?`)
        }
        description='The new role takes effect immediately.'
        confirmLabel='Change role'
        onConfirm={() =>
          requestedRole ? assignRole(requestedRole) : undefined
        }
      />
    </>
  );
}
