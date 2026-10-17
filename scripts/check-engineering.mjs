// Credential-free publication checks for authored Python engineering scenarios.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parse } from '@babel/parser';
import { SCENARIOS, ENGINEERING_TRACKS, ENGINEERING_DIFFICULTIES, ENGINEERING_SECTIONS, scenarioPaths } from '../src/data/engineering.js';
import { LIVE_PUZZLES } from '../src/data/puzzles.js';
import { buildPuzzleNarrationPlan, stableJson } from './narration/puzzle-narration-pipeline.mjs';
import { assertPublicManifest, receiptObjectsForManifest, publicationIdentity } from './narration/release-contract.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
const text = value => typeof value === 'string' && value.trim().length > 0;
const list = value => Array.isArray(value) && value.length > 0 && value.every(text);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROLES = new Set(['starter', 'fixture', 'test', 'reference']);
const FILE_LANGUAGES = new Set(['python', 'json', 'toml', 'text']);
const PACKAGE_EXTENSIONS = new Set(['.py', '.toml', '.json', '.jsonl', '.csv', '.txt', '.md', '.lock', '.npy', '.npz', '.png', '.jpg', '.wav']);

export function resolveScenarioFile(root, relative) {
  if (!text(relative) || relative.includes('\\') || path.posix.isAbsolute(relative)
      || relative.split('/').some(part => !part || part === '.' || part === '..') || relative.includes(':')) {
    throw new Error(`Unsafe relative file path: ${String(relative)}`);
  }
  const resolved = path.resolve(root, relative);
  const inside = candidate => candidate === root || candidate.startsWith(`${root}${path.sep}`);
  if (!inside(resolved)) throw new Error(`File escapes its scenario: ${relative}`);
  if (fs.existsSync(resolved) && !inside(fs.realpathSync(resolved))) throw new Error(`File link escapes its scenario: ${relative}`);
  return resolved;
}

function sourceObject(ast, name) {
  for (const node of ast.program.body) {
    if (node.type !== 'ExportNamedDeclaration') continue;
    const declaration = node.declaration?.declarations?.find(item => item.id.name === name);
    if (declaration) return declaration.init;
  }
  return null;
}
const property = (node, key) => node?.properties?.find(p => (p.key?.name ?? p.key?.value) === key)?.value;
const literal = node => node?.type === 'StringLiteral' ? node.value : undefined;

