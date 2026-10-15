// Execute real browser entry modules with a captured React root. Pending
// manifests are substituted only in the generated audit bundle, never on disk.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { LIVE_PUZZLES } from '../../src/data/puzzles.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let invocation = 0;

export async function checkEntryModules(slugs, { pending = false } = {}) {
  const cacheDir = path.join(root, 'node_modules', '.cache', 'entry-module-audit', `${process.pid}-${invocation++}`);
  fs.mkdirSync(cacheDir, { recursive: true });
  const config = fs.readFileSync(path.join(root, '.env.production'), 'utf8');
  const mediaBaseUrl = config.match(/^VITE_MEDIA_BASE_URL\s*=\s*([^\r\n]+)/m)?.[1].trim().replace(/^['"]|['"]$/g, '') || '';
  await build({
    entryPoints: Object.fromEntries(slugs.map((slug) => [slug, path.join(root, slug, 'main.jsx')])),
    bundle: true, format: 'esm', splitting: true, platform: 'node', jsx: 'automatic',
    outdir: cacheDir, outExtension: { '.js': '.mjs' }, chunkNames: 'chunks/[name]-[hash]',
    external: ['react', 'react/jsx-runtime'], loader: { '.py': 'text', '.css': 'empty' },
    define: { 'import.meta.env': JSON.stringify({ VITE_MEDIA_BASE_URL: mediaBaseUrl }) },
    logLevel: 'silent',
    plugins: [{
      name: 'capture-entry-root',
      setup(builder) {
        builder.onResolve({ filter: /^react-dom\/client$/ }, () => ({ path: 'root', namespace: 'entry-audit' }));
        builder.onLoad({ filter: /.*/, namespace: 'entry-audit' }, () => ({
          contents: 'export function createRoot() { return { render(element) { globalThis.__entryModuleAudit.push(element); } }; }',
          loader: 'js',
        }));
        if (pending) builder.onLoad({ filter: /[\\/]src[\\/]data[\\/]narration[\\/].*\.json$/ }, (entry) => ({
          contents: JSON.stringify({
            schema_version: 1, status: 'pending',
            content_id: `puzzle:${path.basename(entry.path, '.json')}`, tracks: {},
          }),
          loader: 'json',
        }));
      },
    }],
  });
  const previous = new Map(['document', '__entryModuleAudit']
    .map((key) => [key, { own: Object.hasOwn(globalThis, key), value: globalThis[key] }]));
  globalThis.document = { getElementById: () => ({}) };
  const results = [];
  try {
    for (const slug of slugs) {
      globalThis.__entryModuleAudit = [];
      try {
        await import(pathToFileURL(path.join(cacheDir, `${slug}.mjs`)).href);
        const page = globalThis.__entryModuleAudit[0]?.props?.children;
        if (!page?.props?.puzzle || !page?.props?.content) throw new Error('The entry did not render a puzzle');
        results.push({ slug, status: 'rendered', preservedPlayer: Boolean(page.props.narrationPlayer?.Component) });
      } catch (error) {
        results.push({ slug, status: 'rejected', error: error.message });
      }
    }
  } finally {
    for (const [key, value] of previous) {
      if (value.own) globalThis[key] = value.value;
      else delete globalThis[key];
    }
  }
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args[0] !== '--output' || args.length !== 2)) throw new Error('Usage: node check_entry_modules.mjs [--output path]');
  const output = path.resolve(root, args[1] || 'build/entry-module-audit.json');
  const slugs = LIVE_PUZZLES.filter((puzzle) => fs.existsSync(path.join(root, 'src/data/narration', `${puzzle.slug}.json`)))
    .map((puzzle) => puzzle.slug);
  const current = await checkEntryModules(slugs);
  const pending = await checkEntryModules(slugs, { pending: true });
  const report = {
    generatedAt: new Date().toISOString(), current, pending,
    summary: {
      entries: slugs.length,
      currentRenderedWithPreservedPlayer: current.filter((entry) => entry.status === 'rendered' && entry.preservedPlayer).length,
      pendingRejected: pending.filter((entry) => entry.status === 'rejected').length,
      pendingRenderedWithoutPreservedPlayer: pending.filter((entry) => entry.status === 'rendered' && !entry.preservedPlayer).length,
    },
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.currentRenderedWithPreservedPlayer !== slugs.length || report.summary.pendingRejected !== slugs.length) process.exitCode = 1;
}
