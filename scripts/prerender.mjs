// The data surface: turn the atlas into thousands of navigable pages.
//
// Why a separate prerender step rather than Vite entries: 3,500 Rollup inputs
// would be unbuildable, and these pages need no client JavaScript at all.
// They are read-only views of committed data, so they ship as static HTML
// with one shared stylesheet, which keeps every page far inside the perf
// budget and needs no hydration.
//
// Run after `vite build`. Emits into dist/.
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { CATEGORIES, CATEGORY_OF_TOPIC } from '../src/data/atlas-categories.js';
import { PUZZLES, SITE_HOST } from '../src/data/puzzles.js';

const ATLAS = 'src/data/atlas';
const OUT = 'dist';
const REGISTRIES = new Set(['aliases', 'problems']);

// ---------------------------------------------------------------- utilities

// Star and plus are load-bearing in algorithm names, not decoration: RRT and
// RRT*, B-tree and B+ tree, CFR and CFR+, HyperLogLog and HyperLogLog++ are
// different algorithms. Stripping the symbol collapses them onto one URL and
// silently overwrites one page with another, which is exactly what the first
// version of this script did. Encode them instead.
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\*/g, ' star ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const normPhrase = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

function write(relPath, html) {
  const dir = `${OUT}/${relPath}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, html);
}

// ---------------------------------------------------------------- load data

function loadAtlas() {
  const topics = [];
  const byAlgo = new Map();
  const byPhrase = new Map();
  for (const file of readdirSync(ATLAS).filter((f) => f.endsWith('.json')).sort()) {
    const key = file.replace('.json', '');
    if (REGISTRIES.has(key)) continue;
    const entries = JSON.parse(readFileSync(`${ATLAS}/${file}`, 'utf8'));
    topics.push({ key, entries });
    for (const e of entries) {
      const ak = e.a.toLowerCase();
      if (!byAlgo.has(ak)) byAlgo.set(ak, { display: e.a, pairs: [] });
      byAlgo.get(ak).pairs.push({ ...e, topic: key });
      const pk = normPhrase(e.d);
      if (!byPhrase.has(pk)) byPhrase.set(pk, { display: e.d, entries: [] });
      byPhrase.get(pk).entries.push({ ...e, topic: key });
    }
  }
  const problems = JSON.parse(readFileSync(`${ATLAS}/problems.json`, 'utf8'));
  const aliases = JSON.parse(readFileSync(`${ATLAS}/aliases.json`, 'utf8'));
  return { topics, byAlgo, byPhrase, problems, aliases };
}

// ---------------------------------------------------------------- templates

const STYLE = '/data.css';

function page({ title, description, canonical, crumbs, body, head = '' }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE_HOST}${canonical}">
<link rel="stylesheet" href="${STYLE}">
${head}</head><body>
<header class="dh"><a class="wm" href="/">algo<span>now</span></a>
<nav class="dn"><a href="/atlas/">atlas</a><a href="/category/">categories</a><a href="/problem/">problems</a></nav></header>
<main class="dw">
<nav class="crumbs">${crumbs.map((c) => (c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : `<span>${esc(c.label)}</span>`)).join('<i>/</i>')}</nav>
${body}
</main>
<footer class="df"><p>Every entry is a real named method. Pairs that share a problem are rivals; that is the point.</p></footer>
</body></html>`;
}

function tierTag(t) {
  const label = t === 1 ? 'canon' : t === 2 ? 'standard' : 'specialist';
  return `<span class="tier t${t}">${label}</span>`;
}

function entryLine(e, { showAlgo = true } = {}) {
  const algo = showAlgo
    ? `<a class="ea" href="/algo/${slugify(e.a)}/">${esc(e.a)}</a>`
    : '';
  const heur = e.h ? `<span class="eh">${esc(e.h)}</span>` : '<span class="eh none">standalone</span>';
  return `<li>${algo}${heur}${tierTag(e.t)}<a class="et" href="/topic/${e.topic}/">${esc(e.topic)}</a></li>`;
}

