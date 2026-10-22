// The release gate over a built dist: `npm run qa`.
//
//   node scripts/qa/run.mjs [--quick] [--base <url>] [stage ...]
//
// Stages, in order (the default set is links, prose, sweep, phone):
//   links  crawl-dist.py: every href, src, and modulepreload in every built
//          page resolves to a file in dist (a page's base href honoured).
//   prose  scan-prose.py: em and en dashes, the forbidden word, doubled words,
//          a/an slips, double spaces in narration, dead lesson links, and
//          registry listen minutes against the Aoede track length.
//   sweep  cdp-shot.mjs at 1200 px over the page list: the app mounted (an
//          h1, a non-empty root), the preserved player rendered on every
//          content page, no browser-speech button anywhere, no console error
//          or uncaught exception, every in-page anchor resolves.
//   phone  the same sweep at 390 px, plus: no horizontal page overflow.
//   clip   cdp-shot.mjs canvas text audit over every lesson figure (text past
//          a canvas edge, texts drawn over each other). Slow, opt in.
//
// --quick limits sweep and phone to the home, the indexes, the 404 page,
// every lesson, five legacy pages, and one page of each atlas kind. --base
// uses a server that is already running (vite preview, or the live site)
// instead of starting vite preview on port 4199. Outputs land in build/qa/.
// Exit code 1 when any stage fails, 2 when dist is missing or an argument is
// unknown.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { ROOT } from './cdp.mjs';
import { LIVE_PUZZLES } from '../../src/data/puzzles.js';
import { LIVE_SCENARIOS } from '../../src/data/engineering.js';

const STAGES = ['links', 'prose', 'sweep', 'phone', 'clip'];
const DEFAULT_STAGES = ['links', 'prose', 'sweep', 'phone'];
const PREVIEW_PORT = 4199;
const OUT = path.join(ROOT, 'build', 'qa');
const DIST = path.join(ROOT, 'dist');

function parseArgs(argv) {
  const options = { quick: false, base: null, stages: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--quick') options.quick = true;
    else if (arg === '--base') options.base = argv[++i];
    else if (STAGES.includes(arg)) options.stages.push(arg);
    else { console.error(`unknown argument: ${arg}`); process.exit(2); }
  }
  if (!options.stages.length) options.stages = DEFAULT_STAGES;
  return options;
}

// Every page the sweeps load. The atlas is thousands of static pages that
// share one template, so a sample stands for it; the link crawl covers all.
function pageList(quick) {
  const legacy = LIVE_PUZZLES.map((p) => p.slug).sort();
  const lessons = LIVE_SCENARIOS.map((s) => s.slug).sort();
  const atlasKinds = ['algo', 'problem', 'category', 'topic'];
  const perKind = quick ? 1 : 3;
  const atlas = atlasKinds.flatMap((kind) => {
    const dir = path.join(DIST, kind);
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((name) => existsSync(path.join(dir, name, 'index.html'))).sort().slice(0, perKind).map((name) => `/${kind}/${name}/`);
  });
  const fixed = ['/', '/legacy/', '/atlas/', '/404.html'];
  const content = [...(quick ? legacy.slice(0, 5) : legacy).map((s) => `/${s}/`), ...lessons.map((s) => `/scenarios/${s}/`)];
  return { paths: [...fixed, ...content, ...atlas], content: new Set(content) };
}

function run(command, args, { env = {}, capture = true } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...env }, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; if (!capture) process.stdout.write(chunk); });
    child.stderr.on('data', (chunk) => { stderr += chunk; if (!capture) process.stderr.write(chunk); });
    child.on('error', (error) => resolve({ status: null, stdout, stderr: `${stderr}${error.message}` }));
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

async function startPreview() {
  const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [vite, 'preview', '--port', String(PREVIEW_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const base = `http://127.0.0.1:${PREVIEW_PORT}`;
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`${base}/`);
      if (response.ok) return { base, stop: () => child.kill() };
    } catch {}
    await sleep(250);
  }
  child.kill();
  throw new Error(`vite preview on port ${PREVIEW_PORT} never answered (is the port taken?)`);
}

const python = process.env.PYTHON || 'python';
const tail = (text, lines = 12) => text.trim().split('\n').slice(-lines).join('\n');

async function stageLinks() {
  const result = await run(python, ['-I', path.join(ROOT, 'scripts', 'qa', 'crawl-dist.py'), ROOT, OUT]);
  const summary = tail(result.stdout + result.stderr, 20);
  return { ok: result.status === 0, summary };
}

async function stageProse() {
  const result = await run(python, ['-I', path.join(ROOT, 'scripts', 'qa', 'scan-prose.py'), ROOT]);
  return { ok: result.status === 0, summary: tail(result.stdout + result.stderr, 40) };
}

