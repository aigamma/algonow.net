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
    else if (a.startsWith('atlas-')) {
      budget(`atlas chunk ${a}`, size, 120 * 1024);
      // The registries that only the build reads must never ship to the
      // browser. Before 5e01aa1 split out atlas-rivals.js, all of
      // problems.json (26 KB gz) rode the eager glob into the atlas chunk
      // for months while every source-level test stayed green: tests see
      // modules, not bundle bytes. Scanning the emitted chunk for
      // registry-unique markers is the only oracle that catches a leak of
      // this kind. "The RIVALS table" opens problems.json's _doc; the
      // second string opens merges.json's.
      const text = readFileSync(`dist/assets/${a}`, 'utf8');
      if (text.includes('The RIVALS table')) fail(`atlas chunk ${a}: problems.json bytes shipped to the browser`);
      if (text.includes('Machine-readable manifest')) fail(`atlas chunk ${a}: merges.json bytes shipped to the browser`);
    }
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
    'dist/problem/by-rivals/index.html',
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
    budget('html problem by-rivals', gzOf('dist/problem/by-rivals/index.html'), 12 * 1024);
    // The by-rivals view must actually be sorted by rival depth: read its own
    // badges and require a non-increasing sequence.
    const byRivalsHtml = readFileSync('dist/problem/by-rivals/index.html', 'utf8');
    const badge = [...byRivalsHtml.matchAll(/<a href="\/problem\/[a-z0-9-]+\/">[^<]+<\/a><b>(\d+)<\/b>/g)].map((m) => +m[1]);
    const unsortedAt = badge.findIndex((n, i) => i > 0 && n > badge[i - 1]);
    if (badge.length < 100) fail(`by-rivals page lists only ${badge.length} problems`);
    else if (unsortedAt !== -1) fail(`by-rivals page not sorted by rival depth at row ${unsortedAt}`);
    else ok(`by-rivals view: ${badge.length} problems, depth-sorted`);
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
  // Distinct display names, counted exactly as src/data/atlas.js counts them
  // (lowercase, whitespace collapsed) so the printed figures can be verified.
  const nameKey = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const algoNames = new Set();
  const heurNames = new Set();
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
      if (!byPhrase.has(np)) byPhrase.set(np, { display: e.d, entries: [], algos: new Set() });
      byPhrase.get(np).entries.push(`${e.a}${e.h ? ` × ${e.h}` : ''}`);
      byPhrase.get(np).algos.add(norm(e.a));
      entryPhrases.push({ topic: file.replace('.json', ''), np });
      algoNames.add(nameKey(e.a));
      if (e.h && String(e.h).trim()) heurNames.add(nameKey(e.h));
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
    // Problems are the grouping the whole catalog hangs on, so the summary
    // carries them too: every distinct `d` phrasing, and the canonical
    // problems those phrasings collapse into. Read here rather than reusing
    // the rivals pass below, which runs later.
    const realPhrasings = byPhrase.size;
    let realProblems = 0;
    try {
      const reg = JSON.parse(readFileSync(`${atlasDir}/problems.json`, 'utf8'));
      realProblems = Object.keys(reg).filter((k) => !k.startsWith('_')).length;
    } catch {
      realProblems = -1;
    }
    if (summary.total !== total) {
      fail(`atlas-summary.json total ${summary.total} != actual ${total}; update it`);
    } else if (summary.topics !== realTopicCount) {
      fail(`atlas-summary.json topics ${summary.topics} != actual ${realTopicCount}; update it`);
    } else if (summary.categories !== CATEGORIES.length) {
      fail(`atlas-summary.json categories ${summary.categories} != actual ${CATEGORIES.length}; update it`);
    } else if (summary.algorithms !== algoNames.size) {
      fail(`atlas-summary.json algorithms ${summary.algorithms} != actual ${algoNames.size}; update it`);
    } else if (summary.heuristics !== heurNames.size) {
      fail(`atlas-summary.json heuristics ${summary.heuristics} != actual ${heurNames.size}; update it`);
    } else if (summary.phrasings !== realPhrasings) {
      fail(`atlas-summary.json phrasings ${summary.phrasings} != actual ${realPhrasings}; update it`);
    } else if (summary.problems !== realProblems) {
      fail(`atlas-summary.json problems ${summary.problems} != actual ${realProblems}; update it`);
    } else {
      ok(
        `atlas-summary.json in sync (${total} entries = ${algoNames.size} algorithms x ${heurNames.size} heuristics, ` +
          `attacking ${realPhrasings} phrasings grouped into ${realProblems} problems, ` +
          `across ${realTopicCount} topics in ${CATEGORIES.length} categories)`
      );
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
    // Canonical labels must be unique after normalization: two problems whose
    // labels differ only in case, punctuation, or spacing are one problem
    // wearing two names, which is exactly what the consolidation retired.
    const labelSeen = new Map();
    const normLabel = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    for (const [slug, meta] of Object.entries(problems)) {
      if (slug.startsWith('_')) continue; // doc keys
      problemCount += 1;
      if (!/^[a-z0-9-]+$/.test(slug)) fail(`problems "${slug}": key must be a lowercase slug`);
      if (!meta || typeof meta.label !== 'string' || !meta.label.trim())
        fail(`problems "${slug}": missing label`);
      else {
        const nl = normLabel(meta.label);
        if (labelSeen.has(nl)) fail(`problems: labels of "${slug}" and "${labelSeen.get(nl)}" collide as "${meta.label}"`);
        labelSeen.set(nl, slug);
      }
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
    // phrase. An entry has rivals when its cluster holds two or more DISTINCT
    // METHODS, not merely two entries: rivalsOf excludes same-algorithm
    // entries (they are heuristic variants, not rivals), so a cluster whose
    // entries all share one `a` renders a page with zero rivals however many
    // rows it holds. Counting entries overstated coverage as 99.4% while the
    // truthful distinct-method figure is what the pages actually show.
    const clusters = new Map();
    for (const [np, info] of byPhrase) {
      const key = phraseOwner.get(np) ?? `phrase:${np}`;
      if (!clusters.has(key)) clusters.set(key, { n: 0, algos: new Set(), display: info.display });
      const c = clusters.get(key);
      c.n += info.entries.length;
      for (const a of info.algos) c.algos.add(a);
    }
    let withRivals = 0;
    for (const c of clusters.values()) if (c.algos.size >= 2) withRivals += c.n;
    const pct = ((withRivals / total) * 100).toFixed(1);
    ok(`rivals: ${problemCount} registered problems, ${clusters.size} clusters, ${withRivals}/${total} entries (${pct}%) have at least one rival (distinct-method rule)`);

    // Single-method multi-entry clusters: covered by the old entry count,
    // rival-less in truth. Each is an authoring target (invert the a-slot or
    // author a real rival); see Phase H in docs/OVERNIGHT-PLAN.md.
    const phantom = [...clusters.entries()]
      .filter(([, c]) => c.n >= 2 && c.algos.size === 1)
      .map(([key, c]) => `${key.startsWith('phrase:') ? c.display : key} (${c.n})`);
    if (phantom.length) {
      console.log(`     single-method clusters (variants, no true rival): ${phantom.join(' · ')}`);
    }

    // Backfill steering: which topics hold the most entries with no rival.
    const uncByTopic = new Map();
    for (const { topic, np } of entryPhrases) {
      const c = clusters.get(phraseOwner.get(np) ?? `phrase:${np}`);
      if (!c || c.algos.size < 2) uncByTopic.set(topic, (uncByTopic.get(topic) ?? 0) + 1);
    }
    const worstTopics = [...uncByTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (worstTopics.length) {
      console.log(`     worst topics by uncovered entries: ${worstTopics.map(([t, n]) => `${t} ${n}`).join(' · ')}`);
    }

    // Planning queue: the biggest phrases still outside the registry. Each is a
    // candidate to fold into an existing problem (or to name as a new one).
    const unregistered = [...byPhrase.entries()]
      .filter(([np]) => !phraseOwner.has(np))
      .map(([, info]) => ({ d: info.display, n: info.entries.length, m: info.algos.size }))
      // Two DISTINCT METHODS is a rivalry, and a rivalry is what earns a
      // /problem/ page. Entries are the wrong unit here: rivalsOf excludes
      // same-algorithm entries, so a phrase held by one algorithm's heuristic
      // variants (Light chasing twice, Tetris placement twice) has no real
      // rivalry to surface and stays an honest hold instead of queue noise.
      .filter((x) => x.m >= 2)
      .sort((a, b) => b.n - a.n);
    if (unregistered.length) {
      const entries = unregistered.reduce((n, x) => n + x.n, 0);
      warn(
        `rivals queue: ${unregistered.length} unregistered phrases with 2+ distinct methods ` +
          `(${entries} entries) have rivals but no /problem/ page; fold into problems.json:`
      );
      console.log(`     ${unregistered.slice(0, 20).map((x) => `${x.d} (${x.n})`).join(' · ')}`);
      if (unregistered.length > 20) console.log(`     ...and ${unregistered.length - 20} more`);
    }

    // The merge manifest: every problem the consolidation retired must stay
    // out of the live registry, point at a live survivor (so redirects cannot
    // chain or loop), and keep a redirect page in dist so old links resolve.
    const mergesPath = `${atlasDir}/merges.json`;
    if (existsSync(mergesPath)) {
      let manifest;
      try {
        manifest = JSON.parse(readFileSync(mergesPath, 'utf8'));
      } catch (e) {
        fail(`merges.json: invalid JSON (${e.message})`);
        manifest = { merges: [] };
      }
      const retiredSeen = new Set();
      let redirectPages = 0;
      for (const m of manifest.merges ?? []) {
        if (!m.retired || !m.into) { fail(`merges.json: entry missing retired/into`); continue; }
        if (retiredSeen.has(m.retired)) fail(`merges.json: "${m.retired}" retired twice`);
        retiredSeen.add(m.retired);
        if (problems[m.retired]) fail(`merges.json: "${m.retired}" is retired but still a live problem`);
        if (!problems[m.into]) fail(`merges.json: "${m.retired}" redirects to "${m.into}" which is not a live problem (chain or dangle)`);
        if (retiredSeen.has(m.into)) fail(`merges.json: "${m.retired}" redirects to retired "${m.into}" (redirect chain)`);
        for (const dest of Object.values(m.phrasesMovedElsewhere ?? {})) {
          if (!problems[dest]) fail(`merges.json: "${m.retired}" moves a phrase to missing problem "${dest}"`);
        }
        if (existsSync('dist/problem')) {
          if (existsSync(`dist/problem/${m.retired}/index.html`)) redirectPages += 1;
          else fail(`merges.json: no redirect page in dist for retired slug "${m.retired}"`);
        }
      }
      // Server-level 301s: every retired slug needs its exact forced line in
      // dist/_redirects, or Netlify serves the stub with a 200 and the
      // permanent-move signal never reaches crawlers.
      if (existsSync('dist/_redirects')) {
        const lines = new Set(readFileSync('dist/_redirects', 'utf8').split('\n').filter(Boolean));
        const missing301 = (manifest.merges ?? []).filter(
          (m) => !lines.has(`/problem/${m.retired}/ /problem/${m.into}/ 301!`)
        );
        if (missing301.length) fail(`_redirects missing forced 301s for: ${missing301.map((m) => m.retired).join(', ')}`);
      } else if (existsSync('dist/problem')) {
        fail('dist/_redirects missing: retired problem slugs would serve 200 stubs instead of 301s');
      }
      for (const add of manifest.added ?? []) {
        if (!problems[add.slug]) fail(`merges.json: added problem "${add.slug}" is not in the live registry`);
      }
      ok(`merges manifest: ${retiredSeen.size} retired slugs, all redirecting to live problems${redirectPages ? `, ${redirectPages} redirect pages in dist` : ''}`);
    }

    // The problem index must list every live problem exactly once, in
    // alphabetical label order (the lookup contract of the page), and every
    // category page must carry its problems-in-this-category filter section.
    if (existsSync('dist/problem/index.html')) {
      const idxHtml = readFileSync('dist/problem/index.html', 'utf8');
      const idxSlugs = [...idxHtml.matchAll(/<a href="\/problem\/([a-z0-9-]+)\/">[^<]+<\/a><b>\d+<\/b>/g)].map((m) => m[1]);
      const expected = Object.entries(problems)
        .filter(([k]) => !k.startsWith('_'))
        .sort((a, b) => a[1].label.localeCompare(b[1].label, 'en'))
        .map(([k]) => k);
      if (idxSlugs.length !== expected.length) {
        fail(`problem index lists ${idxSlugs.length} problems, registry has ${expected.length}`);
      } else if (idxSlugs.some((s, i) => s !== expected[i])) {
        const i = idxSlugs.findIndex((s, j) => s !== expected[j]);
        fail(`problem index order breaks at row ${i}: "${idxSlugs[i]}" where "${expected[i]}" belongs`);
      } else {
        ok(`problem index: ${idxSlugs.length} problems in alphabetical label order with A-Z anchors`);
      }
      if (!idxHtml.includes('class="az"')) fail('problem index lost its A-Z jump bar');
      const missingCatSections = CATEGORIES.filter(
        (c) => existsSync(`dist/category/${c.key}/index.html`) &&
          !readFileSync(`dist/category/${c.key}/index.html`, 'utf8').includes('Problems attacked from this category')
      );
      if (missingCatSections.length) {
        fail(`category pages missing their problems section: ${missingCatSections.map((c) => c.key).join(', ')}`);
      }
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
