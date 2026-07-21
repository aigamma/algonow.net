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
  assert.ok(Object.keys(atlas.PROBLEMS).length > 0);
});

test('rivalsOf resolves across phrasings through the problem registry', () => {
  const dijkstra = atlas.ALL_ENTRIES.find((e) => e.a === "Dijkstra's algorithm");
  assert.ok(dijkstra, 'Dijkstra missing from the atlas');
  const names = atlas.rivalsOf(dijkstra).map((e) => e.a);
  // These live under different d phrases ("Negative-edge shortest paths",
  // "Binary-weight shortest paths"); only the registry links them.
  assert.ok(names.includes('Bellman-Ford'), 'Bellman-Ford is not a rival of Dijkstra');
  assert.ok(names.includes('0-1 BFS'), '0-1 BFS is not a rival of Dijkstra');
  assert.ok(!names.includes("Dijkstra's algorithm"), 'an entry is its own rival');
});

test('an unregistered phrase still finds its exact-phrase rivals', () => {
  const msa = atlas.ALL_ENTRIES.find((e) => e.d === 'Multiple sequence alignment');
  assert.ok(atlas.rivalsOf(msa).length >= 3);
});
