// The motion preference is an accessibility control, so its promises are
// tested rather than assumed: the default really does hold a finished figure
// for two minutes, the still setting really stops, and the components really
// render without a browser present.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CREATOR_LINK, HEADER_LINKS } from '../src/data/site-chrome.js';

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

// The pace useCanvasLoop stamps onto a state object at init.
const withPace = (paceMs, PACE_KEY) => ({ [PACE_KEY]: paceMs });

test('levels are well formed and still means still', async () => {
  clearBrowser();
  const m = await freshMotion();
  const keys = m.MOTION_LEVELS.map((l) => l.key);
  assert.equal(new Set(keys).size, keys.length, 'level keys are unique');
  for (const l of m.MOTION_LEVELS) {
    assert.equal(typeof l.stepScale, 'number');
    assert.equal(typeof l.restSeconds, 'number');
    assert.ok(l.label && l.hint, `${l.key} has a label and a hint`);
  }
  const still = m.MOTION_LEVELS.find((l) => l.key === 'still');
  assert.equal(still.stepScale, 0, 'still does not animate');
  assert.equal(still.restSeconds, 0, 'still never repeats');
});

test('the default draws at normal speed and rests two minutes', async () => {
  clearBrowser();
  const m = await freshMotion();
  assert.equal(m.DEFAULT_LEVEL, 'calm');
  const def = m.MOTION_LEVELS.find((l) => l.key === m.DEFAULT_LEVEL);
  assert.equal(def.stepScale, 1, 'the drawing itself runs at the normal pace');
  assert.ok(def.restSeconds >= 120, 'a finished figure holds for at least two minutes');
});

test('holdTicks turns the promised seconds into ticks at any pace', async () => {
  stubBrowser({ stored: 'calm' });
  const m = await freshMotion();
  const seconds = m.getLevel().restSeconds;
  for (const pace of [16, 34, 40, 55, 137]) {
    const ticks = m.holdTicks(withPace(pace, m.PACE_KEY));
    const waited = ticks * pace;
    assert.ok(
      waited >= seconds * 1000,
      `at ${pace}ms per tick the wait is ${waited}ms, short of ${seconds * 1000}ms`
    );
    assert.ok(waited < seconds * 1000 + pace, 'and it does not overshoot by more than one tick');
  }
});

// The promise is about the figures that actually ship, so this reads their
// real stepMs out of the source rather than trusting a representative number.
test('every shipped figure waits at least two minutes before repeating', async () => {
  stubBrowser({ stored: 'calm' });
  const m = await freshMotion();
  const dir = 'src/viz';
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsx'));
  let checked = 0;
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const stepMs = Number((src.match(/stepMs:\s*(\d+)/) || [])[1]);
    if (!stepMs) continue;
    assert.match(src, /holdTicks\(\w+\)/, `${f} derives its rest from holdTicks`);
    const pace = Math.max(16, Math.round(stepMs * m.getLevel().stepScale));
    const waitMs = m.holdTicks(withPace(pace, m.PACE_KEY)) * pace;
    assert.ok(waitMs >= 120000, `${f} would repeat after ${Math.round(waitMs / 1000)}s`);
    checked += 1;
  }
  assert.ok(checked >= 9, `expected every viz to be covered, saw ${checked}`);
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
  assert.equal(m.holdTicks(withPace(40, m.PACE_KEY)), 0, 'a still figure holds no repeat timer');
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
  assert.equal(m.getLevelKey(), 'calm');
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
    assert.match(html, /motion: calm/, 'it opens on the calm default');
    assert.match(html, /aria-expanded="false"/, 'the panel starts closed');
    assert.match(html, /<nav class="site-nav"/, 'the rest of the header still renders');
    for (const link of HEADER_LINKS) {
      assert.ok(html.includes(`href="${link.href}"`), `${link.label} is in the shared header`);
      assert.ok(
        html.includes(`nav-pill-${link.tone}`),
        `${link.label} carries its ${link.tone} pill tone`,
      );
    }
    assert.ok(html.includes(`href="${CREATOR_LINK.href}"`), 'the creator footer links to About');
    assert.ok(html.includes(CREATOR_LINK.label), 'the creator footer carries the standard credit');
  } finally {
    fs.rmSync(outfile, { force: true });
  }
});
