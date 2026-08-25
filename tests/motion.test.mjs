// The motion preference is an accessibility control, so its promises are
// tested rather than assumed: the default really is slow, the still setting
// really stops, and the components really render without a browser present.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

let nonce = 0;
// Each import gets a fresh module instance, because the level is memoized.
const freshMotion = () => import(`../src/lib/motion.js?t=${nonce++}`);

function stubBrowser({ stored = null, reduce = false } = {}) {
  const store = new Map();
  if (stored) store.set('algonow:motion', stored);
  const attrs = {};
  globalThis.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
    matchMedia: (q) => ({ matches: reduce && q.includes('reduce') }),
  };
  globalThis.document = {
    documentElement: {
      setAttribute: (k, v) => {
        attrs[k] = v;
      },
    },
  };
  return { store, attrs };
}

function clearBrowser() {
  delete globalThis.window;
  delete globalThis.document;
}

test('levels are well formed and still means still', async () => {
  clearBrowser();
  const m = await freshMotion();
  const keys = m.MOTION_LEVELS.map((l) => l.key);
  assert.equal(new Set(keys).size, keys.length, 'level keys are unique');
  for (const l of m.MOTION_LEVELS) {
    assert.equal(typeof l.stepScale, 'number');
    assert.equal(typeof l.restScale, 'number');
    assert.ok(l.label && l.hint, `${l.key} has a label and a hint`);
  }
  const still = m.MOTION_LEVELS.find((l) => l.key === 'still');
  assert.equal(still.stepScale, 0, 'still does not animate');
});

test('the default is genuinely slower and rests longer than standard', async () => {
  clearBrowser();
  const m = await freshMotion();
  assert.equal(m.DEFAULT_LEVEL, 'very-slow');
  const def = m.MOTION_LEVELS.find((l) => l.key === m.DEFAULT_LEVEL);
  const std = m.MOTION_LEVELS.find((l) => l.key === 'standard');
  assert.ok(def.stepScale >= 3 * std.stepScale, 'default steps at most a third the speed');
  assert.ok(def.restScale >= 3 * std.restScale, 'default rests at least three times as long');
});

test('holdTicks scales a rest by the active level', async () => {
  stubBrowser({ stored: 'very-slow' });
  const m = await freshMotion();
  const scale = m.getLevel().restScale;
  assert.equal(m.holdTicks(60), Math.round(60 * scale));
  assert.ok(m.holdTicks(60) > 60, 'the default lengthens the pause before a repeat');
  assert.equal(m.isStill(), false);
});

test('a stored choice wins, and setLevel persists and notifies', async () => {
  const { store, attrs } = stubBrowser({ stored: 'slow' });
  const m = await freshMotion();
  assert.equal(m.getLevelKey(), 'slow');

  const seen = [];
  const off = m.subscribe((l) => seen.push(l.key));
  m.setLevel('still');
  assert.equal(m.getLevelKey(), 'still');
  assert.equal(m.isStill(), true);
  assert.equal(m.holdTicks(60), 0, 'a still figure holds no repeat timer');
  assert.equal(store.get('algonow:motion'), 'still', 'the choice is persisted');
  assert.deepEqual(seen, ['still'], 'subscribers are told once');
  assert.equal(attrs['data-motion'], 'still', 'the level reaches the html element for CSS');

  off();
  m.setLevel('standard');
  assert.deepEqual(seen, ['still'], 'unsubscribing stops the notifications');
});

test('an operating-system reduce-motion request defaults to still', async () => {
  stubBrowser({ reduce: true });
  const m = await freshMotion();
  assert.equal(m.getLevelKey(), 'still');
});

test('an explicit choice overrides an operating-system request', async () => {
  stubBrowser({ stored: 'standard', reduce: true });
  const m = await freshMotion();
  assert.equal(m.getLevelKey(), 'standard', 'the reader outranks the system default');
});

test('unknown or absent storage falls back to the calm default', async () => {
  stubBrowser({ stored: 'ludicrous-speed' });
  const m = await freshMotion();
  assert.equal(m.getLevelKey(), 'very-slow');
});

// The header renders on the server during prerender, where there is no window
// and no localStorage. This proves the control survives that.
test('SiteShell and the motion control render with no browser present', async (t) => {
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    return t.skip('esbuild unavailable');
  }
  clearBrowser();

  // Inside the project so the bundle's `react` import resolves normally.
  const cacheDir = path.join('node_modules', '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const outfile = path.join(cacheDir, `algonow-ssr-${process.pid}-${nonce++}.mjs`);
  await esbuild.build({
    entryPoints: ['src/components/SiteShell.jsx'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    outfile,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    logLevel: 'silent',
  });

  try {
    const [{ default: React }, { renderToStaticMarkup }, mod] = await Promise.all([
      import('react'),
      import('react-dom/server'),
      import(pathToFileURL(outfile).href),
    ]);
    const html = renderToStaticMarkup(React.createElement(mod.default, null, null));
    assert.match(html, /motion-trigger/, 'the motion control is in the header');
    assert.match(html, /motion: very slow/, 'it opens on the calm default');
    assert.match(html, /aria-expanded="false"/, 'the panel starts closed');
    assert.match(html, /<nav class="site-nav"/, 'the rest of the header still renders');
  } finally {
    fs.rmSync(outfile, { force: true });
  }
});
