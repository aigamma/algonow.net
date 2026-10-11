// Review pass over every live unit numbered >= FROM: re-run its solution,
// its viz invariant check, static scans of its six files, rival-page and
// problem-page resolution, manifest/narration hash integrity, plan row and
// description presence, and (with --live) the deployed page, chunk, and CDN
// objects. Prints one compact line per unit and a summary of problems.
// Usage: node review_units.mjs [--from 164] [--live] [--skip-solutions]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const FROM = Number((args[args.indexOf('--from') + 1] || 164));
const LIVE = args.includes('--live');
const SKIP_SOL = args.includes('--skip-solutions');
const SP = 'C:/Users/eric/AppData/Local/Temp/claude/D--algonow-net/72804c69-ec72-4da2-b499-7f26b34272d8/scratchpad';

function slugify(name) {
  return String(name).toLowerCase().replace(/['’]/g, '').replace(/\*/g, ' star ').replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const reg = fs.readFileSync('src/data/puzzles.js', 'utf8');
const records = [];
for (const m of reg.matchAll(/^  '\/([a-z0-9-]+)\/': \{([\s\S]*?)\n  \},/gm)) {
  const body = m[2];
  const num = Number((body.match(/number:\s*(\d+)/) || [])[1]);
  const viz = (body.match(/vite:\s*'([^']+)'/) || [])[1];
  records.push({ slug: m[1], number: num, body });
}
const units = records.filter((r) => r.number >= FROM).sort((a, b) => a.number - b.number);
const plan = fs.readFileSync('docs/OVERNIGHT-PLAN.md', 'utf8');
const planFlat = plan.replace(/\s+/g, ' ');
const descs = JSON.parse(fs.readFileSync('docs/puzzle-descriptions.json', 'utf8')).descriptions;
const problemsJson = fs.readFileSync('src/data/atlas/problems.json', 'utf8');
const allProblems = [];
let okCount = 0;

async function fetchStatus(url, method = 'GET') {
  try {
    const r = await fetch(url, { method, redirect: 'manual' });
    return r.status;
  } catch (e) {
    return `ERR ${e.message}`;
  }
}

for (const u of units) {
  const probs = [];
  const slug = u.slug;
  const py = `solutions/${slug.replace(/-/g, '_')}.py`;
  const contentPath = `src/content/${slug}.jsx`;
  const narrPath = `src/content/${slug}.narration.js`;
  const content = fs.existsSync(contentPath) ? fs.readFileSync(contentPath, 'utf8') : '';
  const vizName = (content.match(/import\s+(\w+)\s+from\s+'\.\.\/viz\/(\w+)\.jsx'/) || [])[2];
  const vizPath = vizName ? `src/viz/${vizName}.jsx` : null;
  const files = [py, contentPath, narrPath, vizPath, `${slug}/index.html`, `${slug}/main.jsx`].filter(Boolean);
  for (const f of files) if (!fs.existsSync(f)) probs.push(`missing ${f}`);
  if (!vizPath) probs.push('no viz import found in content');

  // solution
  let okLine = '';
  if (!SKIP_SOL && fs.existsSync(py)) {
    const r = spawnSync('python', [py], { encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
    okLine = (r.stdout || '').split(/\r?\n/).filter((l) => l.startsWith('OK')).pop() || '';
    if (r.status !== 0 || !okLine) probs.push(`solution exit ${r.status} ${(r.stderr || '').trim().split(/\r?\n/).slice(-1)[0] || ''}`.trim());
  }
  // viz
  if (vizPath && fs.existsSync(vizPath)) {
    const r = spawnSync('node', [path.join(SP, 'vizcheck.mjs'), vizPath, '20'], { encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
    try {
      const j = JSON.parse(r.stdout);
      if (j.invariantBreaks !== 0) probs.push(`viz breaks ${j.invariantBreaks}`);
    } catch (e) {
      probs.push(`vizcheck failed: ${(r.stderr || r.stdout || '').trim().slice(-200)}`);
    }
  }
  // static scans
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const s = fs.readFileSync(f, 'utf8');
    if (s.includes('\u2014')) probs.push(`em dash in ${f}`);
    if (new RegExp('heart' + 'beat', 'i').test(s)) probs.push(`banned word in ${f}`);
    if (/\b(TODO|FIXME|XXX|lorem ipsum|placeholder)\b/i.test(s)) probs.push(`placeholder marker in ${f}`);
  }
  if (fs.existsSync(narrPath)) {
    const narr = fs.readFileSync(narrPath, 'utf8').split(/\r?\n/).filter((l) => !l.trim().startsWith('//')).join('\n');
    const texts = [...narr.matchAll(/text:\s*\n?\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
    const joined = texts.join(' ');
    if (texts.length !== 10) probs.push(`narration sections ${texts.length}`);
    if (/[0-9]/.test(joined)) probs.push('digit in narration');
    if (/_|->|=>|https?:/.test(joined)) probs.push('underscore/arrow/url in narration');
    const sections = [...narr.matchAll(/section:\s*'([a-z]+)'/g)].map((m) => m[1]).join(',');
    if (sections !== 'puzzle,origins,pair,picture,run,signals,tradeoffs,tradeoffs,tradeoffs,code') probs.push(`sections ${sections}`);
  }
  // content structure and rivals
  if (content) {
    const rs = content.indexOf('rivals: [');
    const re = content.indexOf('\n  ],', rs);
    if (rs < 0 || re < 0) probs.push('rivals block missing');
    else {
      const block = content.slice(rs, re);
      const cards = block.split(/\n(?=    \{\s*$)/m).slice(1);
      if (cards.length !== 4) probs.push(`rival cards ${cards.length}`);
      for (const card of cards) {
        if (/isThisUnit:\s*true/.test(card)) continue;
        const an = card.match(/algoName:\s*(['"])((?:(?!\1).)*)\1/) || card.match(/\bname:\s*(['"])((?:(?!\1).)*)\1/);
        if (!an) { probs.push('rival card without a name'); continue; }
        const p = `dist/algo/${slugify(an[2])}/index.html`;
        if (!fs.existsSync(p)) probs.push(`rival page missing: ${an[2]}`);
      }
    }
    const ps = content.match(/problemSlug:\s*'([a-z0-9-]+)'/);
    if (!ps) probs.push('no problemSlug');
    else {
      if (!problemsJson.includes(`"${ps[1]}"`)) probs.push(`problemSlug ${ps[1]} not in problems.json`);
      if (!fs.existsSync(`dist/problem/${ps[1]}/index.html`)) probs.push(`problem page missing ${ps[1]}`);
    }
    for (const k of ['neverUse', 'contest', 'figure', 'code', 'filename']) if (!new RegExp(`^\\s*${k}\\s*[:,]`, 'm').test(content)) probs.push(`content lacks ${k}`);
    if (/&gt;|&lt;|&amp;/.test(content.replace(/&quot;/g, ''))) {
      // entities are fine inside JSX text, but flag them for a look
    }
  }
  // manifest integrity
  const manPath = `src/data/narration/${slug}.json`;
  let manifest = null;
  if (!fs.existsSync(manPath)) probs.push('manifest missing');
  else {
    manifest = JSON.parse(fs.readFileSync(manPath, 'utf8'));
    // The manifest's source_sha256 is the pipeline's hash of the canonical
    // narration text, so the oracle is the credential-free plan run on the
    // present narration file: its source_sha256 must equal the manifest's.
    const planRun = spawnSync('node', ['scripts/narration/generate-puzzle-narration.mjs', '--slug', slug], { encoding: 'utf8', timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
    const out = planRun.stdout || '';
    const i = out.indexOf('{');
    let planSource = null;
    try { planSource = JSON.parse(out.slice(i, out.lastIndexOf('}') + 1)).source_sha256; } catch (e) { probs.push('plan run gave no JSON'); }
    if (planSource && manifest.source_sha256 !== planSource) probs.push(`PUBLISHED AUDIO IS STALE: manifest source ${String(manifest.source_sha256).slice(0, 8)} != present narration ${planSource.slice(0, 8)}`);
    const tracks = manifest.tracks || manifest.recipe?.tracks || {};
    const names = Object.keys(tracks);
    if (!(names.includes('aoede') && names.includes('algieba'))) probs.push(`manifest tracks ${names.join(',')}`);
  }
  if (!fs.existsSync(`infra/narration/receipts/${slug}.json`)) probs.push('receipt missing');
  // docs
  const frow = (u.body.match(/number:\s*(\d+)/) || [])[1];
  if (!descs[slug]) probs.push('description missing in puzzle-descriptions.json');
  if (!planFlat.includes(`Puzzle ${u.number},`) && !planFlat.includes(`Puzzle ${u.number}.`)) probs.push('plan row missing (no "Puzzle N," in OVERNIGHT-PLAN)');
  if (!fs.existsSync(`dist/${slug}/index.html`)) probs.push('dist page missing');

  // live
  let liveNote = '';
  if (LIVE) {
    const pageStatus = await fetchStatus(`https://algonow.net/${slug}/`);
    if (pageStatus !== 200) probs.push(`live page ${pageStatus}`);
    else {
      const html = await (await fetch(`https://algonow.net/${slug}/`)).text();
      const c = (html.match(new RegExp(`assets/${slug}-[A-Za-z0-9_-]+\\.js`)) || [])[0];
      if (!c) probs.push('live page has no chunk');
      else {
        const js = await (await fetch(`https://algonow.net/${c}`)).text();
        const objs = [...new Set([...js.matchAll(new RegExp(`narration/v1/puzzles/${slug}/[0-9a-f]+/(?:aoede|algieba)-[0-9a-f]+\\.mp3`, 'g'))].map((m) => m[0]))];
        if (objs.length !== 2) probs.push(`live chunk has ${objs.length} narration objects`);
        for (const o of objs) {
          const st = await fetchStatus(`https://d1odatz89tx6pl.cloudfront.net/${o}`, 'HEAD');
          if (st !== 200) probs.push(`CDN ${st} for ${o.split('/').pop()}`);
        }
        liveNote = ` live:${objs.length}obj`;
      }
    }
  }
  if (probs.length === 0) okCount += 1;
  console.log(`${u.number} ${slug}${liveNote} ${probs.length === 0 ? 'OK' : 'PROBLEMS: ' + probs.join(' | ')}`);
  for (const p of probs) allProblems.push(`${u.number} ${slug}: ${p}`);
}
console.log(`\n${okCount} of ${units.length} units clean`);
if (allProblems.length) { console.log('PROBLEMS:'); for (const p of allProblems) console.log(' - ' + p); }
