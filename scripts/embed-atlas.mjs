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
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CATEGORY_OF_TOPIC, CATEGORY_BY_KEY } from '../src/data/atlas-categories.js';

const ATLAS = 'src/data/atlas';
const REGISTRIES = new Set(['aliases', 'problems', 'merges']);
import { pathToFileURL } from 'node:url';
import { runIngestion } from './atlas-ingest.mjs';

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\*/g, ' star ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normPhrase = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export function buildRecords() {
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
    const bytes = readFileSync(`${ATLAS}/${file}`);
    const rows = JSON.parse(bytes.toString('utf8'));
    if (!Array.isArray(rows) || !CATEGORY_OF_TOPIC[topic]) throw new Error('invalid_topic_file');
    const fileHash = createHash('sha256').update(bytes).digest('hex');
    for (const e of rows) entries.push({ ...e, topic, fileHash });
  }
  const byProblem = new Map();
  for (const e of entries) {
    const key = phraseOwner.get(normPhrase(e.d)) ?? `phrase:${normPhrase(e.d)}`;
    if (!byProblem.has(key)) byProblem.set(key, []);
    byProblem.get(key).push(e);
  }

  const summary = JSON.parse(readFileSync('src/data/atlas-summary.json', 'utf8'));
  if (entries.length !== summary.total) throw new Error('catalog_count_mismatch');
  const records = entries.map((e) => {
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

    const pairHash = createHash('sha256').update(JSON.stringify([e.a, e.h ?? ''])).digest('hex');
    const id = `${slugify(e.a)}--${pairHash.slice(0, 16)}`;
    return {
      id,
      text,
      hash: createHash('sha256').update(text).digest('hex'),
      payload: {
        source_file: `${ATLAS}/${e.topic}.json`,
        source_file_sha256: e.fileHash,
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
  if (new Set(records.map(r => r.id)).size !== records.length) throw new Error('catalog_id_collision');
  return records;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIngestion(buildRecords()).catch(error => {
    console.error('Atlas ingestion failed: ' + (/^[a-z0-9_]+$/.test(error.message) ? error.message : 'local_or_service_failure'));
    process.exitCode = 1;
  });
}
