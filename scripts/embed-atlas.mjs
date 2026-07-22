// Build the staged Qdrant record for every atlas entry, and (only when
// explicitly told to spend money) embed and upsert it.
//
// SPEND GUARD. Embedding calls Voyage, which is metered. Per the standing
// token doctrine this script REFUSES to make a paid call unless run with
// --i-am-paying. Default behaviour is a dry run: it builds every record,
// reports the corpus size and a token estimate, writes a sample, and exits.
// That way the whole pipeline can be developed, reviewed, and diffed without
// a cent of spend, and the paid step is a deliberate separate act.
//
//   node scripts/embed-atlas.mjs                 # dry run, free, default
//   node scripts/embed-atlas.mjs --sample 3      # dry run, print 3 records
//   node scripts/embed-atlas.mjs --i-am-paying   # real embedding + upsert
//
// Env for the paid path: VOYAGE_API_KEY, QDRANT_URL, QDRANT_API_KEY.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CATEGORY_OF_TOPIC, CATEGORY_BY_KEY } from '../src/data/atlas-categories.js';

const ATLAS = 'src/data/atlas';
const REGISTRIES = new Set(['aliases', 'problems']);
const COLLECTION = 'algonow_atlas';
const MODEL = 'voyage-context-4';
const DIM = 1024;

const argv = process.argv.slice(2);
const PAYING = argv.includes('--i-am-paying');
const SAMPLE = Number(argv[argv.indexOf('--sample') + 1]) || 0;

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\*/g, ' star ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normPhrase = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

function buildRecords() {
  const aliases = JSON.parse(readFileSync(`${ATLAS}/aliases.json`, 'utf8'));
  const problems = JSON.parse(readFileSync(`${ATLAS}/problems.json`, 'utf8'));

  const akaOf = new Map();
  for (const [canonical, meta] of Object.entries(aliases)) {
    if (canonical.startsWith('_')) continue;
    akaOf.set(canonical.toLowerCase(), meta.aka ?? []);
  }
  const phraseOwner = new Map();
  const problemLabel = new Map();
  for (const [slug, meta] of Object.entries(problems)) {
    if (slug.startsWith('_')) continue;
    problemLabel.set(slug, meta.label);
    for (const p of meta.phrases) phraseOwner.set(normPhrase(p), slug);
  }

  // First pass: collect entries and the rival index keyed by problem.
  const entries = [];
  for (const file of readdirSync(ATLAS).filter((f) => f.endsWith('.json')).sort()) {
    const topic = file.replace('.json', '');
    if (REGISTRIES.has(topic)) continue;
    for (const e of JSON.parse(readFileSync(`${ATLAS}/${file}`, 'utf8'))) {
      entries.push({ ...e, topic });
    }
  }
  const byProblem = new Map();
  for (const e of entries) {
    const key = phraseOwner.get(normPhrase(e.d)) ?? `phrase:${normPhrase(e.d)}`;
    if (!byProblem.has(key)) byProblem.set(key, []);
    byProblem.get(key).push(e);
  }

  return entries.map((e) => {
    const aka = akaOf.get(e.a.toLowerCase()) ?? [];
    const problemKey = phraseOwner.get(normPhrase(e.d)) ?? `phrase:${normPhrase(e.d)}`;
    const label = problemLabel.get(problemKey) ?? e.d;
    const category = CATEGORY_OF_TOPIC[e.topic];
    const rivals = [...new Set(
      (byProblem.get(problemKey) ?? [])
        .filter((o) => o.a !== e.a)
        .map((o) => o.a),
    )];

    // The embedded text. Everything a natural-language question might match
    // on, in one string: canonical name, every alias, the heuristic, the
    // problem in both its specific phrasing and its registered label, and the
    // taxonomy. This is the join docs/RETRIEVAL.md specifies.
    const text = [
      e.a,
      aka.length ? `also known as ${aka.join(', ')}` : '',
      e.h ? `paired with ${e.h}` : 'standalone algorithm',
      `solves ${e.d}`,
      label !== e.d ? `problem: ${label}` : '',
      `topic ${e.topic}`,
      category ? `field ${CATEGORY_BY_KEY[category]?.label ?? category}` : '',
      rivals.length ? `rivals ${rivals.slice(0, 8).join(', ')}` : '',
    ].filter(Boolean).join('. ');

    const id = e.h ? `${slugify(e.a)}--${slugify(e.h)}` : slugify(e.a);
    return {
      id,
      text,
      hash: createHash('sha256').update(text).digest('hex').slice(0, 16),
      payload: {
        algorithm: e.a,
        heuristic: e.h,
        phrase: e.d,
        problem: problemKey.startsWith('phrase:') ? null : problemKey,
        problem_label: label,
        topic: e.topic,
        category,
        tier: e.t,
        aliases: aka,
        rivals: rivals.slice(0, 16),
        url: `/algo/${slugify(e.a)}/`,
      },
    };
  });
}

async function main() {
  const records = buildRecords();
  const chars = records.reduce((s, r) => s + r.text.length, 0);
  const approxTokens = Math.round(chars / 4);

  mkdirSync('build', { recursive: true });
  writeFileSync('build/atlas-records.json', JSON.stringify(records, null, 2));

  console.log(`records: ${records.length}`);
  console.log(`collection: ${COLLECTION} · model: ${MODEL} · dim: ${DIM}`);
  console.log(`corpus: ${chars.toLocaleString()} chars, ~${approxTokens.toLocaleString()} tokens`);
  console.log('wrote build/atlas-records.json (gitignored, inspect before paying)');

  for (const r of records.slice(0, SAMPLE)) {
    console.log('\n---');
    console.log(r.id);
    console.log(r.text);
  }

  if (!PAYING) {
    console.log(
      '\nDRY RUN. No API call was made and nothing was spent. ' +
      'Re-run with --i-am-paying to embed and upsert.',
    );
    return;
  }

  const { VOYAGE_API_KEY, QDRANT_URL, QDRANT_API_KEY } = process.env;
  if (!VOYAGE_API_KEY || !QDRANT_URL) {
    console.error('FAIL: --i-am-paying needs VOYAGE_API_KEY and QDRANT_URL in the environment');
    process.exit(1);
  }

  // Ensure the collection exists with the payload indexes the filtered
  // queries need. Creating an index after the fact forces a re-scan, so it is
  // cheaper to declare them up front.
  await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'api-key': QDRANT_API_KEY ?? '' },
    body: JSON.stringify({ vectors: { size: DIM, distance: 'Cosine' } }),
  });
  for (const field of ['category', 'topic', 'tier', 'problem']) {
    await fetch(`${QDRANT_URL}/collections/${COLLECTION}/index`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'api-key': QDRANT_API_KEY ?? '' },
      body: JSON.stringify({ field_name: field, field_schema: field === 'tier' ? 'integer' : 'keyword' }),
    });
  }

  const BATCH = 128;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, input: batch.map((r) => r.text), input_type: 'document' }),
    });
    if (!res.ok) {
      console.error(`FAIL: Voyage returned ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const { data } = await res.json();
    await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'api-key': QDRANT_API_KEY ?? '' },
      body: JSON.stringify({
        points: batch.map((r, k) => ({
          id: createHash('md5').update(r.id).digest('hex').replace(
            /^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/, '$1-$2-$3-$4-$5',
          ),
          vector: data[k].embedding,
          payload: { ...r.payload, hash: r.hash, entry_id: r.id },
        })),
      }),
    });
    console.log(`upserted ${Math.min(i + BATCH, records.length)}/${records.length}`);
  }
  console.log('done');
}

main();
