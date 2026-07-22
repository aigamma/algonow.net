// Repo oracle: registry/entry lockstep, style bans, and gzip budgets.
// Exits non-zero on any FAIL; run after `npm run build` for the budget pass.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { PUZZLES } from '../src/data/puzzles.js';
import { CATEGORIES, CATEGORY_OF_TOPIC } from '../src/data/atlas-categories.js';
import { REGISTRY_KEYS } from '../src/data/atlas-registry.js';

let failures = 0;
let warnings = 0;
const ok = (msg) => console.log(`PASS ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL ${msg}`);
};
const warn = (msg) => {
  warnings += 1;
  console.log(`WARN ${msg}`);
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

  // The comparative standard (owner directive 2026-07-22): a unit that teaches
  // one method in isolation fails the site's purpose even when it is correct.
  // Every page must place its method among real rivals, show a machine-drawn
  // figure with a citation, and race the field on one shared instance.
  // The comparative standard, enforced. This was a warning during the
  // migration of the six pre-doctrine pages; all six now comply, so it is a
  // hard failure and no new unit can ship teaching one method in isolation.
  const comparative = (msg) => fail(`comparative standard: ${msg}`);
  const contentSrc = readFileSync(`src/content/${p.slug}.jsx`, 'utf8');
  const rivalCount = (contentSrc.match(/^\s*\{\s*name:/gm) ?? []).length;
  if (!/\brivals:\s*\[/.test(contentSrc)) {
    comparative(`${p.slug}: content has no rivals array (rivals are mandatory)`);
  } else if (rivalCount < 2) {
    comparative(`${p.slug}: only ${rivalCount} named rival(s); the doctrine wants two or three`);
  }
  if (!/\bproblem:\s*'/.test(contentSrc)) {
    comparative(`${p.slug}: content names no shared problem for its rivals`);
  }
  if (!/\bcontest:\s*\{/.test(contentSrc)) {
    comparative(`${p.slug}: content has no measured contest table`);
  }
  if (!/\bfigure:\s*\(/.test(contentSrc)) {
    comparative(`${p.slug}: content has no machine-drawn figure`);
  } else if (!/cite=\{\{/.test(contentSrc)) {
    comparative(`${p.slug}: figure carries no citation`);
  }

  // Link integrity into the prerendered data surface. A rival whose name has
  // no page is a dead link on a flagship page, and the display name on a unit
  // is not always the atlas canonical name, which is what `algoName` is for.
  if (existsSync('dist/algo')) {
    const slugOf = (name) =>
      String(name)
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/\*/g, ' star ')
        .replace(/\+/g, ' plus ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const pslug = contentSrc.match(/problemSlug:\s*'([^']+)'/)?.[1];
    if (pslug && !existsSync(`dist/problem/${pslug}/index.html`)) {
      fail(`${p.slug}: problemSlug "${pslug}" has no generated page`);
    }
    // Each rival object may override the link target with algoName.
    const blocks = contentSrc.split(/\n\s{4}\{\s*\n/).slice(1);
    for (const b of blocks) {
      const name = b.match(/^\s*name:\s*'([^']+)'|^\s*name:\s*"([^"]+)"/m);
      if (!name) continue;
      const display = name[1] ?? name[2];
      const override = b.match(/algoName:\s*'([^']+)'/)?.[1]
        ?? b.match(/algoName:\s*"([^"]+)"/)?.[1];
      const target = slugOf(override ?? display);
      if (!existsSync(`dist/algo/${target}/index.html`)) {
        fail(`${p.slug}: rival "${display}" links to /algo/${target}/ which does not exist`);
      }
    }
  }
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
    // The atlas page embeds the whole catalog; it is a single data-heavy
    // browse page (not on the PageSpeed-critical path the homepage and puzzle
    // pages share) served with an immutable cache, so it carries its own
    // generous budget. If the catalog outgrows this, switch the atlas data
    // from a bundled JS chunk to a runtime-fetched JSON asset rather than
    // just raising the ceiling again.
    else if (a.startsWith('atlas-')) budget(`atlas chunk ${a}`, size, 120 * 1024);
    else if (a.endsWith('.js')) budget(`chunk ${a}`, size, 20 * 1024);
  }
  budget('html index.html', gz('dist/index.html'), 2 * 1024);
  for (const p of Object.values(PUZZLES)) {
    budget(`html ${p.slug}`, gz(`dist/${p.slug}/index.html`), 2 * 1024);
  }
  if (!existsSync('dist/sitemap.xml')) fail('dist/sitemap.xml missing');
  else {
    // The sitemap is now an index over chunked files, because the prerendered
    // data surface is thousands of URLs. Search every chunk.
    const chunks = readdirSync('dist').filter((f) => /^sitemap-\d+\.xml$/.test(f));
    if (!chunks.length) fail('sitemap index lists no chunk files');
    const sm = chunks.map((f) => readFileSync(`dist/${f}`, 'utf8')).join('\n');
    const missing = Object.keys(PUZZLES).filter((path) => !sm.includes(`algonow.net${path}`));
    if (missing.length) fail(`sitemap missing: ${missing.join(', ')}`);
    else {
      const urls = (sm.match(/<loc>/g) ?? []).length;
      ok(`sitemap: ${urls} URLs across ${chunks.length} chunk(s), all live pairs present`);
    }
  }

  // The prerendered data surface must actually exist in dist, and its pages
  // must stay small. They carry no JavaScript, so anything large means a
  // template regression.
  const dataPages = [
    'dist/problem/index.html',
    'dist/category/index.html',
    'dist/data.css',
  ];
  const missingData = dataPages.filter((p) => !existsSync(p));
  if (missingData.length) {
    fail(`prerendered data surface missing: ${missingData.join(', ')}`);
  } else {
    const gzOf = (p) => gzipSync(readFileSync(p)).length;
    budget('data.css', gzOf('dist/data.css'), 4 * 1024);
    budget('html problem index', gzOf('dist/problem/index.html'), 12 * 1024);
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
  // normalized algorithm name -> { display, files:Set } for the alias and
  // duplicate-scan passes below.
  const byAlgo = new Map();
  let total = 0;
  const perFile = [];
  // Registry files are metadata about the catalog, not topic shards. The list
  // is shared with the page bundle (src/data/atlas-registry.js) so the two can
  // never disagree about what counts as a topic.
  const isTopicFile = (f) => f.endsWith('.json') && !REGISTRY_KEYS.includes(f.replace('.json', ''));
  const strayRegistry = REGISTRY_KEYS.filter((k) => !existsSync(`${atlasDir}/${k}.json`));
  if (strayRegistry.length) fail(`atlas-registry.js lists missing file(s): ${strayRegistry.join(', ')}`);
  // normalized domain phrase -> Set of "algorithm x heuristic" display strings,
  // for the rivals pass below. entryPhrases keeps (topic, phrase) per entry so
  // the rivals pass can rank topics by uncovered entries (the backfill order).
  const byPhrase = new Map();
  const entryPhrases = [];
  const normPhrase = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const file of readdirSync(atlasDir).filter(isTopicFile).sort()) {
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
      const na = norm(e.a);
      if (!byAlgo.has(na)) byAlgo.set(na, { display: e.a, files: new Set() });
      byAlgo.get(na).files.add(file.replace('.json', ''));
      const np = normPhrase(e.d);
      if (!byPhrase.has(np)) byPhrase.set(np, { display: e.d, entries: [] });
      byPhrase.get(np).entries.push(`${e.a}${e.h ? ` × ${e.h}` : ''}`);
      entryPhrases.push({ topic: file.replace('.json', ''), np });
      total += 1;
      return undefined;
    });
    perFile.push(`${file.replace('.json', '')} ${arr.length}`);
  }
  ok(`atlas files: ${perFile.join(' · ')}`);

  // Category coverage: every topic file maps to exactly one category, and
  // every category references only real topic files.
  const topicKeys = readdirSync(atlasDir).filter(isTopicFile).map((f) => f.replace('.json', ''));
  const catTopics = new Set();
  for (const cat of CATEGORIES) {
    for (const topic of cat.topics) {
      if (catTopics.has(topic)) fail(`category topics: "${topic}" listed in more than one category`);
      catTopics.add(topic);
      if (!topicKeys.includes(topic)) fail(`category "${cat.key}" references missing topic "${topic}"`);
    }
  }
  const orphans = topicKeys.filter((t) => !CATEGORY_OF_TOPIC[t]);
  if (orphans.length) fail(`topics not placed in any category: ${orphans.join(', ')}`);
  else ok(`hierarchy: ${CATEGORIES.length} categories, ${topicKeys.length} topics, all placed`);

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
    const realTopicCount = topicKeys.length;
    if (summary.total !== total) {
      fail(`atlas-summary.json total ${summary.total} != actual ${total}; update it`);
    } else if (summary.topics !== realTopicCount) {
      fail(`atlas-summary.json topics ${summary.topics} != actual ${realTopicCount}; update it`);
    } else if (summary.categories !== CATEGORIES.length) {
      fail(`atlas-summary.json categories ${summary.categories} != actual ${CATEGORIES.length}; update it`);
    } else {
      ok(`atlas-summary.json in sync (${total} entries / ${realTopicCount} topics / ${CATEGORIES.length} categories)`);
    }
  } else {
    fail(`${summaryPath} missing`);
  }

  // Alias registry: structural validation plus merge-candidate detection.
  const aliasPath = `${atlasDir}/aliases.json`;
  if (existsSync(aliasPath)) {
    let aliases;
    try {
      aliases = JSON.parse(readFileSync(aliasPath, 'utf8'));
    } catch (e) {
      fail(`aliases.json: invalid JSON (${e.message})`);
      aliases = {};
    }
    let aliasCount = 0;
    const akaSeen = new Map();
    for (const [canonical, meta] of Object.entries(aliases)) {
      if (canonical.startsWith('_')) continue; // doc keys
      if (!meta || !Array.isArray(meta.aka) || !meta.aka.length) {
        fail(`aliases "${canonical}": missing non-empty aka array`);
        continue;
      }
      const nc = norm(canonical);
      // Canonical must be a real entry unless explicitly a pure redirect target.
      if (!meta.redirectOnly && !byAlgo.has(nc)) {
        fail(`aliases "${canonical}": no atlas entry with this name (add redirectOnly:true if intended)`);
      }
      for (const aka of meta.aka) {
        aliasCount += 1;
        const nk = norm(aka);
        if (nk === nc) fail(`aliases "${canonical}": aka "${aka}" equals the canonical name`);
        if (akaSeen.has(nk) && akaSeen.get(nk) !== canonical) {
          fail(`aliases: "${aka}" claimed by both "${akaSeen.get(nk)}" and "${canonical}"`);
        }
        akaSeen.set(nk, canonical);
        // A synonym that is ALSO a distinct real entry is a merge candidate.
        if (byAlgo.has(nk) && nk !== nc) {
          warn(`merge candidate: "${aka}" is aliased to "${canonical}" but also exists as its own entry in ${[...byAlgo.get(nk).files].join(', ')}`);
        }
      }
    }
    ok(`aliases: ${Object.keys(aliases).filter((k) => !k.startsWith('_')).length} canonical names, ${aliasCount} synonyms`);
  }

  // The rivals registry: one problem, many phrasings. Validates the registry
  // against live entries and reports how much of the catalog can actually
  // answer "what else could solve this?", which is the site's core lesson.
  const problemsPath = `${atlasDir}/problems.json`;
  if (existsSync(problemsPath)) {
    let problems;
    try {
      problems = JSON.parse(readFileSync(problemsPath, 'utf8'));
    } catch (e) {
      fail(`problems.json: invalid JSON (${e.message})`);
      problems = {};
    }
    const phraseOwner = new Map(); // normalized phrase -> problem slug
    let problemCount = 0;
    for (const [slug, meta] of Object.entries(problems)) {
      if (slug.startsWith('_')) continue; // doc keys
      problemCount += 1;
      if (!/^[a-z0-9-]+$/.test(slug)) fail(`problems "${slug}": key must be a lowercase slug`);
      if (!meta || typeof meta.label !== 'string' || !meta.label.trim())
        fail(`problems "${slug}": missing label`);
      if (!meta || !Array.isArray(meta.phrases) || !meta.phrases.length) {
        fail(`problems "${slug}": missing non-empty phrases array`);
        continue;
      }
      for (const phrase of meta.phrases) {
        const np = normPhrase(phrase);
        if (!byPhrase.has(np)) {
          fail(`problems "${slug}": phrase "${phrase}" matches no atlas entry (dead phrase)`);
          continue;
        }
        if (phraseOwner.has(np) && phraseOwner.get(np) !== slug) {
          fail(`problems: phrase "${phrase}" claimed by both "${phraseOwner.get(np)}" and "${slug}"`);
        }
        phraseOwner.set(np, slug);
      }
    }

    // Rival clusters: entries resolve to a registry problem, else to their own
    // phrase. An entry has rivals when its cluster holds two or more entries.
    const clusters = new Map();
    for (const [np, info] of byPhrase) {
      const key = phraseOwner.get(np) ?? `phrase:${np}`;
      if (!clusters.has(key)) clusters.set(key, 0);
      clusters.set(key, clusters.get(key) + info.entries.length);
    }
    let withRivals = 0;
    for (const size of clusters.values()) if (size >= 2) withRivals += size;
    const pct = ((withRivals / total) * 100).toFixed(1);
    ok(`rivals: ${problemCount} registered problems, ${clusters.size} clusters, ${withRivals}/${total} entries (${pct}%) have at least one rival`);

    // Backfill steering: which topics hold the most entries with no rival.
    const uncByTopic = new Map();
    for (const { topic, np } of entryPhrases) {
      const size = clusters.get(phraseOwner.get(np) ?? `phrase:${np}`) ?? 0;
      if (size < 2) uncByTopic.set(topic, (uncByTopic.get(topic) ?? 0) + 1);
    }
    const worstTopics = [...uncByTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (worstTopics.length) {
      console.log(`     worst topics by uncovered entries: ${worstTopics.map(([t, n]) => `${t} ${n}`).join(' · ')}`);
    }

    // Planning queue: the biggest phrases still outside the registry. Each is a
    // candidate to fold into an existing problem (or to name as a new one).
    const unregistered = [...byPhrase.entries()]
      .filter(([np]) => !phraseOwner.has(np))
      .map(([, info]) => ({ d: info.display, n: info.entries.length }))
      .filter((x) => x.n >= 3)
      .sort((a, b) => b.n - a.n);
    if (unregistered.length) {
      warn(`rivals queue: ${unregistered.length} unregistered phrases with 3+ entries (fold into problems.json):`);
      console.log(`     ${unregistered.slice(0, 20).map((x) => `${x.d} (${x.n})`).join(' · ')}`);
    }
  } else {
    fail(`${problemsPath} missing`);
  }

  // Automatic duplicate scan (planning aid, non-failing): entries whose
  // "core name" (the distinctive words, with generic suffixes and domain
  // qualifiers stripped) coincides across two or more distinct entries. These
  // are the likely "three names for one thing" cases to review for a canonical
  // merge or an explicit alias.
  // High-precision suffix set: only qualifiers that mark the SAME method
  // restated (an implementation form or a domain label), never words that
  // distinguish genuinely different methods (tree, filter, search, coding...).
  const GENERIC = new Set([
    'algorithm', 'method', 'dp', 'decoding', 'encoding', 'tagging', 'scheme',
    'problem', 'procedure',
  ]);
  const core = (na) =>
    na.split(' ').filter((w) => w && !GENERIC.has(w)).sort().join(' ');
  const byCore = new Map();
  for (const [na, info] of byAlgo) {
    const c = core(na);
    if (!c || c.length < 4) continue;
    if (!byCore.has(c)) byCore.set(c, []);
    byCore.get(c).push(info.display);
  }
  const dupes = [...byCore.values()].filter((names) => new Set(names.map((n) => n.toLowerCase())).size > 1);
  if (dupes.length) {
    warn(`duplicate-name scan: ${dupes.length} core-name clusters span multiple distinct entries (review for canonical merge):`);
    for (const names of dupes.slice(0, 40)) {
      console.log(`     ~ ${[...new Set(names)].join('  ==?==  ')}`);
    }
    if (dupes.length > 40) console.log(`     ... and ${dupes.length - 40} more`);
  } else {
    ok('duplicate-name scan: no cross-entry core-name collisions');
  }
}

const warnNote = warnings ? ` (${warnings} planning warning${warnings === 1 ? '' : 's'})` : '';
console.log(failures ? `\n${failures} FAILURE(S)${warnNote}` : `\nALL CHECKS PASS${warnNote}`);
process.exit(failures ? 1 : 0);
