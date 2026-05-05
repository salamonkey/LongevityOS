import fs from 'node:fs';
import path from 'node:path';
import { readText, writeTextAtomic, parseSliceBlockWithLists } from '../lib/core.mjs';
import {
  componentContractRelPathForSlice,
  copyContractRelPathForSlice,
  requiredDesignSystemRelPaths,
  requiredSliceUxContractRelPaths,
  screenContractRelPathForSlice,
} from './design-system.mjs';

function normalizeSliceIdForPath(sliceId) {
  return String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
}

function storybookMapRelPath() { return 'docs/design-system/storybook-map.md'; }
function storybookRequirementsRelPathForSlice(sliceId) { return `docs/storybook/${normalizeSliceIdForPath(sliceId)}-story-requirements.json`; }
function storybookReviewJsonRelPathForSlice(sliceId) { return `docs/reviews/storybook/${normalizeSliceIdForPath(sliceId)}-storybook-review.json`; }
function storybookReviewMdRelPathForSlice(sliceId) { return `docs/reviews/storybook/${normalizeSliceIdForPath(sliceId)}-storybook-review.md`; }
function storybookSliceDirRelPath(sliceId) { return `src/stories/slices/${normalizeSliceIdForPath(sliceId)}`; }

function safeReadJson(absPath, fallback = {}) {
  if (!fs.existsSync(absPath)) return fallback;
  try {
    return JSON.parse(readText(absPath));
  } catch (_) {
    return fallback;
  }
}

function currentSlice(targetRoot) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Missing docs/product/current-slice.yaml');
  }
  return parseSliceBlockWithLists(readText(currentSlicePath));
}

function unique(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const item = String(value || '').trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}


function ensureDir(absPath) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
}

function addIfMissing(object, key, value) {
  if (!object[key]) {
    object[key] = value;
    return true;
  }
  return false;
}

function isGeneratedFabricFile(absPath) {
  if (!fs.existsSync(absPath)) return true;
  const text = readText(absPath);
  return text.includes('generated_from: fabric/company/v1/runtime/product/storybook.mjs')
    || text.includes('generated_from: fabric/company/v1/runtime/commands/runtime.mjs');
}

function writeStorybookManagedFile(absPath, content) {
  if (fs.existsSync(absPath) && !isGeneratedFabricFile(absPath) && readText(absPath) !== content) {
    return false;
  }
  ensureDir(absPath);
  writeTextAtomic(absPath, content);
  return true;
}

function sourceHeader(relPath) {
  const generatedAt = new Date().toISOString();
  return `/* generated_from: fabric/company/v1/runtime/product/storybook.mjs\n * target: ${relPath}\n * generated_at_utc: ${generatedAt}\n */\n`;
}

function ensureStorybookRuntimeFiles(targetRoot) {
  const files = new Map();
  files.set('.storybook/main.ts', `${sourceHeader('.storybook/main.ts')}import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
`);
  files.set('.storybook/preview.ts', `${sourceHeader('.storybook/preview.ts')}import type { Preview } from '@storybook/react-vite';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
`);
  const changed = [];
  for (const [relPath, content] of files.entries()) {
    const absPath = path.join(targetRoot, relPath);
    if (fs.existsSync(absPath) && readText(absPath) === content) continue;
    if (writeStorybookManagedFile(absPath, content)) changed.push(relPath);
  }
  return changed;
}

function loadSliceStorybookRequirements(targetRoot, sliceId) {
  const componentContract = safeReadJson(path.join(targetRoot, componentContractRelPathForSlice(sliceId)), {});
  const screenContract = safeReadJson(path.join(targetRoot, screenContractRelPathForSlice(sliceId)), {});
  const copyContract = safeReadJson(path.join(targetRoot, copyContractRelPathForSlice(sliceId)), {});
  const components = unique(componentContract.required_components || []);
  const screens = unique((screenContract.screens || []).map((screen) => screen.screen_id || screen.id));
  const states = unique([
    'default',
    'loading',
    'empty',
    'error',
    'success',
    ...((screenContract.screens || []).flatMap((screen) => screen.states || [])),
  ]);
  const statuses = unique(componentContract.allowed_statuses || ['done', 'due', 'soon', 'planned', 'overdue']);
  const priorities = unique(componentContract.allowed_priorities || ['today', 'soon', 'later']);
  return {
    schema_version: 1,
    generated_at_utc: new Date().toISOString(),
    slice_id: String(sliceId || 'UNKNOWN'),
    required_storybook_paths: [
      ...components.map((component) => `Product/${component}`),
      ...screens.map((screen) => `Screens/${screen}`),
    ],
    required_components: components,
    required_screens: screens,
    required_states: states,
    required_statuses: statuses,
    required_priorities: priorities,
    copy_contract_slots: Object.keys(copyContract.copy_slots || {}),
    required_files: [
      `${storybookSliceDirRelPath(sliceId)}/fixtures.ts`,
      `${storybookSliceDirRelPath(sliceId)}/${normalizeSliceIdForPath(sliceId)}.stories.tsx`,
      `${storybookSliceDirRelPath(sliceId)}/README.md`,
    ],
    closeout_gate: {
      required: true,
      rule: 'A slice cannot close until Storybook stories exist for required components, screens, and semantic states and the Storybook review status is pass.',
    },
  };
}

