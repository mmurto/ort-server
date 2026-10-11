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

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import {
  defaultValues,
  type CreateRunFormValues,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/_repo-layout/create-run/-components';
import {
  AdvisorFields,
  AnalyzerFields,
  EvaluatorFields,
  NotifierFields,
  ReporterFields,
  ScannerFields,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components';
import {
  createPackageCurationProviderPlugins,
  createPermissions,
  createPluginDescriptor,
  createPluginSecrets,
} from '../fixtures/create-run';
import {
  createStableFormHarness,
  renderWithForm,
  renderWithStableForm,
} from '../fixtures/form-harness';
import {
  createTestRouter,
  renderStaticWithRouter,
  RouterTestProvider,
} from '../fixtures/router-harness';

const advisorPlugins = [
  createPluginDescriptor({
    id: 'OSV',
    type: 'ADVISOR',
    displayName: 'OSV',
  }),
];
const scannerPlugins = [
  createPluginDescriptor({
    id: 'ScanCode',
    type: 'SCANNER',
    displayName: 'ScanCode',
  }),
];
const reporterPlugins = ['CycloneDX', 'SpdxDocument', 'WebApp'].map((id) =>
  createPluginDescriptor({ id, type: 'REPORTER', displayName: id })
);
const packageConfigurationProviderPlugins = [
  createPluginDescriptor({
    id: 'OrtConfig',
    type: 'PACKAGE_CONFIGURATION_PROVIDER',
    displayName: 'ORT configuration',
  }),
];
const packageCurationProviderPlugins = createPackageCurationProviderPlugins();
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
];
const permissions = createPermissions();
const secrets = createPluginSecrets();
const formDefaultValues = defaultValues(
  null,
  advisorPlugins,
  scannerPlugins,
  reporterPlugins,
  true,
  [],
  packageConfigurationProviderPlugins,
  packageManagerPlugins
);

type JobFieldsTestCase = {
  name: string;
  title: string;
  summary: string;
  contentLabel: string;
  render: (form: UseFormReturn<CreateRunFormValues>) => ReactNode;
};

const renderAnalyzerFields = (form: UseFormReturn<CreateRunFormValues>) => (
  <AnalyzerFields
    form={form}
    isSuperuser
    packageCurationProviderPlugins={packageCurationProviderPlugins}
    packageManagerPlugins={packageManagerPlugins}
    pluginSecrets={secrets}
    isRerun={false}
    permissions={permissions}
  />
);

const AnalyzerFieldsHarness = () => {
  const form = useForm<CreateRunFormValues>({
    defaultValues: formDefaultValues,
  });

  return <FormProvider {...form}>{renderAnalyzerFields(form)}</FormProvider>;
};

const analyzerRoute = {
  path: '/organizations/1/products/2/repositories/3',
  routes: [
    {
      path: '/organizations/$orgId/products/$productId/repositories/$repoId',
    },
  ],
};

/** Render a form harness with the analyzer fields inside a router, as they need the route params. */
const renderInteractiveAnalyzer = async (
  values: CreateRunFormValues = formDefaultValues
) => {
  const user = userEvent.setup();
  const { StableFormHarness, getForm } = createStableFormHarness(
    renderAnalyzerFields,
    { defaultValues: values }
  );
  const router = createTestRouter({
    ...analyzerRoute,
    routes: [{ ...analyzerRoute.routes[0]!, component: StableFormHarness }],
  });
  await router.load();
  render(<RouterTestProvider router={router} />);
  await screen.findByRole('heading', { name: 'Analyzer' });
  return { user, getForm };
};

const testCases: JobFieldsTestCase[] = [
  {
    name: 'advisor',
    title: 'Advisor',
    summary: 'OSV, VulnerableCode',
    contentLabel: 'Skip excluded',
    render: (form) => (
      <AdvisorFields
        form={form}
        advisorPlugins={advisorPlugins}
        secrets={secrets}
        isSuperuser
      />
    ),
  },
  {
    name: 'evaluator',
    title: 'Evaluator',
    summary: 'No package configuration providers',
    contentLabel: 'Package configuration providers',
    render: (form) => (
      <EvaluatorFields
        form={form}
        isSuperuser
        packageConfigurationProviderPlugins={
          packageConfigurationProviderPlugins
        }
        secrets={secrets}
        isRerun={false}
      />
    ),
  },
  {
    name: 'reporter',
    title: 'Reporter',
    summary: 'CycloneDX, SpdxDocument, WebApp',
    contentLabel: 'Report formats',
    render: (form) => (
      <ReporterFields
        form={form}
        reporterPlugins={reporterPlugins}
        isSuperuser
        packageConfigurationProviderPlugins={
          packageConfigurationProviderPlugins
        }
        secrets={secrets}
        isRerun={false}
      />
    ),
  },
  {
    name: 'scanner',
    title: 'Scanner',
    summary: 'ScanCode',
    contentLabel: 'Skip concluded',
    render: (form) => (
      <ScannerFields
        form={form}
        scannerPlugins={scannerPlugins}
        secrets={secrets}
        isSuperuser
      />
    ),
  },
];

const renderNotifier = (form: UseFormReturn<CreateRunFormValues>) => (
  <NotifierFields form={form} isSuperuser />
);

const withJobEnabled = (
  job: 'advisor' | 'notifier',
  enabled: boolean
): CreateRunFormValues => ({
  ...formDefaultValues,
  jobConfigs: {
    ...formDefaultValues.jobConfigs,
    [job]: { ...formDefaultValues.jobConfigs[job], enabled },
  },
});

describe('create run job fields', () => {
  it.each(testCases)(
    'renders the enabled $name section with its switch, summary and settings',
    ({ title, summary, contentLabel, render }) => {
      const markup = renderWithForm(render, {
        defaultValues: formDefaultValues,
      });

      expect(markup).toContain(`>${title}</h2>`);
      expect(markup).toContain(summary);
      expect(markup).toContain(contentLabel);
      // The switch in the header is named by the section heading.
      expect(markup).toMatch(
        new RegExp(
          `role="switch"[^>]*aria-checked="true"[^>]*aria-labelledby="create-run-${title.toLowerCase()}-title"|aria-labelledby="create-run-${title.toLowerCase()}-title"[^>]*role="switch"`
        )
      );
    }
  );

  it('renders the analyzer section with its package managers and a summary', async () => {
    const markup = await renderStaticWithRouter(
      <AnalyzerFieldsHarness />,
      analyzerRoute
    );

    expect(markup).toContain('>Analyzer</h2>');
    expect(markup).toContain('2 package managers');
    expect(markup).toContain('Enabled package managers');
    expect(markup).toContain('Maven');
    expect(markup).toContain('NPM');
    // The package managers start collapsed, so their settings are not rendered.
    expect(markup).toContain('Expand all');
    expect(markup).not.toContain('Must run after');
    // The less common settings are behind "More options".
    expect(markup).toContain('More options');
    expect(markup).not.toContain('Repository configuration path');
  });

  it('collapses a disabled job to its header and shows its settings on request', async () => {
    const user = userEvent.setup();
    renderWithStableForm(renderNotifier, {
      defaultValues: withJobEnabled('notifier', false),
    });

    const section = screen.getByRole('region', { name: 'Notifier' });
    expect(within(section).getByText('Not included in this run')).toBeVisible();
    expect(within(section).queryByText('Recipient addresses')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Notifier' })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Show settings' }));
    expect(within(section).getByText('Recipient addresses')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Hide settings' })
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('expands a job when it is enabled and updates its summary', async () => {
    const user = userEvent.setup();
    renderWithStableForm(renderNotifier, {
      defaultValues: withJobEnabled('notifier', false),
    });

    await user.click(screen.getByRole('switch', { name: 'Notifier' }));

    expect(screen.getByText('No recipients')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Add recipient address' })
    );
    await user.type(
      screen.getByLabelText('E-mail address'),
      'team@example.com'
    );
    expect(screen.getByText('team@example.com')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Show settings' })
    ).not.toBeInTheDocument();
  });

  it('shows the settings of a disabled job while they have errors', () => {
    const { form } = renderWithStableForm(
      (form) => (
        <AdvisorFields
          form={form}
          advisorPlugins={advisorPlugins}
          secrets={secrets}
          isSuperuser={false}
        />
      ),
      { defaultValues: withJobEnabled('advisor', false) }
    );

    expect(screen.queryByText('Enabled advisors')).toBeNull();

    act(() => {
      form.setError('jobConfigs.advisor.advisors', {
        type: 'custom',
        message: 'Select an advisor.',
      });
    });

    expect(screen.getByText('Enabled advisors')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Show settings' })
    ).not.toBeInTheDocument();
  });

  it('hides the reporter package configuration providers once the evaluator is enabled', () => {
    const { form } = renderWithStableForm(
      (form) => (
        <ReporterFields
          form={form}
          reporterPlugins={reporterPlugins}
          isSuperuser
          packageConfigurationProviderPlugins={
            packageConfigurationProviderPlugins
          }
          secrets={secrets}
          isRerun={false}
        />
      ),
      {
        defaultValues: {
          ...formDefaultValues,
          jobConfigs: {
            ...formDefaultValues.jobConfigs,
            evaluator: {
              ...formDefaultValues.jobConfigs.evaluator,
              enabled: false,
            },
          },
        },
      }
    );

    expect(
      screen.getByText('Package configuration providers')
    ).toBeInTheDocument();

    act(() => {
      form.setValue('jobConfigs.evaluator.enabled', true);
    });

    expect(
      screen.queryByText('Package configuration providers')
    ).not.toBeInTheDocument();
  });

  it('shows the less common analyzer settings behind "More options"', async () => {
    const { user } = await renderInteractiveAnalyzer();

    const toggle = screen.getByRole('button', { name: 'More options' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Repository configuration path')).toBeNull();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByLabelText('Repository configuration path')
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Add environment variable' })
    ).toBeVisible();
    expect(screen.getByText('Environment configuration')).toBeVisible();
  });

  it('opens "More options" at first when one of them is set', async () => {
    await renderInteractiveAnalyzer({
      ...formDefaultValues,
      jobConfigs: {
        ...formDefaultValues.jobConfigs,
        analyzer: {
          ...formDefaultValues.jobConfigs.analyzer,
          environmentVariables: [{ name: 'TOKEN', value: 'secret' }],
        },
      },
    });

    expect(
      screen.getByRole('button', { name: 'More options' })
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Name')).toHaveValue('TOKEN');
    expect(
      screen.getByText('2 package managers · 1 environment variable')
    ).toBeVisible();
  });

  it('opens "More options" while a field in it has an error', async () => {
    const { getForm } = await renderInteractiveAnalyzer();

    act(() => {
      getForm().setError('jobConfigs.analyzer.repositoryConfigPath', {
        type: 'custom',
        message: 'Invalid path.',
      });
    });

    expect(
      screen.getByRole('button', { name: 'More options' })
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Invalid path.')).toBeVisible();
  });

  it('shows the keep-alive phases once keeping the worker alive is enabled', async () => {
    const { user } = await renderInteractiveAnalyzer();
    await user.click(screen.getByRole('button', { name: 'More options' }));

    const phases = await screen.findByText('Phases');
    expect(phases.closest('.grid')).toHaveClass('invisible');

    await user.click(screen.getByRole('switch', { name: 'Keep worker alive' }));

    expect(phases.closest('.grid')).not.toHaveClass('invisible');
  });

  it('keeps the analyzer switch on', async () => {
    await renderInteractiveAnalyzer();

    const toggle = screen.getByRole('switch', { name: 'Analyzer' });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
  });
});
