// Credential-free mechanical audit of every registered puzzle. This does not
// establish the truth of lesson prose or independently prove model algorithms.
// Usage: node scripts/unit-tooling/audit_catalog.mjs --output build/audit/catalog.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LIVE_PUZZLES } from '../../src/data/puzzles.js';
import {
  assertPublicManifest, buildPlanForSlug, defaultReceiptPath,
  publicationIdentity, receiptObjectsForManifest,
} from '../narration/release-contract.mjs';
import { sha256, stableJson } from '../narration/puzzle-narration-pipeline.mjs';
import { checkSceneModel, sceneArgumentVariants } from './scene-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const options = { cycles: 20, seed: 20261015, output: 'build/catalog-audit.json' };
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const key = args[index];
  if (!['--cycles', '--seed', '--output'].includes(key) || !args[index + 1]) {
    throw new Error(`Unknown or incomplete argument: ${key}`);
  }
  options[key.slice(2)] = key === '--output' ? args[++index] : Number(args[++index]);
}
if (!Number.isSafeInteger(options.cycles) || options.cycles < 1) throw new Error('Invalid cycles');
if (!Number.isSafeInteger(options.seed)) throw new Error('Invalid seed');
const output = path.resolve(root, options.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
const cacheDir = path.join(root, 'node_modules', '.cache', 'catalog-audit');
fs.mkdirSync(cacheDir, { recursive: true });
const bundlePath = path.join(cacheDir, `catalog-${process.pid}.mjs`);

const metadata = LIVE_PUZZLES.map((puzzle) => {
  const contentPath = `src/content/${puzzle.slug}.jsx`;
  const source = fs.readFileSync(path.join(root, contentPath), 'utf8');
  const vizPaths = [...source.matchAll(/from\s+['"]\.\.\/viz\/([^'"]+)['"]/g)]
    .map((match) => `src/viz/${match[1]}`);
  return { puzzle, contentPath, vizPaths };
});
const vizPaths = [...new Set(metadata.flatMap((unit) => unit.vizPaths))];
const entry = [
  "export { default as PuzzlePage } from './src/components/PuzzlePage.jsx';",
  "export { default as PreservedPlayer } from './src/components/PreservedListenPlayer.jsx';",
  ...metadata.map((unit, index) => `import { content as content${index} } from './${unit.contentPath}';`),
  ...vizPaths.map((vizPath, index) => `import * as viz${index} from './${vizPath}';`),
  `export const contents = [${metadata.map((_, index) => `content${index}`).join(',')}];`,
  `export const visualizations = [${vizPaths.map((_, index) => `viz${index}`).join(',')}];`,
].join('\n');
await build({
  stdin: { contents: entry, resolveDir: root, loader: 'jsx' },
  bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', outfile: bundlePath,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  loader: { '.py': 'text', '.css': 'empty' }, logLevel: 'silent',
});
const bundled = await import(pathToFileURL(bundlePath).href);
const report = {
  generatedAt: new Date().toISOString(),
  gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  scope: 'Registered live puzzles only; no network requests or paid narration calls',
  cyclesPerExportedModel: options.cycles,
  firstSeed: options.seed,
  seedStride: 7919,
  units: [], visualizations: [], summary: {},
};
const mediaConfig = fs.readFileSync(path.join(root, '.env.production'), 'utf8');
const mediaBaseUrl = mediaConfig.match(/^VITE_MEDIA_BASE_URL\s*=\s*([^\r\n]+)/m)?.[1].trim().replace(/^['"]|['"]$/g, '') || '';
const json = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

for (const [index, { puzzle, vizPaths: unitVizes }] of metadata.entries()) {
  const row = { number: puzzle.number, slug: puzzle.slug, vizPaths: unitVizes, errors: [] };
  const manifestPath = `src/data/narration/${puzzle.slug}.json`;
  const main = fs.readFileSync(path.join(root, puzzle.slug, 'main.jsx'), 'utf8');
  const preservedWired = main.includes(`narration/${puzzle.slug}.json`);
  let manifest = null;
  if (fs.existsSync(path.join(root, manifestPath))) {
    try {
      manifest = json(manifestPath);
      const plan = await buildPlanForSlug(puzzle.slug);
      row.narration = {
        status: 'checked', sourceHash: plan.sourceHash,
        manifestSourceHash: manifest.source_sha256,
        recipeHash: plan.recipeHash, manifestRecipeHash: manifest.recipe_sha256,
        releaseHash: plan.releaseHash, manifestReleaseHash: manifest.release_sha256,
        tracks: Object.keys(manifest.tracks || {}),
      };
      assertPublicManifest(manifest, plan, `${puzzle.slug} manifest`);
      const receipt = json(defaultReceiptPath(puzzle.slug));
      const expected = receiptObjectsForManifest(manifest,
        Object.fromEntries(receipt.objects.map((object) => [object.track_id, object.result])));
      if (stableJson(receipt.objects) !== stableJson(expected)) throw new Error('Receipt objects differ from manifest');
      if (receipt.publication_sha256 !== sha256(stableJson(publicationIdentity(receipt.objects)))) {
        throw new Error('Receipt publication hash does not match its inventory');
      }
      if (!preservedWired) throw new Error('Installed manifest is not wired into the page entry');
    } catch (error) {
      row.errors.push(`narration: ${error.message}`);
      row.narration = { ...row.narration, status: 'failed' };
    }
  } else {
    row.narration = { status: 'legacy-no-preserved-manifest' };
    if (puzzle.number >= 115 || preservedWired) row.errors.push('Missing required preserved narration manifest');
  }
  try {
    const html = renderToStaticMarkup(React.createElement(bundled.PuzzlePage, {
      puzzle, content: bundled.contents[index],
      narrationPlayer: preservedWired ? { Component: bundled.PreservedPlayer, manifest, mediaBaseUrl } : null,
    }));
    row.ssr = { status: 'passed', characters: html.length };
    if (html.length < 5000) throw new Error(`Unexpectedly short page: ${html.length} characters`);
    for (const section of ['puzzle', 'origins', 'pair', 'picture', 'run', 'signals', 'tradeoffs', 'code']) {
      if (!html.includes(`id="sec-${section}"`)) throw new Error(`Missing section ${section}`);
    }
    if (!html.includes('<canvas')) throw new Error('Visualization canvas did not render');
    if (preservedWired && !html.includes('narration-disclosure')) throw new Error('Preserved player did not render');
  } catch (error) {
    row.errors.push(`SSR: ${error.message}`);
    row.ssr = { ...row.ssr, status: 'failed' };
  }
  report.units.push(row);
  if (row.errors.length) console.log(`${puzzle.number} ${puzzle.slug}: ${row.errors.join(' | ')}`);
}

for (const [index, vizPath] of vizPaths.entries()) {
  const model = bundled.visualizations[index];
  const row = { path: vizPath, exports: Object.keys(model), runs: [], errors: [] };
  if (typeof model.makeScene !== 'function' || typeof model.sceneTick !== 'function') {
    row.status = 'no-standard-model-exports';
  } else {
    row.status = 'passed';
    row.argumentVariants = sceneArgumentVariants(vizPath);
    for (let cycle = 0; cycle < options.cycles; cycle += 1) {
      const seed = options.seed + cycle * 7919;
      for (const sceneArgs of row.argumentVariants) {
        try {
          const result = checkSceneModel(model, { seed, sceneArgs });
          row.runs.push(result);
          if (result.invariantBreaks) row.errors.push(`Seed ${seed}, args ${JSON.stringify(sceneArgs)}: ${result.invariantBreaks} invariant failures, first at tick ${result.firstBrokenTick}`);
        } catch (error) {
          row.errors.push(`Seed ${seed}, args ${JSON.stringify(sceneArgs)}: ${error.message}`);
        }
      }
    }
    if (row.errors.length) row.status = 'failed';
  }
  report.visualizations.push(row);
  if (row.errors.length) console.log(`${vizPath}: ${row.errors.join(' | ')}`);
}
report.summary = {
  registeredPuzzles: report.units.length,
  pagesRendered: report.units.filter((unit) => unit.ssr.status === 'passed').length,
  installedManifests: report.units.filter((unit) => unit.narration.status !== 'legacy-no-preserved-manifest').length,
  currentManifests: report.units.filter((unit) => unit.narration.status === 'checked').length,
  legacyPagesWithoutPreservedManifests: report.units.filter((unit) => unit.narration.status === 'legacy-no-preserved-manifest').length,
  uniqueVisualizations: report.visualizations.length,
  standardModels: report.visualizations.filter((viz) => viz.status !== 'no-standard-model-exports').length,
  modelsWithoutStandardExports: report.visualizations.filter((viz) => viz.status === 'no-standard-model-exports').length,
  completedModelRuns: report.visualizations.reduce((sum, viz) => sum + viz.runs.length, 0),
  completedRunsWithInvariant: report.visualizations.reduce((sum, viz) => sum + viz.runs.filter((run) => run.invariantObserved).length, 0),
  completedRunsWithTerminalCheck: report.visualizations.reduce((sum, viz) => sum + viz.runs.filter((run) => run.terminalCheck !== null).length, 0),
  modelTicks: report.visualizations.reduce((sum, viz) => sum + viz.runs.reduce((count, run) => count + run.ticks, 0), 0),
  failedUnits: report.units.filter((unit) => unit.errors.length).length,
  failedModels: report.visualizations.filter((viz) => viz.errors.length).length,
};
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Evidence: ${path.relative(root, output).replaceAll('\\', '/')}`);
if (report.summary.failedUnits || report.summary.failedModels) process.exitCode = 1;
