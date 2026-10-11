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

import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams } from '@tanstack/react-router';
import { Braces, History, Loader2, PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  useFieldArray,
  useForm,
  useFormState,
  useWatch,
  type Control,
  type FieldPath,
  type PathValue,
  type UseFormReturn,
} from 'react-hook-form';
import { z } from 'zod';

import type {
  OrtRun,
  PostRepositoryRun,
  PreconfiguredPluginDescriptor,
  Secret,
} from '@/api';
import { CopyToClipboard } from '@/components/copy-to-clipboard';
import { PageHeader } from '@/components/page-header';
import { InlineCode } from '@/components/typography.tsx';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UnsavedChangesGuard } from '@/components/unsaved-changes-guard';
import { useDebounce } from '@/hooks/use-debounce';
import type {
  OrganizationPermissions,
  ProductPermissions,
  RepositoryPermissions,
} from '@/lib/permissions';
import { cn } from '@/lib/utils';
import {
  AdvisorFields,
  AnalyzerFields,
  EvaluatorFields,
  NotifierFields,
  ReporterFields,
  ScannerFields,
} from '@/routes/organizations/$orgId/products/$productId/repositories/$repoId/-components';
import { defaultValues } from './default-values';
import { FieldHelp, FormSection, LabelWithHelp } from './form-section';
import {
  describeFieldPath,
  formStateHasErrorAt,
  isJobSection,
  JOB_COLORS,
  JOB_SECTION_IDS,
  listFormErrors,
  SECTION_IDS,
  SECTION_LABELS,
  sectionDomId,
  sectionForPath,
  sectionHeadingId,
  sectionPath,
  type SectionId,
} from './form-sections';
import { formValuesToPayload } from './payload';
import { UNMANAGED_PACKAGE_MANAGER_ID } from './plugin-utils';
import { createRunFormSchema, type CreateRunFormValues } from './run-schema';
import {
  pluralize,
  summarizeKeyValues,
  summarizeSource,
} from './section-summaries';
import { withoutUnavailablePlugins } from './unavailable-plugins';

type CreateRunPermissions = {
  organization: OrganizationPermissions | undefined;
  product: ProductPermissions | undefined;
  repository: RepositoryPermissions | undefined;
};

type FormControlOf = Control<CreateRunFormValues>;

/** The fields that refer to plugins and are cleaned up when plugins become unavailable. */
type PluginReferencePath =
  | 'jobConfigs.analyzer.packageManagers'
  | 'jobConfigs.analyzer.packageManagerConfig'
  | 'jobConfigs.analyzer.packageManagerMustRunAfter'
  | 'jobConfigs.analyzer.packageCurationProviders'
  | 'jobConfigs.analyzer.packageCurationProviderConfig'
  | 'jobConfigs.advisor.advisors'
  | 'jobConfigs.advisor.config'
  | 'jobConfigs.scanner.scanners'
  | 'jobConfigs.scanner.scannerScopes'
  | 'jobConfigs.scanner.config'
  | 'jobConfigs.evaluator.packageConfigurationProviders'
  | 'jobConfigs.evaluator.packageConfigurationProviderConfig'
  | 'jobConfigs.reporter.formats'
  | 'jobConfigs.reporter.config'
  | 'jobConfigs.reporter.packageConfigurationProviders'
  | 'jobConfigs.reporter.packageConfigurationProviderConfig';

const REQUEST_PREVIEW_ID = 'create-run-request';

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const scrollToElement = (
  element: Element | null | undefined,
  block: ScrollLogicalPosition
) => {
  // `scrollIntoView` is missing in some environments, e.g. jsdom.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  element?.scrollIntoView?.({
    block,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
};

/** Scroll to a section and move the focus to its heading. */
const goToSection = (section: SectionId) => {
  scrollToElement(document.getElementById(sectionDomId(section)), 'start');
  document
    .getElementById(sectionHeadingId(section))
    ?.focus({ preventScroll: true });
};

