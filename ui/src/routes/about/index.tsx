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

import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { Fragment } from 'react';

import { getVersionsOptions } from '@/api/@tanstack/react-query.gen';
import { PageHeader, SheetSection } from '@/components/page-header';
import { ORT_SERVER_GITHUB_RELEASES_BASE_URL } from '@/lib/constants';

export const About = () => {
  const { data: versionData } = useSuspenseQuery({
    ...getVersionsOptions(),
  });

  // Check if the ORT Server version is a release candidate (RC) version
  // by looking for the '-RC.' substring in the version string.
  // If it is, use the latest release download URL.
  // Otherwise, use the specific version download URL.
  const ortServerVersion = versionData['ORT Server'];
  const isVersionCandidate = ortServerVersion?.includes('-RC.');
  const baseUrl = isVersionCandidate
    ? `${ORT_SERVER_GITHUB_RELEASES_BASE_URL}/latest/download`
    : `${ORT_SERVER_GITHUB_RELEASES_BASE_URL}/download/${ortServerVersion}`;

  const ortServerVersionInfo = {
    label: 'ORT Server',
    version: ortServerVersion,
    releaseUrl: `${ORT_SERVER_GITHUB_RELEASES_BASE_URL}/tag/${ortServerVersion}`,
    homepageUrl: 'https://eclipse-apoapsis.github.io/ort-server/',
  };

  const ortCoreVersion = versionData['ORT Core'];
  const ortCoreVersionInfo = {
    label: 'ORT Core',
    version: ortCoreVersion,
    releaseUrl: `https://github.com/oss-review-toolkit/ort/releases/tag/${ortCoreVersion}`,
    homepageUrl: 'https://oss-review-toolkit.org/',
  };

  const downloads = [
    {
      label: 'Linux',
      file: 'osc-cli-linux-x64.tar.gz',
      name: 'osc-cli-linux-x64',
    },
    {
      label: 'macOS (ARM64)',
      file: 'osc-cli-macos-arm64.tar.gz',
      name: 'osc-cli-macos-arm64',
    },
    {
      label: 'macOS (x64)',
      file: 'osc-cli-macos-x64.tar.gz',
      name: 'osc-cli-macos-x64',
    },
    {
      label: 'Windows',
      file: 'osc-cli-windows-x64.zip',
      name: 'osc-cli-windows-x64',
    },
  ];

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader title='About' />
      <SheetSection title='Version Information'>
        <dl className='grid max-w-2xl grid-cols-[10rem_1fr] border-t text-[0.8125rem]'>
          {[ortServerVersionInfo, ortCoreVersionInfo].map((info) => (
            <Fragment key={info.label}>
              <dt className='text-muted-foreground flex items-center gap-1 border-b py-2.5'>
                {info.label}
                <Link
                  to={info.homepageUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='hover:text-foreground inline-block'
                >
                  <ExternalLink className='size-3.5' />
                  <span className='sr-only'>{info.label} homepage</span>
                </Link>
              </dt>
              <dd className='border-b py-2.5'>
                <Link
                  to={info.releaseUrl}
                  className='link font-mono text-xs'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {info.version}
                </Link>
              </dd>
            </Fragment>
          ))}
        </dl>
      </SheetSection>
      <SheetSection title='ORT Server Client (osc) Download'>
        <dl className='grid max-w-2xl grid-cols-[10rem_1fr] border-t text-[0.8125rem]'>
          {downloads.map((download) => (
            <Fragment key={download.file}>
              <dt className='text-muted-foreground border-b py-2.5'>
                {download.label}
              </dt>
              <dd className='border-b py-2.5'>
                <a
                  href={`${baseUrl}/${download.file}`}
                  className='link font-mono text-xs'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {download.name}
                </a>
              </dd>
            </Fragment>
          ))}
        </dl>
      </SheetSection>
    </div>
  );
};

export const Route = createFileRoute('/about/')({
  component: About,
});
