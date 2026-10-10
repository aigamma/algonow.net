// Estimate a unit's per-page chunk (gzipped) before it can be built for real:
// bundle <slug>/main.jsx with esbuild, stubbing the not-yet-installed
// narration manifest with an installed one of typical size and marking every
// shared module external (those live in the vendor chunk). Calibrate against
// the real sizes in a check log. Usage: node estimate_chunk.mjs <checklog> <slug>...
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const [checkLog, ...slugs] = process.argv.slice(2);
const esbuild = await import(pathToFileURL(path.resolve('node_modules/esbuild/lib/main.js')).href);
const real = {};
if (checkLog && fs.existsSync(checkLog)) {
  for (const m of fs.readFileSync(checkLog, 'utf8').matchAll(/PASS chunk ([a-z0-9-]+)-[A-Za-z0-9_-]+\.js: ([0-9.]+)KB gz/g)) real[m[1]] = Number(m[2]);
}
const stubManifest = path.resolve('src/data/narration/gray-code-generation-reflected-binary.json');
const shared = /src[\\/](components|lib|config|data[\\/]puzzles|theme)/;
async function estimate(slug) {
  const r = await esbuild.build({
    entryPoints: [`${slug}/main.jsx`],
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    jsx: 'automatic',
    logLevel: 'silent',
    loader: { '.py': 'text', '.css': 'empty' },
    plugins: [{
      name: 'stub',
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) => {
          if (args.kind === 'entry-point') return null;
          if (/^react/.test(args.path)) return { path: args.path, external: true };
          const abs = path.resolve(path.dirname(args.importer), args.path);
          if (args.path.endsWith(`src/data/narration/${slug}.json`) && !fs.existsSync(abs)) return { path: stubManifest };
          if (shared.test(abs) && !/narration/.test(abs)) return { path: args.path, external: true };
          return null;
        });
      },
    }],
  });
  const code = r.outputFiles[0].contents;
  return zlib.gzipSync(code, { level: 9 }).length / 1024;
}
const rows = [];
for (const slug of slugs) {
  const est = await estimate(slug);
  rows.push({ slug, estKB: Math.round(est * 10) / 10, realKB: real[slug] ?? null, ratio: real[slug] ? Math.round((real[slug] / est) * 1000) / 1000 : null });
}
console.log(JSON.stringify(rows, null, 1));
