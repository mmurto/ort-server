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

import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { OrtRun, PreconfiguredPluginDescriptor } from '@/api';
import { CreateRunForm } from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components/create-run-form';
import {
  createOrtRun,
  createPermissions,
  createPluginDescriptor,
  createPluginSecrets,
} from '../fixtures/create-run';
import { isCompiledByReactCompiler } from '../fixtures/react-compiler';
import { renderInteractiveWithRouter } from '../fixtures/render-interactive';

const advisorPlugin = createPluginDescriptor({
  id: 'OSV',
  type: 'ADVISOR',
  displayName: 'OSV',
  options: [
    {
      name: 'serverUrl',
      type: 'STRING',
      defaultValue: '',
      description: 'The OSV server URL.',
      isFixed: false,
      isNullable: false,
      isRequired: true,
    },
  ],
});

const scannerPlugin = createPluginDescriptor({
  id: 'ScanCode',
  type: 'SCANNER',
  displayName: 'ScanCode',
});
const packageManagerPlugins = [
  createPluginDescriptor({
    id: 'Maven',
    type: 'PACKAGE_MANAGER',
    displayName: 'Maven',
  }),
  createPluginDescriptor({
    id: 'NPM',
    type: 'PACKAGE_MANAGER',
    displayName: 'NPM',
  }),
  createPluginDescriptor({
    id: 'Gradle',
    type: 'PACKAGE_MANAGER',
    displayName: 'Gradle Legacy',
  }),
  // The 'Unmanaged' package manager is always enabled and must not be selectable.
  createPluginDescriptor({
    id: 'Unmanaged',
    type: 'PACKAGE_MANAGER',
    displayName: 'Unmanaged',
  }),
];
const permissions = createPermissions();
const rerun = createOrtRun({
  index: 7,
  revision: '',
  path: '',
  jobConfigs: {},
});
const secrets = createPluginSecrets();
const createRunPath =
  '/organizations/1/products/2/repositories/3/create-run' as const;

const renderCreateRunForm = (onSubmit = vi.fn()) => ({
  onSubmit,
  ...renderInteractiveWithRouter(
    <CreateRunForm
      isSubmitting={false}
      isSuperuser={false}
      onSubmit={onSubmit}
      permissions={permissions}
      plugins={[advisorPlugin, scannerPlugin, ...packageManagerPlugins]}
      rerun={rerun}
      secrets={secrets}
    />,
    {
      path: createRunPath,
      routes: [
        {
          path: '/organizations/$orgId/products/$productId/repositories/$repoId/create-run',
        },
      ],
    }
  ),
});

const renderSwappableForm = (
  initial: PreconfiguredPluginDescriptor[],
  next: PreconfiguredPluginDescriptor[],
  onSubmit = vi.fn(),
  run: OrtRun | null = rerun,
  initiallyLoading = false,
  onConfigContextChange?: (context: string) => void
) => {
  const Harness = () => {
    const [plugins, setPlugins] = useState(initial);
    const [loading, setLoading] = useState(initiallyLoading);
    const [tick, setTick] = useState(0);
    return (
      <>
        <button
          onClick={() => {
            setPlugins(next);
            setLoading(false);
          }}
        >
          Swap plugins
        </button>
        <button onClick={() => setTick(tick + 1)}>Unrelated render</button>
        <CreateRunForm
          isSubmitting={false}
          isSuperuser={false}
          onSubmit={onSubmit}
          onConfigContextChange={onConfigContextChange}
          permissions={permissions}
          plugins={plugins}
          pluginsLoading={loading}
          rerun={run}
          secrets={secrets}
        />
      </>
    );
  };
  return {
    onSubmit,
    ...renderInteractiveWithRouter(<Harness />, {
      path: createRunPath,
      routes: [
        {
          path: '/organizations/$orgId/products/$productId/repositories/$repoId/create-run',
        },
      ],
    }),
  };
};

