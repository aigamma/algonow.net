// Estimate a scenario page chunk (gzipped) before its narration manifest exists:
// bundle scenarios/<slug>/main.jsx with esbuild, honoring ?raw imports, treating
// the manifest (its own chunk in the real build) and modules shared with other
// pages (src/components, src/lib, src/viz, the registries, the theme) as
// external. Also report each ?raw file's standalone gz size. Estimates have run
// about 1 to 3 KB above the real build; measure_chunk_for.py gives the real size.
// Usage: node scripts/unit-tooling/estimate_scenario_chunk.mjs <slug>
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const slug = process.argv[2];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const esbuild = await import(pathToFileURL(path.join(root, 'node_modules/esbuild/lib/main.js')).href);
const shared = /src[\\/](components[\\/](?!ScenarioPage)|lib|config|viz|data[\\/]puzzles|data[\\/]engineering|theme)/;
const gzKB = (buf) => +(zlib.gzipSync(buf, { level: 9 }).length / 1024).toFixed(2);
const parts = [];

async function bundle({ withNarration = true, withFiles = true } = {}) {
  const result = await esbuild.build({
    entryPoints: [path.join(root, `scenarios/${slug}/main.jsx`)],
    bundle: true, minify: true, format: 'esm', write: false, jsx: 'automatic', logLevel: 'silent',
    loader: { '.css': 'empty' },
    plugins: [{
      name: 'raw-and-stubs',
      setup(b) {
        b.onResolve({ filter: /\?raw$/ }, (args) => ({ path: path.resolve(path.dirname(args.importer), args.path.slice(0, -4)), namespace: 'raw' }));
        b.onLoad({ filter: /.*/, namespace: 'raw' }, (args) => {
          const text = fs.readFileSync(args.path, 'utf8');
          if (withFiles && !parts.some((p) => p.file === path.relative(root, args.path))) parts.push({ file: path.relative(root, args.path), rawKB: +(text.length / 1024).toFixed(1), gzKB: gzKB(text) });
          return { contents: withFiles ? text : '', loader: 'text' };
        });
        b.onResolve({ filter: /.*/ }, (args) => {
          if (args.kind === 'entry-point' || args.namespace === 'raw') return null;
          if (/^react/.test(args.path)) return { path: args.path, external: true };
          const abs = path.resolve(path.dirname(args.importer), args.path);
          if (args.path.endsWith(`src/data/narration/${slug}.json`)) return { path: args.path, external: true };
          if (!withNarration && args.path.endsWith(`${slug}.narration.js`)) return { path: args.path, external: true };
          if (shared.test(abs) && !/narration/.test(abs)) return { path: args.path, external: true };
          return null;
        });
      },
    }],
  });
  const code = result.outputFiles[0].contents;
  return { rawKB: +(code.length / 1024).toFixed(1), gzKB: gzKB(code) };
}

const full = await bundle();
const noNarration = await bundle({ withNarration: false });
const noFiles = await bundle({ withFiles: false });
console.log(JSON.stringify({ slug, full, withoutNarration: noNarration, withoutRawFiles: noFiles, budgetKB: 20 }, null, 1));
console.table(parts.sort((a, b) => b.gzKB - a.gzKB));
