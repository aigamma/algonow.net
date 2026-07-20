// Repo oracle: registry/entry lockstep, style bans, and gzip budgets.
// Exits non-zero on any FAIL; run after `npm run build` for the budget pass.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { PUZZLES } from '../src/data/puzzles.js';

let failures = 0;
const ok = (msg) => console.log(`PASS ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL ${msg}`);
};

const NARRATION_SECTIONS = new Set([
  'puzzle', 'origins', 'pair', 'picture', 'run', 'signals', 'tradeoffs', 'code',
]);

// 1. Lockstep: every registry entry has its five files.
for (const p of Object.values(PUZZLES)) {
  const files = [
    `${p.slug}/index.html`,
    `${p.slug}/main.jsx`,
    `src/content/${p.slug}.jsx`,
    `src/content/${p.slug}.narration.js`,
    `solutions/${p.slug.replace(/-/g, '_')}.py`,
  ];
  const missing = files.filter((f) => !existsSync(f));
  if (missing.length) fail(`${p.slug}: missing ${missing.join(', ')}`);
  else ok(`${p.slug}: all five unit files present`);

  const html = readFileSync(`${p.slug}/index.html`, 'utf8');
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if (!html.includes('<title>')) fail(`${p.slug}: entry html lacks <title>`);
  if (!desc) fail(`${p.slug}: entry html lacks meta description`);
  else if (desc[1].length > 200) fail(`${p.slug}: description over 200 chars`);

  const narrationSrc = readFileSync(`src/content/${p.slug}.narration.js`, 'utf8');
  const sections = [...narrationSrc.matchAll(/section:\s*'([a-z]+)'/g)].map((m) => m[1]);
  const unknown = sections.filter((s) => !NARRATION_SECTIONS.has(s));
  if (unknown.length) fail(`${p.slug}: unknown narration sections ${unknown.join(',')}`);
  if (sections.length < 6) fail(`${p.slug}: only ${sections.length} narration sections`);
}

// 2. Style bans: no em dashes, no banned word, across authored text surfaces.
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', '.netlify'].includes(name)) continue;
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(jsx?|mjs|py|md|html|css|toml)$/.test(name)) yield path;
  }
}
const EM_DASH = '—';
let emDashHits = [];
let banHits = [];
for (const file of walk('.')) {
  if (file === './scripts/check.mjs') continue; // the scanner's own escapes
  const text = readFileSync(file, 'utf8');
  if (file !== './docs/source-material.txt' && text.includes(EM_DASH)) emDashHits.push(file);
  if (/h[e]artbeat/i.test(text)) banHits.push(file);
}
if (emDashHits.length) fail(`em dash found in: ${emDashHits.join(', ')}`);
else ok('no em dashes in authored surfaces');
if (banHits.length) fail(`banned word found in: ${banHits.join(', ')}`);
else ok('banned-word scan clean');

// 3. Budgets (gzipped) against dist.
if (!existsSync('dist/assets')) {
  fail('dist/ missing: run `npm run build` before `npm run check`');
} else {
  const gz = (path) => gzipSync(readFileSync(path)).length;
  const assets = readdirSync('dist/assets');
  const budget = (label, actual, max) => {
    const kb = (actual / 1024).toFixed(1);
    if (actual > max) fail(`${label}: ${kb}KB gz exceeds ${(max / 1024).toFixed(0)}KB`);
    else ok(`${label}: ${kb}KB gz inside ${(max / 1024).toFixed(0)}KB`);
  };
  for (const a of assets) {
    const size = gz(`dist/assets/${a}`);
    if (a.startsWith('vendor-')) budget(`vendor ${a}`, size, 70 * 1024);
    else if (a.endsWith('.css')) budget(`css ${a}`, size, 14 * 1024);
    // The atlas page embeds the whole 2,000+ entry catalog; it is a single
    // data-heavy browse page (not on the PageSpeed-critical path the homepage
    // and puzzle pages share), so it carries its own budget.
    else if (a.startsWith('atlas-')) budget(`atlas chunk ${a}`, size, 60 * 1024);
    else if (a.endsWith('.js')) budget(`chunk ${a}`, size, 20 * 1024);
  }
  budget('html index.html', gz('dist/index.html'), 2 * 1024);
  for (const p of Object.values(PUZZLES)) {
    budget(`html ${p.slug}`, gz(`dist/${p.slug}/index.html`), 2 * 1024);
  }
  if (!existsSync('dist/sitemap.xml')) fail('dist/sitemap.xml missing');
  else {
    const sm = readFileSync('dist/sitemap.xml', 'utf8');
    const missing = Object.keys(PUZZLES).filter((path) => !sm.includes(`algonow.net${path}`));
    if (missing.length) fail(`sitemap missing: ${missing.join(', ')}`);
    else ok(`sitemap covers all ${Object.keys(PUZZLES).length + 1} pages`);
  }
}