/**
 * Scroll to the field with the given form path and focus it. Fields without a focusable
 * element registered in the form, such as plugin lists, fall back to the first invalid
 * control of their section, or else to the section heading.
 */
const focusField = (form: UseFormReturn<CreateRunFormValues>, path: string) => {
  const previous = document.activeElement;
  form.setFocus(path as FieldPath<CreateRunFormValues>);
  let target =
    document.activeElement !== previous ? document.activeElement : null;

  if (!target) {
    const section = sectionForPath(path);
    const fallback =
      document
        .getElementById(sectionDomId(section))
        ?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      document.getElementById(sectionHeadingId(section));
    fallback?.focus({ preventScroll: true });
    target = fallback;
  }

  scrollToElement(target, 'center');
};

export type CreateRunFormProps = {
  isSubmitting: boolean;
  isSuperuser: boolean;
  onConfigContextChange?: (configContext: string) => void;
  onSubmit: (payload: PostRepositoryRun) => Promise<void> | void;
  permissions: CreateRunPermissions;
  plugins: PreconfiguredPluginDescriptor[];
  pluginsLoading?: boolean;
  pluginsLoadFailed?: boolean;
  rerun: OrtRun | null;
  secrets: Secret[];
};

export const CreateRunForm = ({
  isSubmitting,
  isSuperuser,
  onConfigContextChange,
  onSubmit,
  permissions,
  plugins,
  pluginsLoading = false,
  pluginsLoadFailed = false,
  rerun,
  secrets,
}: CreateRunFormProps) => {
  const [showRequest, setShowRequest] = useState(false);
  const isRerun = rerun !== null;
  // A run must not be created without knowing which plugins are available.
  const pluginsUnavailable = pluginsLoading || pluginsLoadFailed;

  // Memoize the grouping so that its identity only changes with the plugins.
  const pluginGroups = useMemo(() => {
    const byType = (type: PreconfiguredPluginDescriptor['type']) =>
      plugins.filter((plugin) => plugin.type === type);
    return {
      advisorPlugins: byType('ADVISOR'),
      reporterPlugins: byType('REPORTER'),
      scannerPlugins: byType('SCANNER'),
      packageCurationProviderPlugins: byType('PACKAGE_CURATION_PROVIDER'),
      packageConfigurationProviderPlugins: byType(
        'PACKAGE_CONFIGURATION_PROVIDER'
      ),
      // The 'Unmanaged' package manager is always enabled and therefore not offered for selection.
      packageManagerPlugins: byType('PACKAGE_MANAGER').filter(
        (plugin) => plugin.id !== UNMANAGED_PACKAGE_MANAGER_ID
      ),
    };
  }, [plugins]);
  const {
    advisorPlugins,
    reporterPlugins,
    scannerPlugins,
    packageCurationProviderPlugins,
    packageConfigurationProviderPlugins,
    packageManagerPlugins,
  } = pluginGroups;

  const formSchema = createRunFormSchema(
    advisorPlugins,
    scannerPlugins,
    reporterPlugins,
    packageCurationProviderPlugins,
    packageConfigurationProviderPlugins,
    packageManagerPlugins
  );

  // `values` lets React Hook Form update untouched fields when the plugins change.
  // Memoize them so unrelated form renders do not trigger a reset.
  // Once the plugins are known, leave out the unavailable ones, as the form removes them from
  // its values (see below); otherwise removing them would count as a change. While the plugins
  // load, keep them, so that the plugins of a rerun show their configuration once they load.
  const pluginDefaults = useMemo(() => {
    const defaults = defaultValues(
      rerun,
      pluginGroups.advisorPlugins,
      pluginGroups.scannerPlugins,
      pluginGroups.reporterPlugins,
      isSuperuser,
      pluginGroups.packageCurationProviderPlugins,
      pluginGroups.packageConfigurationProviderPlugins,
      pluginGroups.packageManagerPlugins
    );
    return pluginsUnavailable
      ? defaults
      : withoutUnavailablePlugins(defaults, pluginGroups);
  }, [pluginGroups, rerun, isSuperuser, pluginsUnavailable]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: pluginDefaults,
    resetOptions: { keepDirtyValues: true, keepTouched: true },
    // The form focuses the first invalid field itself, after opening the
    // sections and options that contain it.
    shouldFocusError: false,
  });

  // Dirty values kept by React Hook Form can still refer to removed plugins.
  // Prune these references even when their section is collapsed / unmounted.
  const appliedPluginGroups = useRef(pluginGroups);
  useEffect(() => {
    if (appliedPluginGroups.current === pluginGroups) return;
    appliedPluginGroups.current = pluginGroups;

    const current = form.getValues();
    const pruned = withoutUnavailablePlugins(current, pluginGroups);
    const update = <P extends PluginReferencePath>(
      path: P,
      value: PathValue<CreateRunFormValues, P>
    ) => {
      if (value !== form.getValues(path)) form.setValue(path, value);
    };
    const { analyzer, advisor, scanner, evaluator, reporter } =
      pruned.jobConfigs;

    update('jobConfigs.analyzer.packageManagers', analyzer.packageManagers);
    update(
      'jobConfigs.analyzer.packageManagerConfig',
      analyzer.packageManagerConfig
    );
    update(
      'jobConfigs.analyzer.packageManagerMustRunAfter',
      analyzer.packageManagerMustRunAfter
    );
    update(
      'jobConfigs.analyzer.packageCurationProviders',
      analyzer.packageCurationProviders
    );
    update(
      'jobConfigs.analyzer.packageCurationProviderConfig',
      analyzer.packageCurationProviderConfig
    );
    update('jobConfigs.advisor.advisors', advisor.advisors);
    update('jobConfigs.advisor.config', advisor.config);
    update('jobConfigs.scanner.scanners', scanner.scanners);
    update('jobConfigs.scanner.scannerScopes', scanner.scannerScopes);
    update('jobConfigs.scanner.config', scanner.config);
    update(
      'jobConfigs.evaluator.packageConfigurationProviders',
      evaluator.packageConfigurationProviders
    );
    update(
      'jobConfigs.evaluator.packageConfigurationProviderConfig',
      evaluator.packageConfigurationProviderConfig
    );
    update('jobConfigs.reporter.formats', reporter.formats);
    update('jobConfigs.reporter.config', reporter.config);
    update(
      'jobConfigs.reporter.packageConfigurationProviders',
      reporter.packageConfigurationProviders
    );
    update(
      'jobConfigs.reporter.packageConfigurationProviderConfig',
      reporter.packageConfigurationProviderConfig
    );
  }, [pluginGroups, form]);

  // Reload the available plugins when the configuration context changes, as it
  // may influence which plugins are available for the repository. The value is
  // debounced so that the plugins are not reloaded on every keystroke.
  const watchedConfigContext =
    useWatch({ control: form.control, name: 'jobConfigContext' }) ?? '';
  const debouncedConfigContext = useDebounce(watchedConfigContext);

  useEffect(() => {
    onConfigContextChange?.(debouncedConfigContext);
  }, [debouncedConfigContext, onConfigContextChange]);

  // After a failed submit, focus the first invalid field once the render that shows the
  // errors has opened the sections and options containing it.
  const formState = useFormState({ control: form.control });
  const errors = listFormErrors(formState);
  const focusFirstErrorPending = useRef(false);
  useEffect(() => {
    if (!focusFirstErrorPending.current) return;
    const [first] = errors;
    if (!first) return;
    focusFirstErrorPending.current = false;

    // Prefer the first invalid control in the section, which is the first one on screen.
    const section = sectionForPath(first.path);
    const control = document
      .getElementById(sectionDomId(section))
      ?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (control) {
      control.focus({ preventScroll: true });
      scrollToElement(control, 'center');
    } else {
      focusField(form, first.path);
    }
  }, [errors, form]);

  async function submitForm(values: CreateRunFormValues) {
    if (pluginsUnavailable) return;
    await onSubmit(formValuesToPayload(values, plugins));
  }

  const errorCount = errors.length;

  return (
    <div className='flex flex-col gap-8'>
      <UnsavedChangesGuard control={form.control} />
      <PageHeader
        title={rerun ? `Rerun run ${rerun.index}` : 'New run'}
        description='Choose the revision to analyze and configure the jobs of the run.'
      />
      <Form {...form}>
        <form
          onSubmit={(event) =>
            form.handleSubmit(submitForm, () => {
              focusFirstErrorPending.current = true;
            })(event)
          }
          className='flex flex-col gap-8'
        >
          <div className='flex flex-col gap-8 lg:grid lg:grid-cols-[10.5rem_minmax(0,1fr)] lg:items-start lg:gap-12'>
            <SectionNav control={form.control} showJobs={!pluginsUnavailable} />
            <div className='flex max-w-3xl min-w-0 flex-col gap-6'>
              {rerun && <RerunNote runIndex={rerun.index} />}
              <ErrorSummary
                control={form.control}
                plugins={plugins}
                onSelect={(path) => focusField(form, path)}
              />
              <SourceSection control={form.control} />
              <KeyValueSection
                control={form.control}
                section='parameters'
                name='jobConfigs.parameters'
                title='Configuration parameters'
                noun='parameter'
                description='Input parameters for the validation script of the configuration.'
                help={
                  <p>
                    A map of key-value pairs that serve as input parameters for
                    the configuration's validation script. The script can use
                    these parameters to alter specific job configurations.
                  </p>
                }
                addLabel='Add parameter'
              />
              <KeyValueSection
                control={form.control}
                section='labels'
                name='labels'
                title='ORT labels'
                noun='label'
                description='Key-value pairs to store as labels in the ORT results.'
                help={
                  <p>
                    ORT does not interpret labels by itself, but leaves
                    interpretation to custom configuration, like evaluator
                    rules.
                  </p>
                }
                addLabel='Add label'
              />
              {pluginsLoading ? (
                <JobsPlaceholder>
                  <Loader2 className='size-4 animate-spin motion-reduce:animate-none' />
                  Loading available plugins...
                </JobsPlaceholder>
              ) : pluginsLoadFailed ? (
                <JobsPlaceholder className='text-err'>
                  The available plugins could not be loaded.
                </JobsPlaceholder>
              ) : (
                <>
                  <AnalyzerFields
                    form={form}
                    isSuperuser={isSuperuser}
                    packageCurationProviderPlugins={
                      packageCurationProviderPlugins
                    }
                    packageManagerPlugins={packageManagerPlugins}
                    pluginSecrets={secrets}
                    isRerun={isRerun}
                    permissions={permissions}
                  />
                  <AdvisorFields
                    form={form}
                    advisorPlugins={advisorPlugins}
                    secrets={secrets}
                    isSuperuser={isSuperuser}
                  />
                  <ScannerFields
                    form={form}
                    scannerPlugins={scannerPlugins}
                    secrets={secrets}
                    isSuperuser={isSuperuser}
                  />
                  <EvaluatorFields
                    form={form}
                    isSuperuser={isSuperuser}
                    packageConfigurationProviderPlugins={
                      packageConfigurationProviderPlugins
                    }
                    secrets={secrets}
                    isRerun={isRerun}
                  />
                  <ReporterFields
                    form={form}
                    reporterPlugins={reporterPlugins}
                    isSuperuser={isSuperuser}
                    packageConfigurationProviderPlugins={
                      packageConfigurationProviderPlugins
                    }
                    secrets={secrets}
                    isRerun={isRerun}
                  />
                  <NotifierFields form={form} isSuperuser={isSuperuser} />
                </>
              )}
              {showRequest && !pluginsUnavailable && (
                <RequestPreview control={form.control} plugins={plugins} />
              )}
            </div>
          </div>

          <div className='bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-20 -mx-4 -mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3 backdrop-blur md:-mx-8 md:px-8'>
            <Button type='submit' disabled={isSubmitting || pluginsUnavailable}>
              {pluginsLoading ? (
                'Plugins loading...'
              ) : isSubmitting ? (
                <>
                  <span className='sr-only'>Starting run...</span>
                  <Loader2
                    size={16}
                    className='mx-3 animate-spin motion-reduce:animate-none'
                  />
                </>
              ) : (
                'Start run'
              )}
            </Button>
            {rerun && (
              <span className='text-muted-foreground text-[0.8125rem]'>
                Based on run {rerun.index}
              </span>
            )}
            {errorCount > 0 && (
              <span className='text-err text-[0.8125rem] font-medium'>
                {pluralize(errorCount, 'problem')} to fix
              </span>
            )}
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='ml-auto'
              aria-expanded={showRequest && !pluginsUnavailable}
              aria-controls={showRequest ? REQUEST_PREVIEW_ID : undefined}
              disabled={pluginsUnavailable}
              onClick={() => setShowRequest(!showRequest)}
            >
              <Braces />
              View request
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

/** The navigation between the sections, with the state of each job and error marks. */
const SectionNav = ({
  control,
  showJobs,
}: {
  control: FormControlOf;
  showJobs: boolean;
}) => {
  const enabled = useWatch({
    control,
    name: JOB_SECTION_IDS.map((job) => `jobConfigs.${job}.enabled` as const),
  });
  const formState = useFormState({ control });
  const [current, setCurrent] = useState<SectionId>('source');
  const sections = SECTION_IDS.filter(
    (section) => showJobs || !isJobSection(section)
  );

  // Mark the topmost section in the upper part of the viewport as the current one.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = SECTION_IDS.find((section) =>
          visible.has(sectionDomId(section))
        );
        if (first) setCurrent(first);
      },
      // Below the sticky top bar, in the upper half of the viewport.
      { rootMargin: '-64px 0px -50% 0px' }
    );
    for (const section of SECTION_IDS) {
      const element = document.getElementById(sectionDomId(section));
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [showJobs]);

  return (
    <nav
      aria-label='Form sections'
      className='sticky top-16 hidden flex-col gap-2 lg:flex'
    >
      <span className='label-caps'>Sections</span>
      <ul className='flex flex-col border-l'>
        {sections.map((section) => {
          const job = isJobSection(section) ? section : undefined;
          const jobEnabled = job
            ? enabled[JOB_SECTION_IDS.indexOf(job)]
            : undefined;
          const hasErrors = formStateHasErrorAt(
            formState,
            sectionPath(section)
          );
          const isCurrent = current === section;

          return (
            <li key={section}>
              <a
                href={`#${sectionDomId(section)}`}
                aria-current={isCurrent ? 'location' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setCurrent(section);
                  goToSection(section);
                }}
                className={cn(
                  'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 relative -ml-px flex items-center gap-2 py-1.5 pr-1 pl-3 text-[0.8125rem] outline-none focus-visible:ring-[3px]',
                  isCurrent &&
                    'text-foreground before:bg-brand font-medium before:absolute before:inset-y-1 before:left-0 before:w-0.5'
                )}
              >
                {job && (
                  <span
                    aria-hidden
                    className={cn(
                      'size-2 shrink-0',
                      JOB_COLORS[job],
                      !jobEnabled && 'opacity-30'
                    )}
                  />
                )}
                <span className='flex-1 truncate'>
                  {SECTION_LABELS[section]}
                </span>
                {job && !jobEnabled && (
                  <span className='text-muted-foreground text-xs font-normal'>
                    Off
                  </span>
                )}
                {hasErrors && (
                  <>
                    <span
                      aria-hidden
                      className='bg-err size-1.5 shrink-0 rounded-full'
                    />
                    <span className='sr-only'>(has errors)</span>
                  </>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

/** A note that the form starts from the configuration of an earlier run. */
const RerunNote = ({ runIndex }: { runIndex: number }) => {
  const { orgId, productId, repoId } = useParams({ strict: false });

  return (
    <p className='bg-muted flex items-center gap-2 rounded-xs px-3 py-2 text-[0.8125rem]'>
      <History aria-hidden className='text-muted-foreground size-3.5' />
      <span>
        Configuration copied from{' '}
        <Link
          to='/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex'
          params={{
            orgId: orgId ?? '',
            productId: productId ?? '',
            repoId: repoId ?? '',
            runIndex: String(runIndex),
          }}
          className='link'
        >
          run {runIndex}
        </Link>
        .
      </span>
    </p>
  );
};

/** The list of validation errors, with links to the invalid fields. */
const ErrorSummary = ({
  control,
  plugins,
  onSelect,
}: {
  control: FormControlOf;
  plugins: PreconfiguredPluginDescriptor[];
  onSelect: (path: string) => void;
}) => {
  const items = listFormErrors(useFormState({ control }));
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby='create-run-errors-title'
      className='bg-err-soft flex flex-col gap-2 rounded-xs px-4 py-3'
    >
      <h2
        id='create-run-errors-title'
        className='text-err text-[0.8125rem] font-semibold'
      >
        Fix {pluralize(items.length, 'problem')} to start the run
      </h2>
      <ul className='flex flex-col gap-1 text-[0.8125rem]'>
        {items.map(({ path, message }) => (
          <li key={path}>
            <a
              href={`#${sectionDomId(sectionForPath(path))}`}
              className='link underline'
              onClick={(event) => {
                event.preventDefault();
                onSelect(path);
              }}
            >
              {describeFieldPath(path, plugins)}
            </a>
            <span aria-hidden> · </span>
            <span>{message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** The source and configuration fields. */
const SourceSection = ({ control }: { control: FormControlOf }) => {
  const [revision, path, jobConfigContext, ruleSet] = useWatch({
    control,
    name: ['revision', 'path', 'jobConfigContext', 'jobConfigs.ruleSet'],
  });

  return (
    <FormSection
      section='source'
      title='Source and configuration'
      summary={summarizeSource({ revision, path, jobConfigContext, ruleSet })}
    >
      <div className='grid gap-x-6 gap-y-5 md:grid-cols-2'>
        <FormField
          control={control}
          name='revision'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Revision</FormLabel>
              <FormControl autoFocus>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                A branch, tag, or commit; the default branch if left empty.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name='path'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Path</FormLabel>
              <FormControl>
                <Input {...field} placeholder='(optional)' />
              </FormControl>
              <FormDescription>
                Limits the analysis to a path relative to the repository root,
                for example <InlineCode>path/to/source</InlineCode>.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name='jobConfigContext'
          render={({ field }) => (
            <FormItem>
              <LabelWithHelp
                label='Configuration context'
                help={
                  <>
                    <p>
                      The configuration provider is responsible for obtaining
                      configuration for this run and uses the context in an
                      implementation-specific way.
                    </p>
                    <p>
                      For example, if the{' '}
                      <InlineCode>GitHubConfigFileProvider</InlineCode> is in
                      use, the context defines the Git revision of the
                      configuration to check out.
                    </p>
                  </>
                }
              />
              <FormControl>
                <Input {...field} placeholder='(optional)' />
              </FormControl>
              <FormDescription>
                The context to pass to the configuration provider in use.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name='environmentConfigPath'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Environment configuration path</FormLabel>
              <FormControl>
                <Input {...field} placeholder='(optional)' />
              </FormControl>
              <FormDescription>
                The path to an environment configuration file; defaults to{' '}
                <InlineCode>.ort.env.yml</InlineCode>.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name='jobConfigs.ruleSet'
          render={({ field }) => (
            <FormItem>
              <LabelWithHelp
                label='Rule set'
                help={
                  <p>
                    A rule set selects a set of configuration files used by the
                    Evaluator and the Reporter, such as rules for the Evaluator
                    or license classifications.
                  </p>
                }
              />
              <FormControl>
                <Input {...field} placeholder='(optional)' />
              </FormControl>
              <FormDescription>
                The rule set to use for the run; the default rule set if left
                empty.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormSection>
  );
};

/** A section with a list of key-value pairs, e.g. the configuration parameters. */
const KeyValueSection = ({
  control,
  section,
  name,
  title,
  noun,
  description,
  help,
  addLabel,
}: {
  control: FormControlOf;
  section: SectionId;
  name: 'jobConfigs.parameters' | 'labels';
  title: string;
  noun: string;
  description: string;
  help: ReactNode;
  addLabel: string;
}) => {
  const { fields, append, remove } = useFieldArray({ name, control });
  const rows = useWatch({ control, name });

  return (
    <FormSection
      section={section}
      title={title}
      summary={summarizeKeyValues(rows, noun, `No ${noun}s`)}
    >
      <div className='flex flex-col gap-3'>
        <p className='text-muted-foreground flex items-center gap-1 text-[0.8125rem]'>
          {description}
          <FieldHelp topic={title}>{help}</FieldHelp>
        </p>
        {fields.map((field, index) => (
          <div key={field.id} className='flex flex-row items-end gap-2'>
            <div className='min-w-0 flex-1'>
              <FormField
                control={control}
                name={`${name}.${index}.key`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(index > 0 && 'sr-only')}>
                      {index === 0 ? 'Key' : `Key ${index + 1}`}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='min-w-0 flex-1'>
              <FormField
                control={control}
                name={`${name}.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(index > 0 && 'sr-only')}>
                      {index === 0 ? 'Value' : `Value ${index + 1}`}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type='button'
              variant='outline'
              size='icon'
              aria-label={`Remove ${noun} ${index + 1}`}
              onClick={() => {
                remove(index);
              }}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
        <Button
          className='w-fit'
          variant='outline'
          size='sm'
          type='button'
          onClick={() => {
            append({ key: '', value: '' });
          }}
        >
          <PlusIcon />
          {addLabel}
        </Button>
      </div>
    </FormSection>
  );
};

const JobsPlaceholder = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <div
    className={cn(
      'text-muted-foreground flex items-center gap-2 border-t pt-6 text-[0.8125rem]',
      className
    )}
  >
    {children}
  </div>
);

/** The request that starting the run sends, for use with the API or CLI. */
const RequestPreview = ({
  control,
  plugins,
}: {
  control: FormControlOf;
  plugins: PreconfiguredPluginDescriptor[];
}) => {
  // `values` supplies a complete form, including on plugin refresh. Deriving the
  // full value keeps the preview typed without treating useWatch's partial return
  // as a complete payload; it also follows setValue when selections are pruned.
  const values = useWatch({ control, compute: (values) => values });
  const payload = JSON.stringify(formValuesToPayload(values, plugins), null, 2);

  // Bring the preview into view when it is opened from the action bar.
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    scrollToElement(sectionRef.current, 'start');
  }, []);

  return (
    <section
      ref={sectionRef}
      id={REQUEST_PREVIEW_ID}
      aria-labelledby={`${REQUEST_PREVIEW_ID}-title`}
      className='flex scroll-mt-16 flex-col gap-3 border-t pt-6'
    >
      <h2
        id={`${REQUEST_PREVIEW_ID}-title`}
        className='text-[0.9375rem] font-semibold'
      >
        Request
      </h2>
      <Label htmlFor='payload' className='text-muted-foreground font-normal'>
        You can copy this payload to use it when triggering runs via the API or
        CLI.
      </Label>
      <div className='relative w-full'>
        <Textarea
          id='payload'
          className='h-96 pr-12 font-mono text-xs'
          readOnly
          value={payload}
        />
        <div className='absolute top-2 right-2 z-10'>
          <CopyToClipboard copyText={payload} />
        </div>
      </div>
    </section>
  );
};