// ---------------------------------------------------------------- generate

function main() {
  if (!existsSync(OUT)) {
    console.error('FAIL prerender: dist/ missing, run `vite build` first');
    process.exit(1);
  }
  const { topics, byAlgo, byPhrase, problems, aliases } = loadAtlas();

  // phrase -> problem slug, and problem slug -> its phrases
  const phraseOwner = new Map();
  for (const [slug, meta] of Object.entries(problems)) {
    if (slug.startsWith('_')) continue;
    for (const p of meta.phrases) phraseOwner.set(normPhrase(p), slug);
  }
  // canonical algorithm (lowercased) -> alias record
  const aliasOf = new Map();
  for (const [canonical, meta] of Object.entries(aliases)) {
    if (canonical.startsWith('_')) continue;
    aliasOf.set(canonical.toLowerCase(), { canonical, ...meta });
  }

  // problem slug -> entries that resolve to it
  const problemEntries = new Map();
  for (const [pk, info] of byPhrase) {
    const owner = phraseOwner.get(pk);
    if (!owner) continue;
    if (!problemEntries.has(owner)) problemEntries.set(owner, []);
    problemEntries.get(owner).push(...info.entries);
  }

  let count = 0;
  const shadowed = [];

  // Every real entry's slug, computed before writing anything, so alias
  // redirects can refuse to overwrite one. Also the collision oracle: two
  // distinct algorithm names landing on one slug means one page silently
  // replaces the other, so the build must stop rather than lie.
  const realSlugs = new Map();
  for (const [, info] of byAlgo) {
    const s = slugify(info.display);
    if (!realSlugs.has(s)) realSlugs.set(s, new Set());
    realSlugs.get(s).add(info.display);
  }
  const collisions = [...realSlugs.entries()].filter(([, names]) => names.size > 1);
  if (collisions.length) {
    for (const [s, names] of collisions) {
      console.error(`FAIL prerender: slug "${s}" claimed by ${[...names].join(' and ')}`);
    }
    process.exit(1);
  }

  // ---- /algo/<slug>/
  for (const [, info] of byAlgo) {
    const slug = slugify(info.display);
    const alias = aliasOf.get(info.display.toLowerCase());
    const topicsUsed = [...new Set(info.pairs.map((p) => p.topic))];
    const cat = CATEGORY_OF_TOPIC[topicsUsed[0]];
    const catMeta = CATEGORIES.find((c) => c.key === cat);

    // rivals: everything else attacking any problem this algorithm attacks
    const rivalNames = new Set();
    const problemsHit = new Set();
    for (const p of info.pairs) {
      const owner = phraseOwner.get(normPhrase(p.d));
      const pool = owner
        ? problemEntries.get(owner) ?? []
        : byPhrase.get(normPhrase(p.d))?.entries ?? [];
      if (owner) problemsHit.add(owner);
      for (const other of pool) {
        if (other.a.toLowerCase() !== info.display.toLowerCase()) rivalNames.add(other.a);
      }
    }
    const rivals = [...rivalNames].sort().slice(0, 24);

    const body = `
<h1>${esc(info.display)}</h1>
${alias?.aka?.length ? `<p class="aka">Also known as ${alias.aka.map((a) => `<b>${esc(a)}</b>`).join(', ')}. This is the canonical page; those names redirect here.</p>` : ''}
${alias?.note ? `<p class="note">${esc(alias.note)}</p>` : ''}
<section><h2>Pairings in the atlas</h2><ul class="entries">
${info.pairs.map((p) => `<li><span class="eh">${p.h ? esc(p.h) : 'standalone'}</span>${tierTag(p.t)}<a class="ed" href="${problemHref(p, phraseOwner)}">${esc(p.d)}</a><a class="et" href="/topic/${p.topic}/">${esc(p.topic)}</a></li>`).join('\n')}
</ul></section>
${rivals.length ? `<section><h2>Rivals: other methods for the same problems</h2><ul class="rivals">
${rivals.map((r) => `<li><a href="/algo/${slugify(r)}/">${esc(r)}</a></li>`).join('')}
</ul></section>` : ''}
<section class="meta"><h2>Where it sits</h2><p>${topicsUsed.map((t) => `<a href="/topic/${t}/">${esc(t)}</a>`).join(', ')}${catMeta ? ` &middot; <a href="/category/${catMeta.key}/">${esc(catMeta.label)}</a>` : ''}</p></section>`;

    write(`algo/${slug}`, page({
      title: `${info.display} · algonow`,
      description: `${info.display}: its pairings, the problems it attacks, and the rival methods that attack the same problems.`,
      canonical: `/algo/${slug}/`,
      crumbs: [{ label: 'algonow', href: '/' }, { label: 'algorithms', href: '/atlas/' }, { label: info.display }],
      body,
    }));
    count++;

    // alias redirect pages, per the redirect doctrine in docs/ATLAS.md.
    // An alias must never overwrite a real entry's page: "Viterbi decoding"
    // is both an alias of "Viterbi algorithm" and its own catalog entry, and
    // writing the redirect would delete the entry page.
    for (const aka of alias?.aka ?? []) {
      const aslug = slugify(aka);
      if (aslug === slug) continue;
      if (realSlugs.has(aslug)) {
        shadowed.push(`${aka} -> ${aslug} (would shadow a real entry)`);
        continue;
      }
      write(`algo/${aslug}`, page({
        title: `${aka} · see ${info.display}`,
        description: `${aka} is another name for ${info.display}.`,
        canonical: `/algo/${slug}/`,
        crumbs: [{ label: 'algonow', href: '/' }, { label: info.display, href: `/algo/${slug}/` }],
        head: `<meta http-equiv="refresh" content="0; url=/algo/${slug}/"><meta name="robots" content="noindex,follow">`,
        body: `<h1>${esc(aka)}</h1><p class="aka">Another name for <a href="/algo/${slug}/"><b>${esc(info.display)}</b></a>. Redirecting.</p>`,
      }));
      count++;
    }
  }

  // ---- /problem/<slug>/
  const problemList = [];
  for (const [slug, meta] of Object.entries(problems)) {
    if (slug.startsWith('_')) continue;
    const entries = problemEntries.get(slug) ?? [];
    const byTopic = new Map();
    for (const e of entries) {
      if (!byTopic.has(e.topic)) byTopic.set(e.topic, []);
      byTopic.get(e.topic).push(e);
    }
    problemList.push({ slug, label: meta.label, n: entries.length });

    const body = `
<h1>${esc(meta.label)}</h1>
<p class="lede"><b>${entries.length}</b> method${entries.length === 1 ? '' : 's'} in the atlas attack this one problem. They are rivals: each wins something the others do not.</p>
<section><h2>Phrasings that mean this problem</h2><p class="phrases">${meta.phrases.map((p) => `<span>${esc(p)}</span>`).join('')}</p></section>
${[...byTopic.entries()].sort().map(([topic, es]) => `<section><h2><a href="/topic/${topic}/">${esc(topic)}</a></h2><ul class="entries">
${es.map((e) => entryLine(e)).join('\n')}
</ul></section>`).join('\n')}`;

    write(`problem/${slug}`, page({
      title: `${meta.label} · algonow`,
      description: `${entries.length} rival methods for ${meta.label}, with the topic and tier of each.`,
      canonical: `/problem/${slug}/`,
      crumbs: [{ label: 'algonow', href: '/' }, { label: 'problems', href: '/problem/' }, { label: meta.label }],
      body,
    }));
    count++;
  }

  // ---- /problem/ index
  problemList.sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  write('problem', page({
    title: 'Every problem in the atlas · algonow',
    description: `${problemList.length} problems, each with the rival methods that attack it.`,
    canonical: '/problem/',
    crumbs: [{ label: 'algonow', href: '/' }, { label: 'problems' }],
    body: `<h1>Problems</h1><p class="lede">${problemList.length} problems. The number is how many rival methods the atlas knows for each.</p>
<ul class="index">${problemList.map((p) => `<li><a href="/problem/${p.slug}/">${esc(p.label)}</a><b>${p.n}</b></li>`).join('')}</ul>`,
  }));
  count++;

  // ---- /topic/<slug>/
  for (const { key, entries } of topics) {
    const cat = CATEGORIES.find((c) => c.key === CATEGORY_OF_TOPIC[key]);
    const body = `<h1>${esc(key)}</h1>
<p class="lede"><b>${entries.length}</b> entries${cat ? ` in <a href="/category/${cat.key}/">${esc(cat.label)}</a>` : ''}.</p>
<ul class="entries">${entries.map((e) => entryLine({ ...e, topic: key })).join('\n')}</ul>`;
    write(`topic/${key}`, page({
      title: `${key} · algonow`,
      description: `${entries.length} algorithms and algorithm-heuristic pairs in ${key}.`,
      canonical: `/topic/${key}/`,
      crumbs: [{ label: 'algonow', href: '/' }, { label: cat ? cat.label : 'topics', href: cat ? `/category/${cat.key}/` : '/atlas/' }, { label: key }],
      body,
    }));
    count++;
  }

  // ---- /category/<slug>/ and index
  for (const cat of CATEGORIES) {
    const rows = cat.topics.map((t) => ({
      t,
      n: topics.find((x) => x.key === t)?.entries.length ?? 0,
    }));
    const total = rows.reduce((s, r) => s + r.n, 0);
    write(`category/${cat.key}`, page({
      title: `${cat.label} · algonow`,
      description: `${cat.blurb} ${total} entries across ${rows.length} topics.`,
      canonical: `/category/${cat.key}/`,
      crumbs: [{ label: 'algonow', href: '/' }, { label: 'categories', href: '/category/' }, { label: cat.label }],
      body: `<h1>${esc(cat.label)}</h1><p class="lede">${esc(cat.blurb)}</p>
<ul class="index">${rows.map((r) => `<li><a href="/topic/${r.t}/">${esc(r.t)}</a><b>${r.n}</b></li>`).join('')}</ul>`,
    }));
    count++;
  }
  write('category', page({
    title: 'Categories · algonow',
    description: 'The twenty top-level fields of the atlas.',
    canonical: '/category/',
    crumbs: [{ label: 'algonow', href: '/' }, { label: 'categories' }],
    body: `<h1>Categories</h1><ul class="index">${CATEGORIES.map((c) => `<li><a href="/category/${c.key}/">${esc(c.label)}</a><b>${c.topics.length}</b></li>`).join('')}</ul>`,
  }));
  count += 1;

  writeFileSync(`${OUT}/data.css`, DATA_CSS);

  // ---- sitemaps. One file per 40,000 URLs, well inside the 50,000 limit,
  // plus an index. Alias redirect pages are deliberately excluded: they carry
  // noindex and a canonical pointing elsewhere, so listing them would ask
  // crawlers to fetch pages we have already told them to ignore.
  const urls = [
    '/',
    '/atlas/',
    '/category/',
    '/problem/',
    ...Object.keys(PUZZLES),
    ...CATEGORIES.map((c) => `/category/${c.key}/`),
    ...topics.map((t) => `/topic/${t.key}/`),
    ...problemList.map((p) => `/problem/${p.slug}/`),
    ...[...byAlgo.values()].map((a) => `/algo/${slugify(a.display)}/`),
  ];
  const CHUNK = 40000;
  const files = [];
  for (let i = 0; i < urls.length; i += CHUNK) {
    const slice = urls.slice(i, i + CHUNK);
    const name = `sitemap-${files.length + 1}.xml`;
    writeFileSync(
      `${OUT}/${name}`,
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
        slice.map((u) => `<url><loc>${SITE_HOST}${u}</loc></url>`).join('\n')
      }\n</urlset>\n`,
    );
    files.push(name);
  }
  writeFileSync(
    `${OUT}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      files.map((f) => `<sitemap><loc>${SITE_HOST}/${f}</loc></sitemap>`).join('\n')
    }\n</sitemapindex>\n`,
  );

  return {
    count,
    algos: byAlgo.size,
    problems: problemList.length,
    topics: topics.length,
    shadowed,
    urls: urls.length,
    sitemaps: files.length,
  };
}

function problemHref(pair, phraseOwner) {
  const owner = phraseOwner.get(normPhrase(pair.d));
  return owner ? `/problem/${owner}/` : `/topic/${pair.topic}/`;
}

const DATA_CSS = `:root{--bg:#0b0e14;--panel:#111725;--ink:#e8edf7;--dim:#9aa5bd;--line:#232c40;--algo:#5da2ff;--heur:#f0b94b;--path:#62d98a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--algo);text-decoration:none}a:hover{text-decoration:underline}
.dh{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem 1.25rem;border-bottom:1px solid var(--line);flex-wrap:wrap}
.wm{font-weight:700;letter-spacing:-.02em;color:var(--ink)}.wm span{color:var(--algo)}
.dn a{margin-left:1rem;color:var(--dim);font-size:.9rem}
.dw{max-width:60rem;margin:0 auto;padding:1.5rem 1.25rem 3rem}
.crumbs{font:12px/1.4 ui-monospace,monospace;color:var(--dim);margin-bottom:1.25rem}.crumbs i{margin:0 .5rem;font-style:normal;opacity:.5}
h1{font-size:1.9rem;letter-spacing:-.02em;margin:.2rem 0 .6rem}
h2{font:12px/1.4 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin:1.8rem 0 .7rem}
.lede{color:var(--dim);margin:0 0 1rem}.lede b{color:var(--ink)}
.aka{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:.75rem .9rem;color:var(--dim);font-size:.92rem}
.aka b{color:var(--ink)}.note{color:var(--dim);font-size:.88rem;font-style:italic}
ul{list-style:none;margin:0;padding:0}
.entries li{display:flex;flex-wrap:wrap;gap:.5rem;align-items:baseline;padding:.5rem .1rem;border-bottom:1px solid var(--line)}
.ea{font-weight:600}.eh{color:var(--heur);font-size:.9rem}.eh.none{color:var(--dim);opacity:.6}
.ed{color:var(--dim);font-size:.88rem}.et{margin-left:auto;font:11px/1 ui-monospace,monospace;color:var(--dim);opacity:.7}
.tier{font:10px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em;border:1px solid var(--line);border-radius:99px;padding:.2rem .45rem;color:var(--dim)}
.t1{color:var(--path);border-color:rgba(98,217,138,.4)}.t2{color:var(--algo);border-color:rgba(93,162,255,.35)}
.phrases span{display:inline-block;background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:.2rem .6rem;margin:0 .35rem .35rem 0;font-size:.82rem;color:var(--dim)}
.rivals{display:flex;flex-wrap:wrap;gap:.4rem}.rivals li{background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:.25rem .7rem;font-size:.88rem}
.index li{display:flex;justify-content:space-between;gap:1rem;padding:.5rem .1rem;border-bottom:1px solid var(--line)}
.index b{color:var(--dim);font:12px/1.6 ui-monospace,monospace}
.meta p{color:var(--dim);font-size:.9rem}
.df{border-top:1px solid var(--line);padding:1.25rem;color:var(--dim);font-size:.85rem;text-align:center}
@media(max-width:640px){.et{margin-left:0}}`;

const stats = main();
console.log(
  `PASS prerender: ${stats.count} pages (${stats.algos} algorithms, ` +
  `${stats.problems} problems, ${stats.topics} topics, ${CATEGORIES.length} categories)`,
);
console.log(
  `PASS sitemap: ${stats.urls} indexable URLs across ${stats.sitemaps} sitemap file(s)`,
);
for (const s of stats.shadowed) {
  console.log(`WARN prerender: alias page skipped, ${s}`);
}
