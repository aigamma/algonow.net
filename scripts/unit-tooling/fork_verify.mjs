// Independently re-verify one fork-authored unit from its artifacts (never from
// the fork's report): solution OK line, vizcheck, narration plan, static checks.
// Usage: node fork_verify.mjs <number> <slug> <VizName>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [numArg, slug, viz] = process.argv.slice(2);
const num = Number(numArg);
const SP = 'C:/Users/eric/AppData/Local/Temp/claude/D--algonow-net/72804c69-ec72-4da2-b499-7f26b34272d8/scratchpad';
const problems = [];
const fail = (m) => problems.push(m);
const out = { number: num, slug };

function slugify(name) {
  return String(name).toLowerCase().replace(/['’]/g, '').replace(/\*/g, ' star ').replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// 0. record
const recPath = path.join(SP, 'queue', `${num}-${slug}.json`);
if (!fs.existsSync(recPath)) { fail(`no queue record ${recPath}`); }
const rec = fs.existsSync(recPath) ? JSON.parse(fs.readFileSync(recPath, 'utf8')) : {};
for (const k of ['slug', 'number', 'plan_row_id', 'problemSlug', 'category', 'algorithm', 'heuristic', 'domain', 'oneLiner', 'description', 'listenMinutes', 'time', 'space', 'baseline', 'narration_plan', 'plan_row']) {
  if (!(k in rec)) fail(`record missing ${k}`);
}
if (rec.slug !== slug) fail(`record slug ${rec.slug}`);
if (rec.number !== num) fail(`record number ${rec.number}`);
if (rec.plan_row_id !== `F${num - 6}`) fail(`record plan_row_id ${rec.plan_row_id} (expected F${num - 6})`);
if (rec.description && rec.description.length > 350) fail(`description ${rec.description.length} chars > 350`);
out.descriptionChars = rec.description ? rec.description.length : null;

// 1. files
const py = `solutions/${slug.replace(/-/g, '_')}.py`;
const files = [py, `src/content/${slug}.jsx`, `src/content/${slug}.narration.js`, `src/viz/${viz}.jsx`, `${slug}/index.html`, `${slug}/main.jsx`];
for (const f of files) if (!fs.existsSync(f)) fail(`missing file ${f}`);
if (problems.length) { console.log(JSON.stringify({ ...out, problems }, null, 1)); process.exit(1); }

// 2. solution
let t0 = Date.now();
const sol = spawnSync('python', [py], { encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
out.solutionSeconds = Math.round((Date.now() - t0) / 100) / 10;
const okLine = (sol.stdout || '').split(/\r?\n/).filter((l) => l.startsWith('OK')).pop();
out.okLine = okLine ? okLine.slice(0, 300) : null;
if (sol.status !== 0) fail(`solution exit ${sol.status}: ${(sol.stderr || '').trim().split(/\r?\n/).slice(-3).join(' | ').slice(0, 400)}`);
if (!okLine) fail('solution printed no OK line');

// 3. vizcheck
t0 = Date.now();
const vc = spawnSync('node', [path.join(SP, 'vizcheck.mjs'), `src/viz/${viz}.jsx`, '20'], { encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
out.vizSeconds = Math.round((Date.now() - t0) / 100) / 10;
try {
  const j = JSON.parse(vc.stdout);
  out.vizcheck = { cycles: j.cycles, ticksPerCycle: j.ticksPerCycle, maxTicks: j.maxTicks, invariantBreaks: j.invariantBreaks };
  if (j.invariantBreaks !== 0) fail(`vizcheck invariantBreaks ${j.invariantBreaks}`);
  if (j.cycles !== 20) fail(`vizcheck cycles ${j.cycles}`);
} catch (e) {
  fail(`vizcheck did not return JSON: ${(vc.stderr || vc.stdout || '').trim().slice(-400)}`);
}
const vizSrc = fs.readFileSync(`src/viz/${viz}.jsx`, 'utf8');
if (!/export function makeScene/.test(vizSrc) || !/export function sceneTick/.test(vizSrc)) fail('viz lacks exported makeScene/sceneTick');
if (!/stepMs/.test(vizSrc) || !/holdTicks/.test(vizSrc)) fail('viz lacks stepMs/holdTicks');
if (!/aspectRatio/.test(vizSrc)) fail('viz canvas lacks aspectRatio');

// 4. narration plan (credential-free)
const plan = spawnSync('node', ['scripts/narration/generate-puzzle-narration.mjs', '--slug', slug], { encoding: 'utf8', timeout: 300000 });
const planPath = `build/narration/review/${slug}-plan.json`;
if (plan.status !== 0 || !fs.existsSync(planPath)) {
  fail(`narration plan failed: ${(plan.stderr || plan.stdout || '').trim().split(/\r?\n/).slice(-4).join(' | ').slice(0, 500)}`);
} else {
  const pj = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const price = pj.conservative_list_price_usd_exact ?? pj.budget?.conservative_list_price_usd_exact;
  const hash = pj.approval_sha256 ?? pj.approval?.sha256;
  out.plan = { price, approval: hash, characters: pj.characters ?? pj.source_characters ?? pj.total_characters };
  if (!price || !hash) fail('plan lacks price or approval hash');
  if (rec.narration_plan && (String(rec.narration_plan.price_usd) !== String(price) || rec.narration_plan.approval_sha256 !== hash)) {
    fail(`record narration_plan (${rec.narration_plan.price_usd}, ${String(rec.narration_plan.approval_sha256).slice(0, 8)}) differs from the plan (${price}, ${String(hash).slice(0, 8)})`);
  }
}

// 5. static checks
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('\u2014')) fail(`em dash in ${f}`);
  if (/heartbeat/i.test(s)) fail(`banned word in ${f}`);
}
const narr = fs.readFileSync(`src/content/${slug}.narration.js`, 'utf8');
const narrText = narr.split(/\r?\n/).filter((l) => !l.trim().startsWith('//')).join('\n');
const texts = [...narrText.matchAll(/text:\s*\n?\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
if (texts.length === 0) {
  // double-quoted or template variants
  for (const m of narrText.matchAll(/text:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) texts.push(m[1]);
}
out.narrationSections = texts.length;
if (texts.length !== 10) fail(`narration has ${texts.length} text entries, expected 10`);
const sections = [...narrText.matchAll(/section:\s*'([a-z]+)'/g)].map((m) => m[1]);
const expected = ['puzzle', 'origins', 'pair', 'picture', 'run', 'signals', 'tradeoffs', 'tradeoffs', 'tradeoffs', 'code'];
if (sections.join(',') !== expected.join(',')) fail(`narration sections ${sections.join(',')}`);
const joined = texts.join(' ');
if (/[0-9]/.test(joined)) fail(`digits in narration: ${joined.match(/.{0,30}[0-9].{0,30}/)[0]}`);
if (/_/.test(joined)) fail('underscore in narration');
if (/->|=>|→/.test(joined)) fail('arrow in narration');
if (/https?:|www\./.test(joined)) fail('URL in narration');
out.narrationChars = joined.length;

const jsx = fs.readFileSync(`src/content/${slug}.jsx`, 'utf8');
const rivalsStart = jsx.indexOf('rivals: [');
const rivalsEnd = jsx.indexOf('\n  ],', rivalsStart);
if (rivalsStart < 0 || rivalsEnd < 0) fail('rivals block not found');
else {
  const block = jsx.slice(rivalsStart, rivalsEnd);
  const cards = block.split(/\r?\n/).filter((l) => /^    \{/.test(l)).length;
  out.rivalCards = cards;
  if (cards !== 4) fail(`rival cards ${cards}, expected 4`);
  const names = [];
  for (const card of block.split(/\n(?=    \{\s*$)/m).slice(1)) {
    const an = card.match(/algoName:\s*(['"])((?:(?!\1).)*)\1/);
    const nm = card.match(/\bname:\s*(['"])((?:(?!\1).)*)\1/);
    const isThis = /isThisUnit:\s*true/.test(card);
    const label = an ? an[2] : nm ? nm[2] : null;
    if (label) names.push({ label, isThis });
  }
  out.rivalPages = {};
  for (const { label, isThis } of names) {
    if (isThis) continue;
    const p = `dist/algo/${slugify(label)}/index.html`;
    out.rivalPages[label] = fs.existsSync(p);
    if (!fs.existsSync(p)) fail(`rival page missing for ${label} (${p})`);
  }
}
for (const k of ['given', 'task', 'constraint', 'origins', 'algoRole', 'heurRole', 'picture', 'steps', 'signals', 'baseline', 'strength', 'weakness', 'problemSlug', 'neverUse', 'contest', 'figure', 'code', 'filename', 'Viz', 'narration']) {
  if (!new RegExp(`\\b${k}\\s*:`).test(jsx) && !new RegExp(`\\b${k}\\b`).test(jsx)) fail(`content lacks ${k}`);
}
const ps = jsx.match(/problemSlug:\s*'([a-z0-9-]+)'/);
if (!ps) fail('content lacks problemSlug'); else {
  out.problemSlug = ps[1];
  if (rec.problemSlug !== ps[1]) fail(`record problemSlug ${rec.problemSlug} != content ${ps[1]}`);
  const probs = JSON.parse(fs.readFileSync('src/data/atlas/problems.json', 'utf8'));
  const list = Array.isArray(probs) ? probs : Object.values(probs).flat();
  const has = JSON.stringify(probs).includes(`"${ps[1]}"`);
  if (!has) fail(`problemSlug ${ps[1]} not in problems.json`);
}
const html = fs.readFileSync(`${slug}/index.html`, 'utf8');
const desc = html.match(/name="description"\s*content="([^"]*)"/);
out.htmlDescriptionChars = desc ? desc[1].length : null;
if (!desc) fail('index.html lacks meta description'); else if (desc[1].length >= 200) fail(`index.html description ${desc[1].length} chars`);
if (!html.includes(`Puzzle ${num}`) && !html.includes(`puzzle ${num}`)) out.htmlMentionsNumber = false;
const main = fs.readFileSync(`${slug}/main.jsx`, 'utf8');
if (!main.includes(`'/${slug}/'`) || !main.includes(`src/content/${slug}.jsx`) || !main.includes(`src/data/narration/${slug}.json`)) fail('main.jsx not wired to the slug');
if (!/narrationManifestProblem/.test(main) || !/throw new Error/.test(main)) fail('main.jsx lacks the no-fallback manifest guard');
if (fs.existsSync(`src/data/narration/${slug}.json`)) fail('a narration manifest already exists before generation');

// atlas pair exists
const atlasDir = 'src/data/atlas/';
let found = null;
for (const f of fs.readdirSync(atlasDir)) {
  if (!f.endsWith('.json') || ['aliases.json', 'problems.json', 'merges.json'].includes(f)) continue;
  const j = JSON.parse(fs.readFileSync(atlasDir + f, 'utf8'));
  const ents = Array.isArray(j) ? j : j.entries || [];
  for (const e of ents) if (e.a === rec.algorithm && e.h === rec.heuristic) found = { topic: f.replace('.json', ''), d: e.d, t: e.t };
}
out.atlas = found;
if (!found) fail(`atlas pair (${rec.algorithm}, ${rec.heuristic}) not found`);
else if (found.d !== rec.domain) fail(`record domain "${rec.domain}" != atlas d "${found.d}"`);

// chunk estimate (calibrated: real = 0.972 to 0.978 of the estimate)
const est = spawnSync('node', [path.join(SP, 'estimate_chunk.mjs'), '', slug], { encoding: 'utf8', timeout: 180000 });
try {
  const rows = JSON.parse(est.stdout);
  out.chunkEstimateKB = rows[0].estKB;
  if (rows[0].estKB > 19.5) fail(`chunk estimate ${rows[0].estKB} KB gz (budget 20 KB real, keep the estimate at or below 19.5)`);
} catch (e) {
  fail(`chunk estimate failed: ${(est.stderr || est.stdout || '').trim().slice(-300)}`);
}

// registry collision
const reg = fs.readFileSync('src/data/puzzles.js', 'utf8');
if (reg.includes(`'/${slug}/'`)) fail('slug already registered');
const pend = JSON.parse(fs.readFileSync('docs/pending-registry.json', 'utf8')).units;
if (pend.some((u) => u.slug === slug)) out.alreadyPending = true;

out.ok = problems.length === 0;
out.problems = problems;
console.log(JSON.stringify(out, null, 1));
process.exit(problems.length ? 1 : 0);