function buildStorybookMapMarkdown({ targetRoot, slice }) {
  const generatedAt = new Date().toISOString();
  const componentContract = safeReadJson(path.join(targetRoot, componentContractRelPathForSlice(slice.id)), {});
  const screenContract = safeReadJson(path.join(targetRoot, screenContractRelPathForSlice(slice.id)), {});
  const components = unique(componentContract.required_components || []);
  const screens = unique((screenContract.screens || []).map((screen) => screen.screen_id || screen.id));
  const rows = [];
  for (const component of components) {
    rows.push(`| docs/ux/${normalizeSliceIdForPath(slice.id)}-component-contract.json | ${component} | Product/${component} | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |`);
  }
  for (const screen of screens) {
    rows.push(`| docs/ux/${normalizeSliceIdForPath(slice.id)}-screen-contract.json | ${screen} | Screens/${screen} | default, loading, empty, error, success | Layout order, action hierarchy, mobile clarity |`);
  }
  if (rows.length === 0) {
    rows.push('| current slice UX contracts | Current slice UI | Screens/CurrentSlice | default, loading, empty, error | User-facing clarity and contract coverage |');
  }
  return [
    '# Storybook Map',
    '',
    `Generated at: ${generatedAt}`,
    '',
    'Storybook is the executable validation surface for Fabric UI/UX and design-system contracts. It must not become a competing source of truth: Fabric contracts drive stories, story review findings update implementation or the contracts deliberately.',
    '',
    '## Active slice',
    '',
    `- Slice ID: ${slice.id || 'UNKNOWN'}`,
    `- Slice title: ${slice.title || 'Current Slice'}`,
    '',
    '## Contract-to-story mapping',
    '',
    '| Fabric contract | Component/screen | Storybook path | Required stories/states | Validation focus |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    '## Closeout rule',
    '',
    'A slice is not UX-complete until every introduced or modified user-facing component has a Storybook story covering default, loading, empty, error/invalid, and primary semantic states where applicable.',
    '',
    '## CI expectation',
    '',
    '- `npm run build-storybook` should pass before release readiness.',
    '- `npm run test:storybook` should pass once Storybook/Vitest interaction tests are enabled.',
    '',
  ].join('\n');
}

function uiuxGenerateStorybookMap({ targetRoot }) {
  const slice = currentSlice(targetRoot);
  const missing = [...requiredDesignSystemRelPaths(), ...requiredSliceUxContractRelPaths(slice.id)]
    .filter((relPath) => !fs.existsSync(path.join(targetRoot, relPath)));
  if (missing.length > 0) {
    throw new Error(`Cannot run uiux:generate-storybook-map: missing contract artifact(s):\n${missing.map((relPath) => `- ${relPath}`).join('\n')}\nRun uiux:generate-design-system and uiux:generate-current-slice-flow first.`);
  }
  const requirements = loadSliceStorybookRequirements(targetRoot, slice.id);
  const mapRelPath = storybookMapRelPath();
  const requirementsRelPath = storybookRequirementsRelPathForSlice(slice.id);
  writeTextAtomic(path.join(targetRoot, mapRelPath), `${buildStorybookMapMarkdown({ targetRoot, slice })}\n`);
  writeTextAtomic(path.join(targetRoot, requirementsRelPath), `${JSON.stringify(requirements, null, 2)}\n`);
  console.log('fabric uiux:generate-storybook-map: OK');
  console.log(`- wrote: ${mapRelPath}`);
  console.log(`- wrote: ${requirementsRelPath}`);
}

function readChangedFilesFromImplementationNotes({ targetRoot, sliceId }) {
  const relPath = `docs/implementation/${normalizeSliceIdForPath(sliceId)}-implementation-notes.md`;
  const absPath = path.join(targetRoot, relPath);
  if (!fs.existsSync(absPath)) return [];
  const text = readText(absPath);
  const match = text.match(/##\s*5\.\s*Changed Files[\s\S]*?(?=\n##\s|\n#\s|$)/);
  if (!match) return [];
  return unique(
    match[0]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.replace(/^- /, '').trim()),
  );
}

function listFilesRecursive(absDirPath, predicate) {
  if (!fs.existsSync(absDirPath)) return [];
  const out = [];
  const stack = [absDirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (predicate(absPath)) out.push(absPath);
    }
  }
  return out;
}

function toImportPath(fromDirRelPath, toRelPath) {
  let relPath = path.relative(fromDirRelPath, toRelPath).replace(/\\/g, '/');
  if (!relPath.startsWith('.')) relPath = `./${relPath}`;
  return relPath;
}

