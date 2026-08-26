// Regenerates src/data/atlas-summary.json from the atlas source of truth.
// The summary is a tiny committed file because the homepage and atlas hero
// import it instead of the full catalog (bundle budget); this script makes it
// mechanically derived, and `npm run check` still fails the build if the
// committed copy ever drifts from the data. Counting rules mirror check.mjs
// exactly: distinct names are lowercased with whitespace collapsed, phrasings
// are distinct normalized `d` values, problems are non-underscore keys of
// problems.json.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { REGISTRY_KEYS } from '../src/data/atlas-registry.js';
import { CATEGORIES } from '../src/data/atlas-categories.js';

const ATLAS = 'src/data/atlas';
const nameKey = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const algoNames = new Set();
const heurNames = new Set();
const phrases = new Set();
let total = 0;
let topics = 0;
for (const file of readdirSync(ATLAS).filter((f) => f.endsWith('.json')).sort()) {
  const key = file.replace('.json', '');
  if (REGISTRY_KEYS.includes(key)) continue;
  topics += 1;
  for (const e of JSON.parse(readFileSync(`${ATLAS}/${file}`, 'utf8'))) {
    total += 1;
    algoNames.add(nameKey(e.a));
    if (e.h && String(e.h).trim()) heurNames.add(nameKey(e.h));
    phrases.add(nameKey(e.d));
  }
}
const problems = JSON.parse(readFileSync(`${ATLAS}/problems.json`, 'utf8'));
const problemCount = Object.keys(problems).filter((k) => !k.startsWith('_')).length;

const summary = {
  total,
  algorithms: algoNames.size,
  heuristics: heurNames.size,
  phrasings: phrases.size,
  problems: problemCount,
  topics,
  categories: CATEGORIES.length,
};
writeFileSync('src/data/atlas-summary.json', JSON.stringify(summary) + '\n');
console.log(`PASS sync-summary: ${JSON.stringify(summary)}`);
