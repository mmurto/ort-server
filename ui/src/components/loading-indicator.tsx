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

/** A quiet loading mark: a thin indeterminate bar that sweeps across a hairline track. */
export const LoadingIndicator = () => {
  return (
    <div className='flex h-full w-full flex-col items-center justify-center py-2'>
      <div className='sr-only'>Loading data...</div>
      <div
        aria-hidden
        className='bg-border relative h-0.5 w-16 overflow-hidden'
      >
        <div className='bg-brand animate-out slide-out-to-right-[400%] repeat-infinite absolute inset-y-0 -left-1/3 w-1/3 duration-[1100ms] ease-in-out' />
      </div>
    </div>
  );
};