function judgeSweep(records, content, { phone }) {
  const failures = [];
  for (const record of records) {
    const reasons = [];
    if (record.failed) reasons.push(`load failed: ${record.failed}`);
    else {
      if (!record.h1) reasons.push('no h1 (the app did not mount)');
      if (record.rootEmpty === true) reasons.push('empty #root');
      if (record.browser) reasons.push('browser-speech listen button present');
      if (content.has(record.path) && !record.voices) reasons.push('preserved player (voices disclosure) missing');
      if (record.frag.length) reasons.push(`unresolved in-page anchors: ${record.frag.join(', ')}`);
      if (phone && record.overflow > 0) reasons.push(`horizontal overflow ${record.overflow}px${record.wide.length ? ` (${record.wide.join(', ')})` : ''}`);
      if (record.errors.length) reasons.push(`${record.errors.length} console/runtime error(s): ${record.errors[0]}`);
    }
    if (reasons.length) failures.push(`${record.path}: ${reasons.join('; ')}`);
  }
  return failures;
}

async function stageSweep(base, pages, { phone }) {
  const width = phone ? 390 : 1200;
  const listFile = path.join(OUT, `pages-${width}.txt`);
  const outFile = path.join(OUT, `sweep-${width}.jsonl`);
  writeFileSync(listFile, pages.paths.join('\n') + '\n');
  const result = await run(process.execPath, [path.join(ROOT, 'scripts', 'qa', 'cdp-shot.mjs'), 'sweep', base, outFile, `@${listFile}`], { env: { SWEEP_WIDTH: String(width) } });
  if (result.status !== 0) return { ok: false, summary: `sweep process exited ${result.status}\n${tail(result.stderr)}` };
  const records = readFileSync(outFile, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const failures = judgeSweep(records, pages.content, { phone });
  const counts = `${records.length} pages at ${width}px: ${records.filter((r) => r.h1).length} mounted, ${records.filter((r) => r.voices).length} with the preserved player, ${records.filter((r) => r.errors?.length).length} with errors, ${records.filter((r) => r.overflow > 0).length} with overflow`;
  return { ok: failures.length === 0 && records.length === pages.paths.length, summary: [counts, ...failures.slice(0, 40)].join('\n') };
}

async function stageClip(base) {
  const outFile = path.join(OUT, 'clip-lessons.txt');
  const slugs = LIVE_SCENARIOS.map((s) => s.slug).sort();
  const result = await run(process.execPath, [path.join(ROOT, 'scripts', 'qa', 'cdp-shot.mjs'), 'clip', base, outFile, ...slugs]);
  const flagged = readFileSync(outFile, 'utf8').split('\n').filter((line) => /^\s+(CLIPPED|OVERLAP)|FAILED/.test(line));
  return { ok: result.status === 0, summary: [`${slugs.length} figures, ${flagged.length} flagged line(s) -> ${outFile}`, ...flagged.slice(0, 30)].join('\n') };
}

const options = parseArgs(process.argv.slice(2));
if (!existsSync(path.join(DIST, 'index.html'))) { console.error('dist/index.html is missing: run `npm run build` first'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

let preview = null;
const needsServer = options.stages.some((stage) => ['sweep', 'phone', 'clip'].includes(stage));
let base = options.base;
if (needsServer && !base) { preview = await startPreview(); base = preview.base; }

const pages = pageList(options.quick);
const results = [];
const started = Date.now();
try {
  for (const stage of options.stages) {
    const t0 = Date.now();
    console.log(`\n== qa ${stage}${options.quick ? ' (quick)' : ''}${base && stage !== 'links' && stage !== 'prose' ? ` against ${base}` : ''}`);
    let result;
    if (stage === 'links') result = await stageLinks();
    else if (stage === 'prose') result = await stageProse();
    else if (stage === 'sweep') result = await stageSweep(base, pages, { phone: false });
    else if (stage === 'phone') result = await stageSweep(base, pages, { phone: true });
    else result = await stageClip(base);
    result.stage = stage;
    result.seconds = Math.round((Date.now() - t0) / 1000);
    results.push(result);
    console.log(result.summary);
    console.log(`${result.ok ? 'PASS' : 'FAIL'} qa ${stage} (${result.seconds}s)`);
  }
} finally {
  if (preview) preview.stop();
}

const failed = results.filter((r) => !r.ok);
const summary = [`qa: ${results.length} stage(s) in ${Math.round((Date.now() - started) / 1000)}s`, ...results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.stage} (${r.seconds}s)`)].join('\n');
writeFileSync(path.join(OUT, 'summary.txt'), summary + '\n' + results.map((r) => `\n== ${r.stage}\n${r.summary}`).join('\n') + '\n');
console.log(`\n${summary}`);
console.log(failed.length ? `QA FAILED: ${failed.map((r) => r.stage).join(', ')}` : 'QA PASS');
process.exitCode = failed.length ? 1 : 0;