function inspectScenarioContent(source, { directory, filesExist = fs.existsSync } = {}) {
  const errors = [];
  const primaryFiles = [];
  const ast = parse(source, {sourceType:'module',plugins:['jsx']});
  const content = sourceObject(ast, 'content');
  if (content?.type !== 'ObjectExpression') return { errors:['content.jsx must export a literal content object'], primaryFiles };
  for (const section of ENGINEERING_SECTIONS) {
    const value = property(content, section);
    if (!value || value.type === 'NullLiteral' || value.type === 'BooleanLiteral' || (value.type === 'StringLiteral' && !text(value.value))) errors.push(`content.${section} is missing or empty`);
  }
  const imports = new Map(ast.program.body.filter(n => n.type === 'ImportDeclaration').flatMap(n => n.specifiers.map(s => [s.local.name,n.source.value])));
  const files = property(content, 'files');
  if (files?.type !== 'ArrayExpression' || !files.elements.length) errors.push('content.files must be a nonempty literal array');
  const seen = new Set();
  const roles = new Set();
  let hasPrimaryFlag = false;
  for (const file of files?.elements || []) {
    const name = literal(property(file,'path'));
    const role = literal(property(file,'role'));
    const language = literal(property(file,'language'));
    const primaryFlags = file?.properties?.filter(p => (p.key?.name ?? p.key?.value) === 'primary') || [];
    if (primaryFlags.length) {
      hasPrimaryFlag = true;
      if (primaryFlags.length !== 1 || primaryFlags[0].computed
          || primaryFlags[0].value?.type !== 'BooleanLiteral' || primaryFlags[0].value.value !== true
          || file.properties.some(p => p.type === 'SpreadElement' || p.computed)) {
        errors.push(`${name}: primary must be a single literal primary: true property without spreads or computed properties`);
      } else {
        if (!['starter','reference'].includes(role) || language !== 'python') errors.push(`${name}: primary files must be Python starter or reference files`);
        primaryFiles.push({path:name,role});
      }
    }
    if (!name || seen.has(name)) errors.push('content.files paths must be nonempty and unique');
    seen.add(name); roles.add(role);
    if (!ROLES.has(role) || !FILE_LANGUAGES.has(language)) errors.push(`${name}: invalid file role or language`);
    if (!text(literal(property(file,'description')))) errors.push(`${name}: file description is required`);
    const imported = imports.get(property(file,'source')?.name);
    if (!imported?.endsWith('?raw')) { errors.push(`${name}: source must be imported from the actual file using ?raw`); continue; }
    if ((role === 'starter' || role === 'reference' || role === 'test') && !name?.startsWith('python/')) errors.push(`${name}: Python work must live in the package`);
    if (language === 'python' && !name?.endsWith('.py')) errors.push(`${name}: Python source must use .py`);
    if ((role === 'starter' || role === 'reference' || role === 'test') && language !== 'python') errors.push(`${name}: executable work and tests must be Python`);
    try {
      const absolute = resolveScenarioFile(directory, name);
      const importedFile = path.resolve(directory, imported.slice(0,-4));
      if (absolute !== importedFile || !filesExist(absolute)) errors.push(`${name}: raw import does not match an existing declared file`);
    } catch (error) { errors.push(error.message); }
  }
  if (hasPrimaryFlag) {
    for (const role of ['starter','reference']) {
      if (primaryFiles.filter(file => file.role === role).length !== 1) errors.push(`content.files must select exactly one primary ${role} together with one primary ${role === 'starter' ? 'reference' : 'starter'}`);
    }
  }
  for (const role of ROLES) if (!roles.has(role)) errors.push(`content.files needs a ${role} file`);
  const alternatives = property(content,'tradeoffs');
  if (alternatives?.type !== 'ArrayExpression' || alternatives.elements.length < 2 || alternatives.elements.length > 3) errors.push('content.tradeoffs needs two or three alternatives');
  for (const alternative of alternatives?.elements || []) {
    for (const key of ['name','preferWhen','cost']) if (!text(literal(property(alternative,key)))) errors.push(`Each alternative needs a nonempty ${key}`);
  }
  return { errors, primaryFiles };
}

export function validateScenarioContent(source, options) {
  return inspectScenarioContent(source,options).errors;
}