function toIdentifier(value, fallback = 'Story') {
  const cleaned = String(value || '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join('');
  return cleaned || fallback;
}

function normalizeToken(value) {
  return String(value || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

function readModuleExportInfo({ targetRoot, relPath, exportInfoCache }) {
  const cached = exportInfoCache.get(relPath);
  if (cached) return cached;
  const absPath = path.join(targetRoot, relPath);
  if (!fs.existsSync(absPath)) {
    const empty = { hasDefault: false, named: new Set() };
    exportInfoCache.set(relPath, empty);
    return empty;
  }
  let text = '';
  try {
    text = readText(absPath);
  } catch (_) {
    const empty = { hasDefault: false, named: new Set() };
    exportInfoCache.set(relPath, empty);
    return empty;
  }
  const info = { hasDefault: /export\s+default\b/.test(text), named: new Set() };
  const addNamed = (value) => {
    const name = String(value || '').trim();
    if (!name || name === 'default') return;
    info.named.add(name);
  };
  const declarationPatterns = [
    /export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
    /export\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
  ];
  for (const pattern of declarationPatterns) {
    let match = pattern.exec(text);
    while (match) {
      addNamed(match[1]);
      match = pattern.exec(text);
    }
  }
  const exportListPattern = /export\s*{\s*([^}]+)\s*}/g;
  let listMatch = exportListPattern.exec(text);
  while (listMatch) {
    const raw = String(listMatch[1] || '');
    for (const part of raw.split(',')) {
      const token = String(part || '').trim();
      if (!token) continue;
      const aliasMatch = token.match(/\bas\s+([A-Za-z_$][A-Za-z0-9_$]*)$/);
      if (aliasMatch) {
        addNamed(aliasMatch[1]);
      } else {
        addNamed(token);
      }
    }
    listMatch = exportListPattern.exec(text);
  }
  exportInfoCache.set(relPath, info);
  return info;
}

function resolveComponentModuleBinding({ targetRoot, componentName, candidateRelPaths, exportInfoCache }) {
  for (const relPath of candidateRelPaths) {
    const info = readModuleExportInfo({ targetRoot, relPath, exportInfoCache });
    if (info.named.has(componentName)) {
      return { relPath, exportType: 'named', exportName: componentName };
    }
  }
  const componentToken = normalizeToken(componentName);
  for (const relPath of candidateRelPaths) {
    const info = readModuleExportInfo({ targetRoot, relPath, exportInfoCache });
    const ext = path.extname(relPath);
    const base = path.basename(relPath, ext);
    if (normalizeToken(base) === componentToken && info.hasDefault) {
      return { relPath, exportType: 'default', exportName: 'default' };
    }
  }
  return null;
}

function findComponentModuleBinding({ targetRoot, componentName, changedFiles, exportInfoCache }) {
  const componentToken = normalizeToken(componentName);
  if (!componentToken) return null;
  const isSourceModule = (relPath) => /^src\/(features|components)\/.+\.(jsx|tsx|js|ts)$/.test(relPath);
  const matchesComponentName = (relPath) => {
    const ext = path.extname(relPath);
    const base = path.basename(relPath, ext);
    return normalizeToken(base) === componentToken;
  };
  const preferredChanged = unique(changedFiles
    .filter((relPath) => isSourceModule(relPath) && matchesComponentName(relPath))
    .filter((relPath) => fs.existsSync(path.join(targetRoot, relPath))));
  const preferredBinding = resolveComponentModuleBinding({
    targetRoot,
    componentName,
    candidateRelPaths: preferredChanged,
    exportInfoCache,
  });
  if (preferredBinding) return preferredBinding;

  const basenameMatches = [];
  for (const rootRelPath of ['src/components', 'src/features']) {
    const rootAbsPath = path.join(targetRoot, rootRelPath);
    const matches = listFilesRecursive(rootAbsPath, (absPath) => {
      const relPath = path.relative(targetRoot, absPath).replace(/\\/g, '/');
      return /\.(jsx|tsx|js|ts)$/.test(absPath) && matchesComponentName(relPath);
    });
    basenameMatches.push(...matches.map((absPath) => path.relative(targetRoot, absPath).replace(/\\/g, '/')));
  }
  const basenameBinding = resolveComponentModuleBinding({
    targetRoot,
    componentName,
    candidateRelPaths: unique(basenameMatches),
    exportInfoCache,
  });
  if (basenameBinding) return basenameBinding;

  const changedSourceModules = unique(changedFiles
    .filter((relPath) => isSourceModule(relPath))
    .filter((relPath) => fs.existsSync(path.join(targetRoot, relPath))));
  const changedBinding = resolveComponentModuleBinding({
    targetRoot,
    componentName,
    candidateRelPaths: changedSourceModules,
    exportInfoCache,
  });
  if (changedBinding) return changedBinding;

  const allSourceModules = [];
  for (const rootRelPath of ['src/components', 'src/features']) {
    const rootAbsPath = path.join(targetRoot, rootRelPath);
    const matches = listFilesRecursive(rootAbsPath, (absPath) => /\.(jsx|tsx|js|ts)$/.test(absPath))
      .map((absPath) => path.relative(targetRoot, absPath).replace(/\\/g, '/'));
    allSourceModules.push(...matches);
  }
  return resolveComponentModuleBinding({
    targetRoot,
    componentName,
    candidateRelPaths: unique(allSourceModules),
    exportInfoCache,
  });
}

function detectVisualStoryTargets({
  targetRoot,
  sliceId,
  storyDirRelPath,
  componentNames = [],
  requiredScreens = [],
}) {
  const changedFiles = readChangedFilesFromImplementationNotes({ targetRoot, sliceId });
  const routePattern = /^src\/routes\/.+\.(jsx|tsx|js|ts)$/;
  let routeRelPaths = changedFiles.filter((relPath) => routePattern.test(relPath));
  routeRelPaths = routeRelPaths.filter((relPath) => fs.existsSync(path.join(targetRoot, relPath)));

  if (routeRelPaths.length === 0) {
    const routeAbsPaths = listFilesRecursive(
      path.join(targetRoot, 'src/routes'),
      (absPath) => /\.(jsx|tsx|js|ts)$/.test(absPath),
    );
    routeRelPaths = routeAbsPaths.map((absPath) => path.relative(targetRoot, absPath).replace(/\\/g, '/'));
  }
  const maxRouteStories = Math.max(1, Array.isArray(requiredScreens) && requiredScreens.length > 0 ? requiredScreens.length : 1);
  if (routeRelPaths.length > maxRouteStories) {
    const normalizedSlice = normalizeSliceIdForPath(sliceId).toLowerCase();
    const screenTokens = (requiredScreens || []).map((screen) => String(screen || '').toLowerCase().replace(/_/g, '-')).filter(Boolean);
    routeRelPaths = routeRelPaths
      .map((relPath) => {
        const token = relPath.toLowerCase();
        let score = token.includes(normalizedSlice) ? 1 : 0;
        for (const screenToken of screenTokens) {
          if (token.includes(screenToken)) score += 3;
        }
        return { relPath, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRouteStories)
      .map((entry) => entry.relPath);
  }

  const importDefs = [];
  const supportDefs = [];
  const importedPathToAlias = new Map();
  const ensureImportAlias = ({ relPath, aliasPrefix, exportType = 'default', exportName = '' }) => {
    const key = `${relPath}::${exportType}::${exportName || 'default'}`;
    const existingAlias = importedPathToAlias.get(key);
    if (existingAlias) return existingAlias;
    const alias = `${aliasPrefix}${importedPathToAlias.size + 1}`;
    importedPathToAlias.set(key, alias);
    if (exportType === 'named') {
      importDefs.push(`import { ${exportName} as ${alias} } from '${toImportPath(storyDirRelPath, relPath)}';`);
    } else {
      importDefs.push(`import ${alias} from '${toImportPath(storyDirRelPath, relPath)}';`);
    }
    return alias;
  };
  const routeAliases = [];
  const routeStoryArgsByAlias = {};
  routeRelPaths.forEach((relPath, index) => {
    const alias = ensureImportAlias({ relPath, aliasPrefix: 'RouteSurface', exportType: 'default' });
    routeAliases.push(alias);
    const routeToken = relPath.toLowerCase();
    if (routeToken.includes('health-plan-browsing-and-item-detail')) {
      const planGeneratorRelPath = 'src/features/self-onboarding-to-first-dashboard/plan.js';
      if (fs.existsSync(path.join(targetRoot, planGeneratorRelPath))) {
        const planFactoryAlias = ensureImportAlias({
          relPath: planGeneratorRelPath,
          aliasPrefix: 'PlanFactory',
          exportType: 'named',
          exportName: 'generateInitialPlanSnapshot',
        });
        const snapshotConst = `storyPlanSnapshot${index + 1}`;
        supportDefs.push(`const ${snapshotConst} = ${planFactoryAlias}({ profileId: 'storybook-self', age: 52, gender: 'female' });`);
        routeStoryArgsByAlias[alias] = `planSnapshot={${snapshotConst}}`;
      }
    }
  });

  const exportInfoCache = new Map();
  const componentAliasesByName = {};
  for (const componentName of componentNames) {
    const binding = findComponentModuleBinding({ targetRoot, componentName, changedFiles, exportInfoCache });
    if (!binding?.relPath) continue;
    componentAliasesByName[componentName] = ensureImportAlias({
      relPath: binding.relPath,
      aliasPrefix: 'ComponentSurface',
      exportType: binding.exportType,
      exportName: binding.exportName,
    });
  }

  return { importDefs, supportDefs, routeAliases, routeStoryArgsByAlias, componentAliasesByName };
}

function componentStoryBlocks(requirements, { componentAliasesByName }) {
  const components = requirements.required_components.length > 0 ? requirements.required_components : ['CurrentSliceSurface'];
  const defaultPropsByComponent = {
    AppShell: `title="Storybook Surface"`,
    StatusPill: `status="due" label="Due now"`,
    HealthPlanItem: `item={{
      catalogItemId: 'storybook-item-1',
      name: 'Annual wellness visit',
      status: 'due',
      statusLabel: 'Due now',
      category: 'checkup',
      categoryLabel: 'Checkups',
      cadenceLabel: 'Every year',
      whyItMatters: 'Regular preventive visits help catch issues early and keep your plan on track.',
    }}`,
    PrioritySection: `priority="today" title="Today" items={[{
      catalogItemId: 'storybook-item-1',
      name: 'Annual wellness visit',
      status: 'due',
      statusLabel: 'Due now',
      category: 'checkup',
      categoryLabel: 'Checkups',
      cadenceLabel: 'Every year',
      whyItMatters: 'Regular preventive visits help catch issues early and keep your plan on track.',
    }]}`,
    HealthScoreCard: `score={78} highlightedItem={{
      name: 'Annual wellness visit',
      categoryLabel: 'Checkups',
      cadenceLabel: 'Every year',
    }}`,
    FamilyProfileCard: `name="Alex" score={78} dueCount={3}`,
    VaccinationStatusRow: `vaccine="Influenza vaccine" status="planned" statusLabel="Planned" lastDate={null}`,
    ReminderSelector: `options={['1_month', '3_months', 'custom_date']}`,
  };
  return components.map((component) => `
export const ${toIdentifier(component, 'Component')}Visual = {
  render: () => ${componentAliasesByName[component]
    ? `<${componentAliasesByName[component]}${defaultPropsByComponent[component] ? ` ${defaultPropsByComponent[component]}` : ''} />`
    : `<ComponentFallback component=${JSON.stringify(component)} />`},
  name: 'Product/${component}',
};`).join('\n');
}

function screenStoryBlocks(requirements, routeAliases, routeStoryArgsByAlias = {}) {
  const screens = requirements.required_screens.length > 0 ? requirements.required_screens : ['CurrentSliceScreen'];
  return screens.map((screen, index) => {
    const routeAlias = routeAliases[index] || routeAliases[0];
    if (routeAlias) {
      const routeArgs = routeStoryArgsByAlias[routeAlias] || '';
      return `
export const ${toIdentifier(screen, 'Screen')}Visual = {
  render: () => <${routeAlias}${routeArgs ? ` ${routeArgs}` : ''} />,
  name: 'Screens/${screen}',
};`;
    }
    return `
export const ${toIdentifier(screen, 'Screen')}Contract = {
  render: () => <ContractSurface title="${screen}" type="screen" />,
  name: 'Screens/${screen}',
};`;
  }).join('\n');
}

function buildFixturesTs({ slice, requirements }) {
  return `export const storybookContract = ${JSON.stringify({
    slice_id: slice.id || 'UNKNOWN',
    slice_title: slice.title || 'Current Slice',
    required_components: requirements.required_components,
    required_screens: requirements.required_screens,
    required_states: requirements.required_states,
    required_statuses: requirements.required_statuses,
    required_priorities: requirements.required_priorities,
  }, null, 2)} as const;\n`;
}

function buildStoriesTsx({ targetRoot, slice, requirements }) {
  const normalized = normalizeSliceIdForPath(slice.id);
  const storyDirRelPath = storybookSliceDirRelPath(slice.id);
  const { importDefs, supportDefs, routeAliases, routeStoryArgsByAlias, componentAliasesByName } = detectVisualStoryTargets({
    targetRoot,
    sliceId: slice.id,
    storyDirRelPath,
    componentNames: requirements.required_components,
    requiredScreens: requirements.required_screens,
  });
  return `import React from 'react';
import { storybookContract } from './fixtures';
${importDefs.join('\n')}
${supportDefs.length > 0 ? `\n${supportDefs.join('\n')}\n` : ''}

const meta = {
  title: 'Slices/${normalized}',
  parameters: {
    layout: 'centered',
    fabric: storybookContract,
  },
};

export default meta;

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <section className="app-panel">{children}</section>
    </main>
  );
}

function ContractSurface({ title, type }: { title: string; type: 'component' | 'screen' }) {
  return (
    <StoryFrame>
      <p className="kicker">{type} contract story</p>
      <h1>{title}</h1>
      <p className="subtle">{storybookContract.slice_title}</p>
      <section>
        <strong>Required states</strong>
        <ul>{storybookContract.required_states.map((state) => <li key={state}>{state}</li>)}</ul>
      </section>
      <section>
        <strong>Semantic statuses</strong>
        <ul>{storybookContract.required_statuses.map((status) => <li key={status}>{status}</li>)}</ul>
      </section>
      <section>
        <strong>Priority groups</strong>
        <ul>{storybookContract.required_priorities.map((priority) => <li key={priority}>{priority}</li>)}</ul>
      </section>
    </StoryFrame>
  );
}

function ComponentFallback({ component }: { component: string }) {
  const token = component.toLowerCase();
  if (token.includes('status')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <div>
          <span className="status-pill status-pill-due">Due</span>{' '}
          <span className="status-pill status-pill-soon">Upcoming</span>
        </div>
      </StoryFrame>
    );
  }
  if (token.includes('item')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <article className="health-plan-item">
          <button type="button" className="health-plan-item-button">
            <div>
              <h4>Annual blood panel</h4>
              <p className="subtle">Due in 1 month</p>
            </div>
            <span className="status-pill status-pill-due">Due</span>
          </button>
        </article>
      </StoryFrame>
    );
  }
  if (token.includes('section')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="priority-section priority-today">
          <h3>Today</h3>
        </section>
        <section className="priority-section priority-soon">
          <h3>Soon</h3>
        </section>
        <section className="priority-section priority-later">
          <h3>Later</h3>
        </section>
      </StoryFrame>
    );
  }
  if (token.includes('score')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="health-score-card">
          <p className="kicker">Health Score</p>
          <p className="health-score-value">78</p>
          <p className="subtle">4 due now, 2 due soon.</p>
        </section>
      </StoryFrame>
    );
  }
  if (token.includes('profile')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="family-profile-card">
          <p className="kicker">Active profile</p>
          <h2>Alex, age 42</h2>
          <p className="subtle">3 actions need attention soon.</p>
        </section>
      </StoryFrame>
    );
  }
  return <ContractSurface title={component} type="component" />;
}
${componentStoryBlocks(requirements, { componentAliasesByName })}
${screenStoryBlocks(requirements, routeAliases, routeStoryArgsByAlias)}
`;
}

function buildReadme({ slice, requirements }) {
  return [
    `# Storybook stories for ${slice.id || 'current slice'}`,
    '',
    `Slice: ${slice.title || 'Current Slice'}`,
    '',
    'These stories are generated from Fabric contracts and auto-wire detected real route/component modules when available.',
    'If no visual module is detected for a required path, Fabric falls back to a placeholder story and the Storybook review fails until that binding is resolved.',
    '',
    '## Required components',
    ...(requirements.required_components.length > 0 ? requirements.required_components.map((item) => `- ${item}`) : ['- CurrentSliceSurface']),
    '',
    '## Required screens',
    ...(requirements.required_screens.length > 0 ? requirements.required_screens.map((item) => `- ${item}`) : ['- CurrentSliceScreen']),
    '',
    '## Required states',
    ...requirements.required_states.map((item) => `- ${item}`),
    '',
    '## Required semantic statuses',
    ...requirements.required_statuses.map((item) => `- ${item}`),
    '',
    '## Required priorities',
    ...requirements.required_priorities.map((item) => `- ${item}`),
    '',
    '## Closeout expectation',
    '',
    'Run `fabric uiux:review-current-slice-storybook --target .` and resolve findings before `coder:close-current-slice`.',
    '',
  ].join('\n');
}

function ensureStorybookPackageScripts(targetRoot) {
  const pkgPath = path.join(targetRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return { exists: false, changed: false, runtimeFiles: [] };
  const pkg = JSON.parse(readText(pkgPath));
  pkg.private = true;
  pkg.type = 'module';
  pkg.scripts = pkg.scripts || {};
  const desired = {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
    storybook: 'storybook dev -p 6006',
    'build-storybook': 'storybook build',
    'test:storybook': 'vitest --config vitest.config.ts',
  };
  let changed = false;
  for (const [name, command] of Object.entries(desired)) {
    if (!pkg.scripts[name]) {
      pkg.scripts[name] = command;
      changed = true;
    }
  }
  pkg.dependencies = pkg.dependencies || {};
  changed = addIfMissing(pkg.dependencies, 'react', '^18.3.1') || changed;
  changed = addIfMissing(pkg.dependencies, 'react-dom', '^18.3.1') || changed;
  pkg.devDependencies = pkg.devDependencies || {};
  changed = addIfMissing(pkg.devDependencies, '@vitejs/plugin-react', '^4.3.4') || changed;
  changed = addIfMissing(pkg.devDependencies, 'vite', '^5.4.10') || changed;
  changed = addIfMissing(pkg.devDependencies, 'typescript', '^5.6.3') || changed;
  changed = addIfMissing(pkg.devDependencies, 'vitest', '^2.1.8') || changed;
  changed = addIfMissing(pkg.devDependencies, 'storybook', '^10.3.6') || changed;
  changed = addIfMissing(pkg.devDependencies, '@storybook/react-vite', '^10.3.6') || changed;
  changed = addIfMissing(pkg.devDependencies, '@storybook/addon-docs', '^10.3.6') || changed;
  if (changed) {
    writeTextAtomic(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  const runtimeFiles = ensureStorybookRuntimeFiles(targetRoot);
  return { exists: true, changed, runtimeFiles };
}

function coderGenerateCurrentSliceStories({ targetRoot }) {
  const slice = currentSlice(targetRoot);
  const requirements = loadSliceStorybookRequirements(targetRoot, slice.id);
  const dirRelPath = storybookSliceDirRelPath(slice.id);
  const dirAbsPath = path.join(targetRoot, dirRelPath);
  fs.mkdirSync(dirAbsPath, { recursive: true });
  const fixturesRelPath = `${dirRelPath}/fixtures.ts`;
  const storiesRelPath = `${dirRelPath}/${normalizeSliceIdForPath(slice.id)}.stories.tsx`;
  const readmeRelPath = `${dirRelPath}/README.md`;
  const storiesText = buildStoriesTsx({ targetRoot, slice, requirements });
  writeTextAtomic(path.join(targetRoot, fixturesRelPath), buildFixturesTs({ slice, requirements }));
  writeTextAtomic(path.join(targetRoot, storiesRelPath), storiesText);
  writeTextAtomic(path.join(targetRoot, readmeRelPath), buildReadme({ slice, requirements }));
  const pkg = ensureStorybookPackageScripts(targetRoot);
  writeTextAtomic(path.join(targetRoot, storybookRequirementsRelPathForSlice(slice.id)), `${JSON.stringify(requirements, null, 2)}\n`);
  preflightGeneratedStoriesForRequiredSurfaces({ requirements, storiesRelPath, storiesText });
  console.log('fabric coder:generate-current-slice-stories: OK');
  console.log(`- wrote: ${fixturesRelPath}`);
  console.log(`- wrote: ${storiesRelPath}`);
  console.log(`- wrote: ${readmeRelPath}`);
  if (pkg.exists && pkg.changed) console.log('- updated package.json Storybook scripts/dependencies');
  if (pkg.exists && pkg.runtimeFiles?.length) console.log(`- ensured Storybook config files: ${pkg.runtimeFiles.join(', ')}`);
  if (!pkg.exists) console.log('- package.json not found; Storybook scripts/dependencies were not added');
}

function readStorybookReviewStatus({ targetRoot, sliceId }) {
  const relPath = storybookReviewJsonRelPathForSlice(sliceId);
  const absPath = path.join(targetRoot, relPath);
  if (!fs.existsSync(absPath)) return { exists: false, status: 'missing', relPath };
  try {
    const review = JSON.parse(readText(absPath));
    return { exists: true, status: String(review.status || 'unknown').toLowerCase(), relPath, review };
  } catch (_) {
    return { exists: true, status: 'invalid', relPath };
  }
}

function filesContainAll(targetRoot, relPaths, values) {
  const parts = [];
  for (const relPath of relPaths) {
    const absPath = path.join(targetRoot, relPath);
    if (fs.existsSync(absPath)) {
      parts.push(readText(absPath));
    }
  }
  if (parts.length === 0) return { exists: false, missing: values };
  const text = parts.join('\n');
  const missing = values.filter((value) => !text.includes(String(value)));
  return { exists: true, missing };
}

function reviewComponentStoryDistinctness({ targetRoot, requirements }) {
  const storiesRelPath = requirements.required_files.find((relPath) => /\.stories\.tsx$/.test(relPath));
  if (!storiesRelPath) {
    return { checked: false, blocker: false, message: '' };
  }
  const storiesAbsPath = path.join(targetRoot, storiesRelPath);
  if (!fs.existsSync(storiesAbsPath)) {
    return { checked: false, blocker: false, message: '' };
  }
  const text = readText(storiesAbsPath);
  const productStories = [];
  const storyPattern = /export const\s+[A-Za-z0-9_]+\s*=\s*{\s*render:\s*\(\)\s*=>\s*([\s\S]*?),\s*name:\s*'([^']+)'/g;
  let match = storyPattern.exec(text);
  while (match) {
    const renderExpr = String(match[1] || '').replace(/\s+/g, ' ').trim();
    const storyPath = String(match[2] || '').trim();
    if (storyPath.startsWith('Product/')) {
      productStories.push({ storyPath, renderExpr });
    }
    match = storyPattern.exec(text);
  }
  if (requirements.required_components.length < 2 || productStories.length < 2) {
    return { checked: true, blocker: false, message: '' };
  }
  const uniqueRenders = new Set(productStories.map((item) => item.renderExpr));
  if (uniqueRenders.size <= 1) {
    return {
      checked: true,
      blocker: true,
      message: `Component stories are visually collapsed to one render mapping in ${storiesRelPath}; regenerate stories so required components render distinct surfaces.`,
    };
  }
  return { checked: true, blocker: false, message: '' };
}

function parseStoryRenderMappings(storiesText) {
  const importsByAlias = new Map();
  const importPattern = /import\s+([A-Za-z0-9_]+)\s+from\s+'([^']+)';/g;
  let importMatch = importPattern.exec(storiesText);
  while (importMatch) {
    importsByAlias.set(String(importMatch[1] || '').trim(), String(importMatch[2] || '').trim());
    importMatch = importPattern.exec(storiesText);
  }

  const mappings = [];
  const storyPattern = /export const\s+([A-Za-z0-9_]+)\s*=\s*{\s*render:\s*\(\)\s*=>\s*([\s\S]*?),\s*name:\s*'([^']+)'/g;
  let storyMatch = storyPattern.exec(storiesText);
  while (storyMatch) {
    const exportName = String(storyMatch[1] || '').trim();
    const renderExpr = String(storyMatch[2] || '').replace(/\s+/g, ' ').trim();
    const storyPath = String(storyMatch[3] || '').trim();
    const jsxAliasMatch = renderExpr.match(/^<([A-Za-z0-9_]+)\s*\/>$/);
    const jsxAlias = jsxAliasMatch ? String(jsxAliasMatch[1]).trim() : '';
    mappings.push({
      exportName,
      renderExpr,
      storyPath,
      importPath: jsxAlias ? importsByAlias.get(jsxAlias) || '' : '',
    });
    storyMatch = storyPattern.exec(storiesText);
  }
  return mappings;
}

function collectRequiredStorySurfaceFindings({ requirements, storiesRelPath, mappings }) {
  const findings = [];

  for (const componentName of requirements.required_components || []) {
    const storyPath = `Product/${componentName}`;
    const mapping = mappings.find((entry) => entry.storyPath === storyPath);
    if (!mapping) continue;
    if (mapping.renderExpr.includes('<ComponentFallback')) {
      findings.push({
        severity: 'blocker',
        code: 'placeholder_component_story_surface',
        message: `${storyPath} renders ComponentFallback in ${storiesRelPath}; wire a real component module before closeout.`,
      });
    }
  }

  for (const screenName of requirements.required_screens || []) {
    const storyPath = `Screens/${screenName}`;
    const mapping = mappings.find((entry) => entry.storyPath === storyPath);
    if (!mapping) continue;
    if (mapping.renderExpr.includes('<ContractSurface')) {
      findings.push({
        severity: 'blocker',
        code: 'placeholder_screen_story_surface',
        message: `${storyPath} renders ContractSurface in ${storiesRelPath}; wire a real route/screen module before closeout.`,
      });
    }
  }

  return findings;
}

function reviewRequiredStoryRealSurfaces({ targetRoot, requirements }) {
  const storiesRelPath = requirements.required_files.find((relPath) => /\.stories\.tsx$/.test(relPath));
  if (!storiesRelPath) return [];
  const storiesAbsPath = path.join(targetRoot, storiesRelPath);
  if (!fs.existsSync(storiesAbsPath)) return [];
  const text = readText(storiesAbsPath);
  const mappings = parseStoryRenderMappings(text);
  return collectRequiredStorySurfaceFindings({ requirements, storiesRelPath, mappings });
}

function uiuxReviewCurrentSliceStorybook({ targetRoot }) {
  const slice = currentSlice(targetRoot);
  const requirements = loadSliceStorybookRequirements(targetRoot, slice.id);
  const findings = [];
  const packageJsonPath = path.join(targetRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    findings.push({ severity: 'blocker', code: 'missing_package_json', message: 'Missing package.json; cannot validate Storybook scripts.' });
  } else {
    const pkg = JSON.parse(readText(packageJsonPath));
    for (const scriptName of ['dev', 'storybook', 'build-storybook', 'test:storybook']) {
      if (!pkg?.scripts?.[scriptName]) {
        findings.push({ severity: 'blocker', code: 'missing_storybook_script', message: `package.json is missing script: ${scriptName}` });
      }
    }
    for (const depName of ['react', 'react-dom']) {
      if (!pkg?.dependencies?.[depName]) {
        findings.push({ severity: 'blocker', code: 'missing_frontend_dependency', message: `package.json is missing dependency: ${depName}` });
      }
    }
    for (const depName of ['vite', 'storybook', '@storybook/react-vite']) {
      if (!pkg?.devDependencies?.[depName]) {
        findings.push({ severity: 'blocker', code: 'missing_storybook_dependency', message: `package.json is missing devDependency: ${depName}` });
      }
    }
  }
  for (const relPath of ['.storybook/main.ts', '.storybook/preview.ts']) {
    if (!fs.existsSync(path.join(targetRoot, relPath))) {
      findings.push({ severity: 'blocker', code: 'missing_storybook_config', message: `Missing Storybook config file: ${relPath}` });
    }
  }
  if (!fs.existsSync(path.join(targetRoot, storybookMapRelPath()))) {
    findings.push({ severity: 'blocker', code: 'missing_storybook_map', message: `Missing ${storybookMapRelPath()}; run uiux:generate-storybook-map.` });
  }
  for (const relPath of requirements.required_files) {
    if (!fs.existsSync(path.join(targetRoot, relPath))) {
      findings.push({ severity: 'blocker', code: 'missing_story_file', message: `Missing ${relPath}; run coder:generate-current-slice-stories.` });
    }
  }
  const coverageRelPaths = requirements.required_files;
  for (const [label, values] of [
    ['required component', requirements.required_components],
    ['required screen', requirements.required_screens],
    ['required state', requirements.required_states],
    ['required status', requirements.required_statuses],
    ['required priority', requirements.required_priorities],
  ]) {
    const result = filesContainAll(targetRoot, coverageRelPaths, values);
    if (!result.exists) continue;
    for (const missing of result.missing) {
      findings.push({ severity: 'blocker', code: 'missing_storybook_contract_coverage', message: `Storybook files do not mention ${label}: ${missing}` });
    }
  }
  const distinctness = reviewComponentStoryDistinctness({ targetRoot, requirements });
  if (distinctness.blocker) {
    findings.push({ severity: 'blocker', code: 'non_distinct_component_story_visuals', message: distinctness.message });
  }
  findings.push(...reviewRequiredStoryRealSurfaces({ targetRoot, requirements }));
  const status = findings.some((finding) => finding.severity === 'blocker') ? 'fail' : 'pass';
  const generatedAt = new Date().toISOString();
  const review = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    slice_id: String(slice.id || 'UNKNOWN'),
    status,
    storybook_paths: requirements.required_storybook_paths,
    required_states_covered: !findings.some((finding) => finding.code === 'missing_storybook_contract_coverage'),
    package_scripts_present: !findings.some((finding) => finding.code === 'missing_storybook_script'),
    map_present: !findings.some((finding) => finding.code === 'missing_storybook_map'),
    findings,
    note: 'This deterministic review checks Fabric-to-Storybook coverage. It does not replace visual review or Storybook build output.',
  };
  const jsonRelPath = storybookReviewJsonRelPathForSlice(slice.id);
  const mdRelPath = storybookReviewMdRelPathForSlice(slice.id);
  writeTextAtomic(path.join(targetRoot, jsonRelPath), `${JSON.stringify(review, null, 2)}\n`);
  writeTextAtomic(path.join(targetRoot, mdRelPath), [
    `# Storybook Review: ${slice.id || 'Current Slice'}`,
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Status: ${status}`,
    '',
    '## Storybook paths',
    ...(requirements.required_storybook_paths.length > 0 ? requirements.required_storybook_paths.map((item) => `- ${item}`) : ['- None declared']),
    '',
    '## Findings',
    ...(findings.length > 0 ? findings.map((finding) => `- [${finding.severity}] ${finding.message}`) : ['- No blocker findings.']),
    '',
  ].join('\n'));
  console.log(`fabric uiux:review-current-slice-storybook: ${status.toUpperCase()}`);
  console.log(`- wrote: ${jsonRelPath}`);
  console.log(`- wrote: ${mdRelPath}`);
  if (status !== 'pass') {
    const error = new Error(`Storybook review failed with ${findings.length} finding(s). See ${jsonRelPath}.`);
    error.alreadyLogged = true;
    throw error;
  }
}

function preflightGeneratedStoriesForRequiredSurfaces({ requirements, storiesRelPath, storiesText }) {
  const mappings = parseStoryRenderMappings(storiesText);
  const findings = collectRequiredStorySurfaceFindings({ requirements, storiesRelPath, mappings })
    .filter((finding) => finding.severity === 'blocker');
  if (findings.length === 0) return;
  const lines = [
    'Generated Storybook stories still contain placeholder surfaces for required contract paths.',
    `Story file: ${storiesRelPath}`,
    '',
    ...findings.map((finding) => `- ${finding.message}`),
    '',
    'Next action:',
    '- Implement/export real UI surfaces for the missing contract paths (or update the UX contracts if requirements changed).',
    '- Re-run coder:generate-current-slice-stories.',
  ];
  const error = new Error(lines.join('\n'));
  throw error;
}

export {
  storybookMapRelPath,
  storybookRequirementsRelPathForSlice,
  storybookReviewJsonRelPathForSlice,
  storybookReviewMdRelPathForSlice,
  storybookSliceDirRelPath,
  uiuxGenerateStorybookMap,
  coderGenerateCurrentSliceStories,
  uiuxReviewCurrentSliceStorybook,
  readStorybookReviewStatus,
};
