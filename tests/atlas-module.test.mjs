// Loads the REAL data module the /atlas page imports, through Vite's SSR
// loader so import.meta.glob resolves exactly as it does in the browser
// bundle.
//
// This test exists because `npm run build` exiting 0 does not prove the page
// runs. Vite never executes client code at build time, so when problems.json
// was added and src/data/atlas.js still filtered out only aliases.json, the
// build stayed green while the atlas page would have thrown
// "mod.default.slice is not a function" on a plain object at load. Anything
// that adds a registry file to src/data/atlas/ must keep this passing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { REGISTRY_KEYS } from '../src/data/atlas-registry.js';

const server = await createServer({
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});
const atlas = await server.ssrLoadModule('/src/data/atlas.js');
// The rivals table lives in its own module so problems.json stays out of
// the atlas page bundle; load it the same way.
const rivals = await server.ssrLoadModule('/src/data/atlas-rivals.js');
await server.close();

const atlasDir = 'src/data/atlas';
const jsonFiles = readdirSync(atlasDir).filter((f) => f.endsWith('.json'));
const topicFiles = jsonFiles.filter((f) => !REGISTRY_KEYS.includes(f.replace('.json', '')));

test('registries are not rendered as topics', () => {
  assert.equal(atlas.TOPIC_COUNT, topicFiles.length);
  for (const key of REGISTRY_KEYS) {
    assert.ok(!atlas.TOPICS.some((t) => t.key === key), `${key} leaked into TOPICS`);
  }
});

test('every entry survives aggregation with its category attached', () => {
  const expected = topicFiles.reduce(
    (n, f) => n + JSON.parse(readFileSync(`${atlasDir}/${f}`, 'utf8')).length,
    0,
  );
  assert.equal(atlas.TOTAL, expected);
  assert.equal(atlas.ALL_ENTRIES.filter((e) => !e.categoryKey).length, 0);
});

test('the registries load as objects', () => {
  assert.ok(Object.keys(atlas.ALIASES).length > 0);
  assert.ok(Object.keys(rivals.PROBLEMS).length > 0);
});

test('rivalsOf resolves across phrasings through the problem registry', () => {
  const dijkstra = atlas.ALL_ENTRIES.find((e) => e.a === "Dijkstra's algorithm");
  assert.ok(dijkstra, 'Dijkstra missing from the atlas');
  const names = rivals.rivalsOf(dijkstra).map((e) => e.a);
  // These live under different d phrases ("Negative-edge shortest paths",
  // "Binary-weight shortest paths"); only the registry links them.
  assert.ok(names.includes('Bellman-Ford'), 'Bellman-Ford is not a rival of Dijkstra');
  assert.ok(names.includes('0-1 BFS'), '0-1 BFS is not a rival of Dijkstra');
  assert.ok(!names.includes("Dijkstra's algorithm"), 'an entry is its own rival');
});

test('an unregistered phrase still finds its exact-phrase rivals', () => {
  const msa = atlas.ALL_ENTRIES.find((e) => e.d === 'Multiple sequence alignment');
  assert.ok(rivals.rivalsOf(msa).length >= 3);
});

// The reason atlas-rivals.js exists: problems.json must not reach the page
// bundle. If someone globs it back into atlas.js, this fails. merges.json
// (the consolidation manifest) is under the same rule: only the prerender and
// the check read it, and the atlas chunk has no byte headroom for it.
test('the atlas page module does not pull in the rivals registry', () => {
  assert.equal(atlas.PROBLEMS, undefined, 'PROBLEMS leaked back into atlas.js');
  assert.equal(atlas.rivalsOf, undefined, 'rivalsOf leaked back into atlas.js');
  const src = readFileSync('src/data/atlas.js', 'utf8');
  assert.ok(
    src.includes("'!./atlas/problems.json'"),
    'the glob no longer excludes problems.json'
  );
  assert.ok(
    src.includes("'!./atlas/merges.json'"),
    'the glob no longer excludes merges.json'
  );
});

// The 2026-08-26 taxonomy consolidation: merged problems must actually make
// their members rivals, and retired slugs must be gone from the live registry.
// Each assertion is a rivalry the old taxonomy could not see.
test('consolidated problems connect their merged rival sets', () => {
  const byName = (name) => atlas.ALL_ENTRIES.find((e) => e.a === name);

  // tour-improvement -> traveling-salesman: 2-opt now rivals Lin-Kernighan.
  const twoOpt = byName('2-opt');
  assert.ok(twoOpt, '2-opt missing from the atlas');
  const tspRivals = rivals.rivalsOf(twoOpt).map((e) => e.a);
  assert.ok(tspRivals.includes('Lin-Kernighan'), '2-opt does not rival Lin-Kernighan');
  assert.ok(tspRivals.includes('Christofides'), '2-opt does not rival Christofides');

  // sat-solving -> boolean-satisfiability: DPLL now rivals CDCL.
  const dpll = byName('DPLL');
  assert.ok(rivals.rivalsOf(dpll).some((e) => e.a === 'CDCL'), 'DPLL does not rival CDCL');

  // cross-validation + model-comparison -> generalization-estimation:
  // K-fold now rivals the Akaike information criterion.
  const kfold = byName('K-fold cross-validation');
  assert.ok(
    rivals.rivalsOf(kfold).some((e) => e.a === 'Akaike information criterion'),
    'K-fold CV does not rival AIC'
  );

  // monte-carlo-tree-search dissolved into game-tree-search: MCTS with UCB1
  // now rivals alpha-beta minimax. The pair is the site's flagship contrast.
  const mcts = atlas.ALL_ENTRIES.find(
    (e) => e.a === 'Monte Carlo tree search' && e.h === 'UCB1 exploration bonus'
  );
  assert.ok(rivals.rivalsOf(mcts).some((e) => e.a === 'Minimax'), 'MCTS does not rival Minimax');
});

test('retired problem slugs are out of the registry and the manifest is coherent', () => {
  const manifest = JSON.parse(readFileSync('src/data/atlas/merges.json', 'utf8'));
  assert.ok(manifest.merges.length >= 30, 'manifest lost its merge records');
  for (const m of manifest.merges) {
    assert.ok(!rivals.PROBLEMS[m.retired], `retired "${m.retired}" is still a live problem`);
    assert.ok(rivals.PROBLEMS[m.into], `"${m.retired}" redirects to missing "${m.into}"`);
  }
});
