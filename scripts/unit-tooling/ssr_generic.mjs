// Server-render the real ScenarioPage with a lesson's real content and assert
// the lesson-agnostic worked-lesson contract. Writes build/ssr-<slug>.html.
// Usage: node scripts/unit-tooling/ssr_generic.mjs <slug>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const slug = process.argv[2];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const esbuild = await import(pathToFileURL(path.join(root, 'node_modules/esbuild/lib/main.js')).href);
const out = path.join(root, 'node_modules', '.cache', `ssr-generic-${slug}-${process.pid}.mjs`);
const posix = (p) => p.replace(/\\/g, '/');
const shim = `
import ScenarioPage from '${posix(path.join(root, 'src/components/ScenarioPage.jsx'))}';
import { content } from '${posix(path.join(root, `scenarios/${slug}/content.jsx`))}';
import { SCENARIOS, scenarioPaths } from '${posix(path.join(root, 'src/data/engineering.js'))}';
export { ScenarioPage, content, SCENARIOS, scenarioPaths };
`;
await esbuild.build({
  stdin: { contents: shim, resolveDir: root, loader: 'jsx' },
  bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', outfile: out, logLevel: 'silent',
  loader: { '.css': 'empty' }, external: ['react', 'react-dom', 'react/jsx-runtime'],
  plugins: [{ name: 'raw', setup(b) {
    b.onResolve({ filter: /\?raw$/ }, (args) => ({ path: path.resolve(path.dirname(args.importer), args.path.slice(0, -4)), namespace: 'raw' }));
    b.onLoad({ filter: /.*/, namespace: 'raw' }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8'), loader: 'text' }));
  } }],
});
const React = (await import(pathToFileURL(path.join(root, 'node_modules/react/index.js')).href)).default;
const { renderToStaticMarkup } = await import(pathToFileURL(path.join(root, 'node_modules/react-dom/server.node.js')).href);
const mod = await import(pathToFileURL(out).href);
const entry = mod.SCENARIOS.find((s) => s.slug === slug);
if (!entry) throw new Error(`no registry entry for ${slug}`);
const scenario = { ...entry, ...mod.scenarioPaths(slug) };
const html = renderToStaticMarkup(React.createElement(mod.ScenarioPage, { scenario, content: mod.content }));
fs.rmSync(out, { force: true });
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build', `ssr-${slug}.html`), html);
const order = [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
const section = (id) => { const i = html.indexOf(`<section id="${id}"`); const j = html.indexOf('<section id=', i + 1); return html.slice(i, j === -1 ? undefined : j); };
const primaryReference = mod.content.files.find((f) => f.primary && f.role === 'reference');
const primaryStarter = mod.content.files.find((f) => f.primary && f.role === 'starter');
const refName = primaryReference?.path.split('/').pop();
const starterName = primaryStarter?.path.split('/').pop();
const checks = {
  order: order.join(',') === 'brief,visual,solution,evidence,tradeoffs,starter,files',
  solutionOpen: /<section id="solution"[^>]*>[\s\S]*?<details open=""/.test(section('solution')),
  solutionHasDownload: Boolean(refName) && section('solution').includes(`download="${refName}"`) && section('solution').includes(`>${refName}<`),
  practiceClosed: /<details><summary>Open optional practice<\/summary>/.test(section('starter')) && Boolean(starterName) && section('starter').includes(`download="${starterName}"`),
  answerRevealable: section('starter').includes('<summary>Show the answer</summary>'),
  answerMarkersHidden: !html.includes('answer begins') && !html.includes('answer ends'),
  expectedOutputInBrief: section('brief').includes('class="expected-output"') && /\bOK\b/.test(section('brief')),
  vizInVisual: section('visual').includes('class="viz-frame"') && section('visual').includes('<canvas') && section('visual').includes('Previous step') && section('visual').includes('class="viz-caption"'),
  tradeoffsCount: (section('tradeoffs').match(/<li>/g) || []).length >= 2 && (section('tradeoffs').match(/<li>/g) || []).length <= 3,
  noInventory: !html.includes('python/src/') && !html.includes('python/tests/') && !html.includes('python/fixtures/') && !html.includes('Working files'),
  twoCodeBlocks: (html.match(/class="code-block"/g) || []).length === 2,
  downloadLink: html.includes(`/downloads/${slug}-project.zip`),
  noObjectObject: !html.includes('[object Object]'),
  noEmDash: !html.includes(String.fromCharCode(8212)),
  noForbiddenWord: !new RegExp('heart' + 'beat', 'i').test(html),   // the word itself may not appear in any file
  title: html.includes(entry.title.replace(/'/g, '&#x27;')),
};
console.log(JSON.stringify({ slug, htmlKB: +(html.length / 1024).toFixed(1), order, checks }, null, 1));
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