export function validateScenarioContract(contract, scenario, { directory } = {}) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  if (!object(contract)) return ['scenario.json must be an object'];
  need(contract.schemaVersion === 1, 'scenario.json schemaVersion must be 1');
  need(contract.slug === scenario.slug && contract.track === scenario.track && contract.language === 'python', 'scenario.json identity, engineering track, and Python language must match the registry');
  for (const key of ['context','request']) need(text(contract.system?.[key]), `system.${key} is required`);
  for (const key of ['inputs','outputs','constraints','successCriteria']) need(list(contract.system?.[key]), `system.${key} must be a nonempty string array`);
  need(/^[a-z][a-z0-9_]*$/.test(contract.python?.package || ''), 'python.package must be an importable Python package name');
  need(['stdlib','locked'].includes(contract.python?.dependencies), 'python.dependencies must be stdlib or locked');
  if (Object.hasOwn(contract.python || {},'starterExitCode')) {
    need(Number.isInteger(contract.python.starterExitCode) && [0,1].includes(contract.python.starterExitCode), 'python.starterExitCode must be integer 0 or 1');
  }
  const file = relative => {
    try {
      const absolute = resolveScenarioFile(directory,relative);
      need(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `Missing file: ${relative}`);
      return fs.existsSync(absolute) && fs.statSync(absolute).isFile() ? absolute : null;
    } catch (error) { errors.push(error.message); return null; }
  };
  const name = contract.python?.package;
  if (/^[a-z][a-z0-9_]*$/.test(name || '')) {
    for (const leaf of ['__init__.py','starter.py','solution.py']) file(`python/src/${name}/${leaf}`);
  }
  const project = file('python/pyproject.toml');
  if (project) {
    const toml = fs.readFileSync(project,'utf8');
    need(/^\[project\]\s*$/m.test(toml) && /^requires-python\s*=\s*["']>=3\.(?:11|12|13|14)["']/m.test(toml), 'pyproject.toml must declare [project] and requires-python >=3.11 or newer supported minor');
    need(/^name\s*=\s*["'][^"']+["']/m.test(toml), 'pyproject.toml needs a project name');
    if (contract.python?.dependencies === 'stdlib') need(/^dependencies\s*=\s*\[\s*\]/m.test(toml), 'stdlib packages must declare dependencies = []');
  }
  if (contract.python?.dependencies === 'locked') file('python/requirements.lock');
  const fixtures = contract.fixtures;
  need(Array.isArray(fixtures) && fixtures.length > 0, 'At least one actual fixture is required');
  for (const fixture of Array.isArray(fixtures) ? fixtures : []) {
    need(fixture.path?.startsWith('python/fixtures/'), 'Fixtures must be under python/fixtures/');
    need(text(fixture.description), 'Each fixture needs a description');
    const absolute = file(fixture.path);
    need(/^[a-f0-9]{64}$/.test(fixture.sha256 || ''), `${fixture.path}: fixture SHA-256 is required`);
    if (absolute) need(digest(fs.readFileSync(absolute)) === fixture.sha256, `${fixture.path}: fixture hash mismatch`);
  }
  const checks = Array.isArray(contract.checks) ? contract.checks : [];
  const ids = new Set();
  for (const check of checks) {
    need(SLUG.test(check.id || '') && !ids.has(check.id), 'Checks need distinct lowercase IDs'); ids.add(check.id);
    need(['correctness','failure','evaluation'].includes(check.kind), `${check.id}: unknown check kind`);
    need(text(check.description), `${check.id}: check description is required`);
    need(/^python\/tests\/test_[a-z0-9_]+\.py$/.test(check.file || ''), `${check.id}: check must identify an actual Python unittest file`);
    need(/^test_[a-z0-9_]+$/.test(check.function || ''), `${check.id}: check function must name a test`);
    const absolute = file(check.file);
    if (absolute && /^test_[a-z0-9_]+$/.test(check.function || '')) need(new RegExp(`\\bdef ${check.function}\\s*\\(`).test(fs.readFileSync(absolute,'utf8')), `${check.id}: named test function is missing`);
  }
  for (const kind of ['correctness','failure','evaluation']) need(checks.some(c => c.kind === kind), `A ${kind} check is required`);
  const visuals = Array.isArray(contract.visuals) ? contract.visuals : [];
  need(visuals.length > 0, 'At least one pertinent static diagram or animation is required');
  for (const visual of visuals) {
    need(['svg','canvas'].includes(visual.kind), 'Visual kind must be svg or canvas');
    need(text(visual.description) && text(visual.correctness), 'Each visual needs an explanation of what it shows and how correctness was checked');
    need(ids.has(visual.check), 'Each visual must cite a declared executable check');
    need(visual.path?.startsWith('visuals/'), 'Visuals must live under the scenario visuals/ directory');
    const absolute = file(visual.path);
    if (absolute && visual.kind === 'svg') need(visual.path.endsWith('.svg') && /<svg\b[^>]*\bviewBox=/.test(fs.readFileSync(absolute,'utf8')), 'Static diagrams need an SVG viewBox');
    if (absolute && visual.kind === 'canvas') need(visual.path.endsWith('.jsx'), 'Canvas visuals must identify their JSX module');
  }
  const pythonRoot = path.join(directory,'python');
  function inspect(current) {
    if (!fs.existsSync(current)) return;
    for (const item of fs.readdirSync(current,{withFileTypes:true})) {
      if (['__pycache__','.venv','.pytest_cache','build','dist'].includes(item.name) || item.name.endsWith('.egg-info')) continue;
      const absolute = path.join(current,item.name);
      if (item.isSymbolicLink()) { errors.push('Python package files must not be symlinks'); continue; }
      if (item.isDirectory()) inspect(absolute);
      else if (!PACKAGE_EXTENSIONS.has(path.extname(item.name))) errors.push(`Unexpected non-Python executable or asset: ${path.relative(directory,absolute)}`);
    }
  }
  inspect(pythonRoot);
  return errors;
}

function verifyReceipt(receipt,manifest) {
  if (!Array.isArray(receipt.objects) || receipt.objects.length !== 2) throw new Error('Publication receipt needs both voice objects');
  const expected = receiptObjectsForManifest(manifest,Object.fromEntries(receipt.objects.map(o => [o.track_id,o.result])));
  if (stableJson(expected) !== stableJson(receipt.objects)) throw new Error('Publication receipt does not match the current audio manifest');
  if (receipt.publication_sha256 !== digest(stableJson(publicationIdentity(receipt.objects)))) throw new Error('Publication receipt identity hash mismatch');
  if (receipt.object_count !== 2 || receipt.page_count !== 1 || receipt.release_count !== 1) throw new Error('Publication receipt counts are invalid');
}

function checkPrimaryFiles(primaryFiles, {directory,python,starterExitCode=1}) {
  const errors = [];
  if (!primaryFiles.length) return errors;
  const tempRoot = fs.realpathSync(os.tmpdir());
  // Keep only host runtime settings: no Python import path or credentials from
  // the author's environment should be needed to run a copied exercise.
  const runtimeKeys = new Set(['PATH','PATHEXT','SYSTEMROOT','WINDIR','SYSTEMDRIVE','COMSPEC','TEMP','TMP','LANG','LC_ALL','LC_CTYPE']);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => runtimeKeys.has(key.toUpperCase())));
  for (const role of ['reference','starter']) {
    const file = primaryFiles.find(entry => entry.role === role);
    if (!file) continue;
    const prefix = `Primary ${file.role} ${file.path}`;
    const temporary = fs.mkdtempSync(path.join(tempRoot,'algonow-standalone-'));
    try {
      const source = resolveScenarioFile(directory,file.path);
      const filename = path.basename(source);
      fs.copyFileSync(source,path.join(temporary,filename));
      const result = spawnSync(python,['-I','-S',filename],{cwd:temporary,env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
      const output = `${result.stdout || ''}\n${result.stderr || ''}`;
      const detail = (result.error?.message || output.trim() || 'no output').slice(-2000);
      const expected = file.role === 'reference' ? 0 : starterExitCode;
      if (result.error || result.signal || result.status !== expected) {
        errors.push(`${prefix}: isolated run expected exit ${expected}, got ${result.status ?? result.signal ?? 'no exit code'}: ${detail}`);
      }
      const missingSetup = /(?:^|\n)[\s|+]*(?:ModuleNotFoundError|ImportError|FileNotFoundError|NotADirectoryError)\s*:|no such file or directory|can't open file|cannot (?:find|open) (?:the )?(?:file|fixture)|(?:^|\n)\s*(?:error:\s*)?(?:(?:missing|required)[^:\r\n]{0,80}(?:file|fixture)|(?:file|fixture)[^\r\n]{0,80}(?:missing|not found))/i;
      if (result.status !== 0 && missingSetup.test(output)) {
        errors.push(`${prefix}: isolated run needs an unavailable import or file; embed the required data and remove sibling/package dependencies: ${detail}`);
      }
      if (file.role === 'reference' && result.status === 0 && !/^\s*OK\b/m.test(result.stdout || '')) {
        errors.push(`${prefix}: isolated run must print an OK marker to stdout`);
      }
    } catch (error) {
      errors.push(`${prefix}: isolated run could not complete: ${error.message}`);
    } finally {
      // Verify the exact newly-created directory before recursive removal.
      if (fs.existsSync(temporary)) {
        const actual = fs.realpathSync(temporary);
        if (actual !== path.resolve(temporary) || path.dirname(actual) !== tempRoot || !path.basename(actual).startsWith('algonow-standalone-')) throw new Error('Refusing to remove a path other than the standalone check temporary directory');
        fs.rmSync(temporary,{recursive:true,force:true});
      }
    }
  }
  return errors;
}

export async function checkEngineering({root=ROOT,scenarios=SCENARIOS,tracks=ENGINEERING_TRACKS,includeDrafts=false,runPython=false,python=process.env.PYTHON || 'python'}={}) {
  root = fs.realpathSync(root);
  const errors = [], warnings = [], checked = [];
  const seen = new Set(), trackIds = new Set(tracks.map(t => t.id));
  const legacy = new Set(LIVE_PUZZLES.map(p => p.slug));
  for (const scenario of scenarios) {
    const slug = scenario?.slug;
    const local = [];
    const need = (condition,message) => { if (!condition) local.push(message); };
    if (!SLUG.test(slug || '')) { errors.push('Scenario slug is invalid'); continue; }
    need(!seen.has(slug),'Duplicate scenario slug'); seen.add(slug);
    need(!legacy.has(slug) && !fs.existsSync(path.join(root,'src/content',`${slug}.jsx`)), 'Scenario slug collides with legacy content or its narration identity');
    for (const key of ['title','summary']) need(text(scenario[key]),`${key} is required`);
    need(trackIds.has(scenario.track),'An AI engineering track is required');
    need(scenario.language === 'python','New scenario implementation language must be python');
    need(!Object.hasOwn(scenario,'algorithm') && !Object.hasOwn(scenario,'heuristic'),'Scenarios must not use the legacy algorithm/heuristic pairing schema');
    need(['draft','published'].includes(scenario.status),'status must be draft or published');
    need(ENGINEERING_DIFFICULTIES.includes(scenario.difficulty),'Unknown difficulty');
    need(Number.isInteger(scenario.durationMinutes) && scenario.durationMinutes > 0,'durationMinutes must be a positive integer');
    need(list(scenario.skills),'skills must be a nonempty string array');
    need(scenario.authoringModel === 'Claude Fable 5','Scenario authorship must be attributed to Claude Fable 5');
    const paths = scenarioPaths(slug);
    if (scenario.href !== undefined) need(scenario.href === paths.href,'href must match the scenario namespace');
    if (scenario.html !== undefined) need(scenario.html === paths.html,'html must match the scenario namespace');
    if (scenario.status === 'published') {
      need(Number.isInteger(scenario.listenMinutes) && scenario.listenMinutes > 0,'Published scenarios need listenMinutes for the actual narration, separate from task duration');
      need(/^\d{4}-\d{2}-\d{2}$/.test(scenario.added || '') && Number.isFinite(Date.parse(scenario.added)) && Date.parse(scenario.added) <= Date.now()+86400000,'Published scenarios need their actual publication date');
    }
    if (scenario.status === 'published' || includeDrafts) {
      try {
        const directory = resolveScenarioFile(root,paths.directory);
        for (const key of ['html','main','content','contract','narration']) need(fs.existsSync(resolveScenarioFile(root,paths[key])),`${paths[key]} is missing`);
        if (!local.length) {
          const contract = JSON.parse(fs.readFileSync(path.join(root,paths.contract),'utf8'));
          local.push(...validateScenarioContract(contract,scenario,{directory}));
          const source = fs.readFileSync(path.join(root,paths.content),'utf8');
          const contentCheck = inspectScenarioContent(source,{directory});
          local.push(...contentCheck.errors);
          const entry = fs.readFileSync(path.join(root,paths.main),'utf8');
          for (const token of ['ScenarioPage','content','narrationPlayer','PreservedListenPlayer','narrationManifestProblem']) need(entry.includes(token),`Entry must wire ${token}`);
          need(!/\b(?:speechSynthesis|SpeechSynthesisUtterance)\b|from\s+['"][^'"]*\/ListenPlayer\.jsx/.test(entry),'Scenario narration must never fall back to browser speech');
          const html = fs.readFileSync(path.join(root,paths.html),'utf8');
          need(html.includes(`https://algonow.net${paths.href}`) && html.includes('name="description"') && html.includes('type="module"'), 'Entry HTML needs its canonical URL, description, and module entry');
          const narrationPath = path.join(root,paths.narration);
          const {narration} = await import(`${pathToFileURL(narrationPath).href}?audit=${digest(fs.readFileSync(narrationPath))}`);
          need(Array.isArray(narration) && narration.every(n => ENGINEERING_SECTIONS.includes(n.section) && text(n.text)), 'Canonical narration must contain only nonempty scenario sections');
          for (const section of ENGINEERING_SECTIONS) need(narration?.some(n => n.section === section),`Narration is missing ${section}`);
          if (scenario.status === 'published') {
            const plan = buildPuzzleNarrationPlan({slug,narration,sourcePath:paths.narration});
            const manifest = JSON.parse(fs.readFileSync(resolveScenarioFile(root,paths.manifest),'utf8'));
            assertPublicManifest(manifest,plan,slug);
            verifyReceipt(JSON.parse(fs.readFileSync(resolveScenarioFile(root,paths.receipt),'utf8')),manifest);
          }
          if (runPython && !local.length) {
            const result = spawnSync(python,['-m','unittest','discover','-s','tests','-p','test_*.py'],{cwd:path.join(directory,'python'),encoding:'utf8',timeout:120000,
              env:{...process.env,PYTHONPATH:path.join(directory,'python','src'),PYTHONDONTWRITEBYTECODE:'1'}});
            const output = `${result.stdout || ''}\n${result.stderr || ''}`;
            need(result.status === 0 && /Ran [1-9]\d* tests?/.test(output) && /\bOK\b/.test(output),`Python unittest failed or ran no tests: ${(result.error?.message || output).slice(-2000)}`);
            local.push(...checkPrimaryFiles(contentCheck.primaryFiles,{directory,python,starterExitCode:contract.python.starterExitCode ?? 1}));
          }
        }
      } catch (error) { local.push(error.message); }
      checked.push(slug);
    }
    errors.push(...local.map(message => `${slug}: ${message}`));
  }
  if (!runPython && checked.length) warnings.push('This structural check did not execute Python; run --run-python in each prepared environment before publication.');
  return {errors,warnings,checked,published:scenarios.filter(s => s.status === 'published').length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const unknown = process.argv.slice(2).filter(arg => !['--include-drafts','--run-python'].includes(arg));
  if (unknown.length) { console.error(`Unknown arguments: ${unknown.join(', ')}`); process.exitCode=1; }
  else {
    const result = await checkEngineering({includeDrafts:process.argv.includes('--include-drafts'),runPython:process.argv.includes('--run-python')});
    for (const error of result.errors) console.error(`FAIL engineering: ${error}`);
    for (const warning of result.warnings) console.log(`WARN engineering: ${warning}`);
    if (!result.errors.length) console.log(`PASS engineering: ${result.published} published scenarios; ${result.checked.length} packages checked`);
    process.exitCode = result.errors.length ? 1 : 0;
  }
}