const enabledPackageManagers = ['Maven', 'NPM', 'Unmanaged'];

const showPayload = async (
  user: ReturnType<typeof renderCreateRunForm>['user']
) => {
  await user.click(await screen.findByRole('button', { name: 'View request' }));
  return screen.getByLabelText(
    'You can copy this payload to use it when triggering runs via the API or CLI.'
  ) as HTMLTextAreaElement;
};

const preview = (textarea: HTMLTextAreaElement) => JSON.parse(textarea.value);

const getJobSwitch = (job: string) => screen.getByRole('switch', { name: job });

const missingServerUrl = 'Required option "serverUrl" is missing for "OSV".';

describe('CreateRunForm', () => {
  // The form takes the plugin defaults as `values` and keeps dirty values when
  // they change, which React Hook Form reports as fragile under React Compiler.
  // The tests below run on the compiled form.
  it('is compiled with React Compiler', () => {
    expect(isCompiledByReactCompiler(CreateRunForm)).toBe(true);
  });

  it('previews the complete defaults for new runs and reruns', async () => {
    const { user: newRunUser } = renderSwappableForm(
      [advisorPlugin, scannerPlugin, ...packageManagerPlugins],
      [],
      vi.fn(),
      null
    );
    const newRunPayload = await showPayload(newRunUser);
    expect(preview(newRunPayload)).toMatchObject({
      revision: '',
      path: '',
      jobConfigContext: '',
      jobConfigs: {
        analyzer: { enabledPackageManagers },
      },
    });

    cleanup();
    // Render a rerun with distinct defaults in the same harness.
    const run = createOrtRun({
      revision: 'release',
      path: 'module',
      jobConfigContext: 'config-ref',
    });
    const { user: rerunUser } = renderSwappableForm(
      [advisorPlugin, scannerPlugin, ...packageManagerPlugins],
      [],
      vi.fn(),
      run
    );
    const rerunPayload = await showPayload(rerunUser);
    expect(preview(rerunPayload)).toMatchObject({
      revision: 'release',
      path: 'module',
      jobConfigContext: 'config-ref',
      jobConfigs: { analyzer: { enabledPackageManagers } },
    });
  });

  it('updates the preview and clipboard for edited fields and nested values', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    const { user } = renderCreateRunForm();
    const payload = await showPayload(user);

    await user.type(screen.getByLabelText('Revision'), 'feature');
    await user.click(getJobSwitch('Advisor'));
    await user.type(screen.getByLabelText(/serverUrl/), 'https://osv.dev');
    await user.click(screen.getByRole('button', { name: 'Add parameter' }));
    await user.type(screen.getAllByLabelText('Key').at(-1)!, 'branch');
    await user.type(screen.getAllByLabelText('Value').at(-1)!, 'feature');
    await user.click(screen.getByRole('button', { name: 'Add label' }));
    await user.type(screen.getAllByLabelText('Key').at(-1)!, 'team');
    await user.type(screen.getAllByLabelText('Value').at(-1)!, 'ort');

    expect(preview(payload)).toMatchObject({
      revision: 'feature',
      labels: { team: 'ort' },
      jobConfigs: {
        parameters: { branch: 'feature' },
        advisor: {
          config: { OSV: { options: { serverUrl: 'https://osv.dev' } } },
        },
      },
    });
    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(writeText).toHaveBeenCalledWith(payload.value);
  }, 10_000);

  it('previews refreshed plugin defaults while preserving edits and pruning removed plugins', async () => {
    const changedOsv = createPluginDescriptor({
      ...advisorPlugin,
      options: [
        { ...advisorPlugin.options[0], defaultValue: 'https://new.example' },
      ],
    });
    const { user } = renderSwappableForm(
      [advisorPlugin, scannerPlugin, packageManagerPlugins[0]!],
      [changedOsv, ...packageManagerPlugins]
    );
    const payload = await showPayload(user);
    await user.type(screen.getByLabelText('Revision'), 'feature');
    await user.click(getJobSwitch('Advisor'));
    await user.click(getJobSwitch('Scanner'));
    expect(preview(payload).jobConfigs.scanner.scanners).toEqual(['ScanCode']);

    await user.click(screen.getByRole('button', { name: 'Swap plugins' }));
    await waitFor(() => {
      expect(preview(payload)).toMatchObject({
        revision: 'feature',
        jobConfigs: {
          analyzer: { enabledPackageManagers },
          advisor: { advisors: ['OSV'] },
          scanner: { skipConcluded: true },
        },
      });
    });
    expect(preview(payload).jobConfigs.scanner).not.toHaveProperty('scanners');
    expect(preview(payload).jobConfigs.advisor).not.toHaveProperty('config');
    // OSV was expanded when the Advisor was enabled, as its required option was missing.
    expect(screen.getByLabelText(/serverUrl/)).toHaveValue(
      'https://new.example'
    );
  });

  it('debounces configuration context changes, including after plugins reload', async () => {
    const onContextChange = vi.fn();
    const { user } = renderSwappableForm(
      [advisorPlugin, scannerPlugin],
      [advisorPlugin, scannerPlugin, ...packageManagerPlugins],
      vi.fn(),
      rerun,
      false,
      onContextChange
    );
    await waitFor(() => expect(onContextChange).toHaveBeenCalledWith(''));
    onContextChange.mockClear();

    await user.type(screen.getByLabelText('Configuration context'), 'first');
    await user.clear(screen.getByLabelText('Configuration context'));
    await user.type(screen.getByLabelText('Configuration context'), 'latest');
    expect(onContextChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onContextChange).toHaveBeenCalledWith('latest'));
    expect(onContextChange).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Swap plugins' }));
    onContextChange.mockClear();
    await user.clear(screen.getByLabelText('Configuration context'));
    await user.type(
      screen.getByLabelText('Configuration context'),
      'after-reload'
    );
    expect(onContextChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(onContextChange).toHaveBeenCalledWith('after-reload')
    );
    expect(onContextChange).toHaveBeenCalledTimes(1);
  });

  it('keeps basic inputs editable and blocks creation while plugins load', async () => {
    const loadedAdvisor = createPluginDescriptor({
      ...advisorPlugin,
      options: [
        { ...advisorPlugin.options[0], defaultValue: 'https://osv.dev' },
      ],
    });
    const { user, onSubmit } = renderSwappableForm(
      [],
      [loadedAdvisor, scannerPlugin, ...packageManagerPlugins],
      vi.fn(),
      rerun,
      true
    );
    const button = await screen.findByRole('button', {
      name: 'Plugins loading...',
    });
    expect(button).toBeDisabled();
    expect(within(button).queryByText('Starting run...')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start run' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Advisor' })).toBeNull();
    expect(screen.getByText('Loading available plugins...')).toBeVisible();
    expect(screen.getByRole('button', { name: 'View request' })).toBeDisabled();

    await user.type(screen.getByLabelText('Revision'), 'feature');
    await user.click(screen.getByRole('button', { name: 'Swap plugins' }));
    expect(screen.getByLabelText('Revision')).toHaveValue('feature');
    expect(screen.queryByText('Loading available plugins...')).toBeNull();
    expect(screen.getByRole('button', { name: 'Start run' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Start run' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        revision: 'feature',
        jobConfigs: expect.objectContaining({
          analyzer: expect.objectContaining({ enabledPackageManagers }),
        }),
      })
    );
  });

  it('blocks creation if the plugins could not be loaded', async () => {
    const onSubmit = vi.fn();
    const { user } = renderInteractiveWithRouter(
      <CreateRunForm
        isSubmitting={false}
        isSuperuser={false}
        onSubmit={onSubmit}
        permissions={permissions}
        plugins={[]}
        pluginsLoadFailed
        rerun={rerun}
        secrets={secrets}
      />,
      {
        path: createRunPath,
        routes: [
          {
            path: '/organizations/$orgId/products/$productId/repositories/$repoId/create-run',
          },
        ],
      }
    );

    expect(
      await screen.findByText('The available plugins could not be loaded.')
    ).toBeVisible();
    expect(screen.queryByRole('switch', { name: 'Advisor' })).toBeNull();
    expect(screen.getByRole('button', { name: 'View request' })).toBeDisabled();
    const button = screen.getByRole('button', { name: 'Start run' });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('Revision'), 'feature');
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the payload produced from entered form values', async () => {
    const { onSubmit, user } = renderCreateRunForm();

    await user.type(await screen.findByLabelText('Revision'), 'main');
    await user.type(screen.getByLabelText('Path'), 'src');
    await user.click(getJobSwitch('Advisor'));
    await user.type(screen.getByLabelText(/serverUrl/), 'https://osv.dev');
    await user.click(getJobSwitch('Scanner'));
    await user.click(screen.getByRole('button', { name: 'Start run' }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({
      revision: 'main',
      path: 'src',
      jobConfigs: {
        analyzer: {
          allowDynamicVersions: true,
          repositoryConfigPath: undefined,
          skipExcluded: true,
          enabledPackageManagers,
          packageManagerOptions: undefined,
          packageCurationProviders: undefined,
          keepAliveWorker: undefined,
          keepAlivePhases: undefined,
        },
        advisor: {
          skipExcluded: true,
          advisors: ['OSV', 'VulnerableCode'],
          config: {
            OSV: {
              options: { serverUrl: 'https://osv.dev' },
              secrets: {},
            },
          },
          keepAliveWorker: undefined,
        },
        scanner: {
          skipConcluded: true,
          skipExcluded: true,
          keepAliveWorker: undefined,
          scanners: ['ScanCode'],
          projectScanners: undefined,
          config: undefined,
        },
        evaluator: undefined,
        reporter: undefined,
        notifier: undefined,
        parameters: {},
      },
      labels: {},
      jobConfigContext: '',
      environmentConfigPath: '',
    });
  });

  it('shows validation errors without submitting an invalid form', async () => {
    const { onSubmit, user } = renderCreateRunForm();

    await user.click(await screen.findByRole('switch', { name: 'Advisor' }));
    await user.click(screen.getByRole('button', { name: 'Start run' }));

    expect(
      await screen.findByText(
        'Required option "serverUrl" is missing for "OSV".'
      )
    ).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('applies new plugin defaults without replacing user edits', async () => {
    const newAdvisor = createPluginDescriptor({
      id: 'NewAdvisor',
      type: 'ADVISOR',
      displayName: 'New Advisor',
      options: [
        {
          name: 'token',
          type: 'STRING',
          defaultValue: 'configured',
          description: '',
          isFixed: false,
          isNullable: false,
          isRequired: true,
        },
      ],
    });
    const changedOsv = createPluginDescriptor({
      ...advisorPlugin,
      options: [
        { ...advisorPlugin.options[0], defaultValue: 'https://new.example' },
      ],
    });
    const { user, onSubmit } = renderSwappableForm(
      [advisorPlugin, scannerPlugin, ...packageManagerPlugins],
      [changedOsv, newAdvisor, scannerPlugin, ...packageManagerPlugins]
    );
    await user.type(await screen.findByLabelText('Revision'), 'feature');
    await user.type(screen.getByLabelText('Configuration context'), 'ctx');
    await user.click(screen.getByRole('button', { name: 'Add label' }));
    await user.type(screen.getAllByLabelText('Key').at(-1)!, 'team');
    await user.type(screen.getAllByLabelText('Value').at(-1)!, 'ort');
    await user.click(getJobSwitch('Advisor'));
    await user.click(screen.getByRole('button', { name: 'Swap plugins' }));
    // OSV was expanded when the Advisor was enabled, as its required option was missing.
    expect(screen.getByLabelText(/serverUrl/)).toHaveValue(
      'https://new.example'
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Enable New Advisor' })
    );
    await user.click(screen.getByRole('button', { name: 'Start run' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        revision: 'feature',
        jobConfigContext: 'ctx',
        labels: { team: 'ort' },
        jobConfigs: expect.objectContaining({
          advisor: expect.objectContaining({
            advisors: expect.arrayContaining(['NewAdvisor']),
            config: undefined,
          }),
        }),
      })
    );
  });

  it('keeps typed option overrides and clears obsolete validation errors on a plugin change', async () => {
    const changed = createPluginDescriptor({
      ...advisorPlugin,
      options: [
        { ...advisorPlugin.options[0], defaultValue: 'https://new.example' },
      ],
    });
    const { user, onSubmit } = renderSwappableForm(
      [advisorPlugin, scannerPlugin],
      [changed, scannerPlugin]
    );
    await screen.findByRole('switch', { name: 'Advisor' });
    await user.click(getJobSwitch('Advisor'));
    await user.click(screen.getByRole('button', { name: 'Start run' }));
    expect(
      await screen.findByText(
        'Required option "serverUrl" is missing for "OSV".'
      )
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Unrelated render' }));
    expect(
      screen.getByText('Required option "serverUrl" is missing for "OSV".')
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Swap plugins' }));
    expect(
      screen.queryByText('Required option "serverUrl" is missing for "OSV".')
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Start run' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('preserves a typed option when its plugin default changes', async () => {
    const changed = createPluginDescriptor({
      ...advisorPlugin,
      options: [
        { ...advisorPlugin.options[0], defaultValue: 'https://new.example' },
      ],
    });
    const { user, onSubmit } = renderSwappableForm(
      [advisorPlugin, scannerPlugin],
      [changed, scannerPlugin]
    );
    await screen.findByRole('switch', { name: 'Advisor' });
    await user.click(getJobSwitch('Advisor'));
    await user.type(
      screen.getByLabelText(/serverUrl/),
      'https://custom.example'
    );
    await user.click(screen.getByRole('button', { name: 'Swap plugins' }));
    expect(screen.getByLabelText(/serverUrl/)).toHaveValue(
      'https://custom.example'
    );
    await user.click(screen.getByRole('button', { name: 'Start run' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        jobConfigs: expect.objectContaining({
          advisor: expect.objectContaining({
            config: {
              OSV: {
                options: { serverUrl: 'https://custom.example' },
                secrets: {},
              },
            },
          }),
        }),
      })
    );
  });

  it('prunes unavailable base and dirty plugin selections and dependencies', async () => {
    const { user, onSubmit } = renderSwappableForm(
      [advisorPlugin, scannerPlugin, ...packageManagerPlugins],
      []
    );
    await screen.findByRole('switch', { name: 'Advisor' });
    await user.click(getJobSwitch('Advisor'));
    await user.click(getJobSwitch('Scanner'));
    await user.click(
      await screen.findByRole('button', { name: 'Swap plugins' })
    );
    await user.click(screen.getByRole('button', { name: 'Start run' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        jobConfigs: expect.objectContaining({
          analyzer: expect.objectContaining({
            enabledPackageManagers: ['Unmanaged'],
          }),
          advisor: expect.objectContaining({ advisors: [], config: undefined }),
          scanner: expect.objectContaining({
            scanners: undefined,
            config: undefined,
          }),
        }),
      })
    );
  });

  it('removes unavailable rerun plugins, scopes and package-manager dependencies', async () => {
    const provider = createPluginDescriptor({
      id: 'Curator',
      type: 'PACKAGE_CURATION_PROVIDER',
    });
    const configProvider = createPluginDescriptor({
      id: 'Config',
      type: 'PACKAGE_CONFIGURATION_PROVIDER',
    });
    const reporter = createPluginDescriptor({
      id: 'CycloneDX',
      type: 'REPORTER',
    });
    const extraScanner = createPluginDescriptor({
      id: 'ExtraScanner',
      type: 'SCANNER',
    });
    const run = createOrtRun({
      jobConfigs: {
        analyzer: {
          enabledPackageManagers: ['Maven', 'NPM'],
          packageManagerOptions: {
            Maven: { mustRunAfter: ['NPM'] },
            NPM: { mustRunAfter: ['Maven'] },
          },
          packageCurationProviders: [{ type: 'Curator' }],
        },
        advisor: {
          advisors: ['OSV'],
          config: { OSV: { options: { serverUrl: 'https://old.example' } } },
        },
        scanner: {
          scanners: ['ScanCode', 'ExtraScanner'],
          projectScanners: ['ExtraScanner'],
        },
        evaluator: { packageConfigurationProviders: [{ type: 'Config' }] },
        reporter: {
          formats: ['CycloneDX'],
          packageConfigurationProviders: [{ type: 'Config' }],
        },
      },
    });
    const { user, onSubmit } = renderSwappableForm(
      [
        advisorPlugin,
        scannerPlugin,
        extraScanner,
        reporter,
        provider,
        configProvider,
        ...packageManagerPlugins,
      ],
      [packageManagerPlugins[0]!],
      vi.fn(),
      run
    );
    await user.click(
      await screen.findByRole('button', { name: 'Swap plugins' })
    );
    await user.click(screen.getByRole('button', { name: 'Start run' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        jobConfigs: expect.objectContaining({
          analyzer: expect.objectContaining({
            enabledPackageManagers: ['Maven', 'Unmanaged'],
            packageCurationProviders: undefined,
            packageManagerOptions: undefined,
          }),
          advisor: expect.objectContaining({ advisors: [], config: undefined }),
          scanner: expect.objectContaining({
            scanners: undefined,
            projectScanners: undefined,
            config: undefined,
          }),
          evaluator: expect.objectContaining({
            packageConfigurationProviders: undefined,
          }),
          reporter: expect.objectContaining({
            formats: [],
            packageConfigurationProviders: undefined,
            config: undefined,
          }),
        }),
      })
    );
  });

  it('does not offer the always enabled "Unmanaged" package manager for selection', async () => {
    renderCreateRunForm();

    await screen.findByRole('switch', { name: 'Analyzer' });

    const packageManagers = screen
      .getByText('Enabled package managers')
      .closest<HTMLElement>('[data-slot="form-item"]')!;

    expect(within(packageManagers).getByText('Maven')).toBeVisible();
    expect(within(packageManagers).queryByText('Unmanaged')).toBeNull();
  });

  it('lists validation errors with readable labels and focuses the first invalid field', async () => {
    const { user } = renderCreateRunForm();
    await user.click(await screen.findByRole('switch', { name: 'Advisor' }));
    await user.click(screen.getByRole('button', { name: 'Start run' }));

    const summary = await screen.findByRole('region', {
      name: 'Fix 1 problem to start the run',
    });
    expect(within(summary).getByText(missingServerUrl)).toBeVisible();
    await waitFor(() =>
      expect(screen.getByLabelText(/serverUrl/)).toHaveFocus()
    );
    expect(screen.getByText('1 problem to fix')).toBeVisible();

    // The links in the list move the focus back to the field.
    await user.click(screen.getByLabelText('Revision'));
    await user.click(
      within(summary).getByRole('link', { name: 'Advisor › OSV › serverUrl' })
    );
    expect(screen.getByLabelText(/serverUrl/)).toHaveFocus();

    // The section navigation marks the section with the error.
    const navigation = screen.getByRole('navigation', {
      name: 'Form sections',
    });
    expect(
      within(navigation).getByRole('link', { name: /^Advisor/ })
    ).toHaveTextContent('has errors');
    expect(
      within(navigation).getByRole('link', { name: /^Scanner/ })
    ).not.toHaveTextContent('has errors');

    // Fixing the field removes the error from the list.
    await user.type(screen.getByLabelText(/serverUrl/), 'https://osv.dev');
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: /to start the run$/ })
      ).toBeNull()
    );
    expect(
      within(navigation).getByRole('link', { name: /^Advisor/ })
    ).not.toHaveTextContent('has errors');
  });

  it('does not let the options of a disabled job block the run', async () => {
    const { onSubmit, user } = renderCreateRunForm();
    expect(
      within(await screen.findByRole('region', { name: 'Advisor' })).getByText(
        'Not included in this run'
      )
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Start run' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.queryByText(missingServerUrl)).toBeNull();
  });

  it('summarizes the values of each section in its header', async () => {
    const { user } = renderSwappableForm(
      [advisorPlugin, scannerPlugin, ...packageManagerPlugins],
      [],
      vi.fn(),
      null
    );
    const summaryOf = (name: string) =>
      within(screen.getByRole('region', { name })).getAllByRole('paragraph')[0];

    await screen.findByRole('region', { name: 'Analyzer' });
    expect(summaryOf('Source and configuration')).toHaveTextContent(
      'Default branch'
    );
    expect(summaryOf('Configuration parameters')).toHaveTextContent(
      'No parameters'
    );
    expect(summaryOf('Analyzer')).toHaveTextContent('2 package managers');
    expect(summaryOf('Advisor')).toHaveTextContent('OSV, VulnerableCode');
    expect(summaryOf('Scanner')).toHaveTextContent('ScanCode');
    expect(summaryOf('Reporter')).toHaveTextContent(
      'CycloneDX, SpdxDocument, WebApp'
    );
    expect(summaryOf('Notifier')).toHaveTextContent('Not included in this run');

    await user.type(screen.getByLabelText('Revision'), 'release');
    await user.type(screen.getByLabelText('Path'), 'module');
    expect(summaryOf('Source and configuration')).toHaveTextContent(
      'release · Path module'
    );
    await user.click(getJobSwitch('Notifier'));
    expect(summaryOf('Notifier')).toHaveTextContent('No recipients');
  });

  it('shows the state of each job in the section navigation', async () => {
    const { user } = renderCreateRunForm();
    const navigation = await screen.findByRole('navigation', {
      name: 'Form sections',
    });

    expect(
      within(navigation)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual([
      'Source',
      'Parameters',
      'Labels',
      'Analyzer',
      'AdvisorOff',
      'ScannerOff',
      'EvaluatorOff',
      'ReporterOff',
      'NotifierOff',
    ]);

    await user.click(getJobSwitch('Scanner'));
    expect(
      within(navigation).getByRole('link', { name: /^Scanner/ })
    ).toHaveTextContent(/^Scanner$/);

    await user.click(
      within(navigation).getByRole('link', { name: /^Reporter/ })
    );
    expect(screen.getByRole('heading', { name: 'Reporter' })).toHaveFocus();
  });

  it('notes the run that a rerun copies its configuration from', async () => {
    renderCreateRunForm();

    const note = await screen.findByText(/Configuration copied from/);
    expect(within(note).getByRole('link', { name: 'run 7' })).toHaveAttribute(
      'href',
      '/organizations/1/products/2/repositories/3/runs/7'
    );
    expect(screen.getByText('Based on run 7')).toBeVisible();

    cleanup();
    renderSwappableForm([advisorPlugin], [], vi.fn(), null);
    await screen.findByRole('button', { name: 'Start run' });
    expect(screen.queryByText(/Configuration copied from/)).toBeNull();
    expect(screen.queryByText(/Based on run/)).toBeNull();
  });

  it('shows and hides the request from the action bar', async () => {
    const { user } = renderCreateRunForm();
    const toggle = await screen.findByRole('button', { name: 'View request' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'Request' })).toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Request' })).toBeVisible();

    await user.click(toggle);
    expect(screen.queryByRole('region', { name: 'Request' })).toBeNull();
  });
});
