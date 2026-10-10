// List atlas topics by live coverage with their unbuilt tier-one pairs.
import fs from 'node:fs';
const path = 'src/data/atlas/';
const files = fs.readdirSync(path).filter((f) => f.endsWith('.json') && !['aliases.json', 'problems.json'].includes(f));
const src = fs.readFileSync('src/data/puzzles.js', 'utf8');
const live = new Set();
for (const m of src.matchAll(/algorithm:\s*'((?:[^'\\]|\\.)*)'/g)) live.add(m[1].replace(/\\'/g, "'").toLowerCase());
for (const m of src.matchAll(/algorithm:\s*"([^"]*)"/g)) live.add(m[1].toLowerCase());
const pend = JSON.parse(fs.readFileSync('docs/pending-registry.json', 'utf8')).units;
for (const u of pend) live.add(u.algorithm.toLowerCase());
for (const a of ['Ski rental', 'Reaching definitions', '2-opt', 'Vickrey auction', 'Connected component labeling']) live.add(a.toLowerCase());
const rows = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path + f, 'utf8'));
  const ents = Array.isArray(j) ? j : j.entries; if (!Array.isArray(ents)) { console.log("skip non-array", f); continue; }
  const topic = f.replace('.json', '');
  const liveN = ents.filter((e) => live.has(e.a.toLowerCase())).length;
  const t1 = ents.filter((e) => e.t === 1 && !live.has(e.a.toLowerCase())).map((e) => `${e.a} x ${e.h} [${e.d}]`);
  rows.push({ topic, n: ents.length, liveN, t1 });
}
rows.sort((a, b) => a.liveN - b.liveN || b.n - a.n);
console.log('live set size', live.size);
for (const r of rows) {
  console.log(`${r.topic}  entries=${r.n} live=${r.liveN} tier1-unbuilt=${r.t1.length}`);
  for (const x of r.t1.slice(0, 8)) console.log(`    ${x}`);
}