// 4. The atlas: the site's build map. Schema per entry ({a, h|null, d, t}),
// global uniqueness on the normalized (algorithm, heuristic) pair across all
// family files, and every live puzzle present in the map.
const atlasDir = 'src/data/atlas';
if (existsSync(atlasDir)) {
  const norm = (s) =>
    String(s ?? '')
      .toLowerCase()
      .replace(/['’]s\b/g, '')
      .replace(/[^a-z0-9+*]+/g, ' ')
      .trim();
  const seen = new Map();
  let total = 0;
  const perFile = [];
  for (const file of readdirSync(atlasDir).filter((f) => f.endsWith('.json')).sort()) {
    let arr;
    try {
      arr = JSON.parse(readFileSync(`${atlasDir}/${file}`, 'utf8'));
    } catch (e) {
      fail(`atlas ${file}: invalid JSON (${e.message})`);
      continue;
    }
    if (!Array.isArray(arr)) {
      fail(`atlas ${file}: not an array`);
      continue;
    }
    arr.forEach((e, i) => {
      if (!e || typeof e.a !== 'string' || !e.a.trim()) return fail(`atlas ${file}[${i}]: bad a`);
      if (e.h !== null && (typeof e.h !== 'string' || !e.h.trim()))
        return fail(`atlas ${file}[${i}]: h must be a non-empty string or null`);
      if (typeof e.d !== 'string' || !e.d.trim()) return fail(`atlas ${file}[${i}]: bad d`);
      if (![1, 2, 3].includes(e.t)) return fail(`atlas ${file}[${i}]: t must be 1, 2, or 3`);
      const key = `${norm(e.a)}|${norm(e.h)}`;
      if (seen.has(key)) return fail(`atlas duplicate "${e.a}" × "${e.h ?? ''}" in ${file} and ${seen.get(key)}`);
      seen.set(key, file);
      total += 1;
      return undefined;
    });
    perFile.push(`${file.replace('.json', '')} ${arr.length}`);
  }
  ok(`atlas files: ${perFile.join(' · ')}`);
  for (const p of Object.values(PUZZLES)) {
    const key = `${norm(p.algorithm)}|${norm(p.heuristic)}`;
    if (!seen.has(key)) fail(`live pair missing from atlas: ${p.algorithm} × ${p.heuristic}`);
  }
  ok(`atlas total: ${total} unique entries (live pairs covered)`);

  // The homepage teaser reads a tiny committed summary (importing the full
  // atlas would bloat the homepage bundle past its budget). Keep it honest.
  const summaryPath = 'src/data/atlas-summary.json';
  if (existsSync(summaryPath)) {
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
    const familyCount = readdirSync(atlasDir).filter((f) => f.endsWith('.json')).length;
    if (summary.total !== total) {
      fail(`atlas-summary.json total ${summary.total} != actual ${total}; update it`);
    } else if (summary.families !== familyCount) {
      fail(`atlas-summary.json families ${summary.families} != actual ${familyCount}; update it`);
    } else {
      ok(`atlas-summary.json in sync (${total} / ${familyCount})`);
    }
  } else {
    fail(`${summaryPath} missing`);
  }
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASS');
process.exit(failures ? 1 : 0);
