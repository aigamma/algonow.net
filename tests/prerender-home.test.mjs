// The homepage ships its markup prerendered, and the browser hydrates it. That
// only works while one property holds: the markup is a function of the stamped
// day and nothing else. If any part of the page reads the wall clock during
// render, the prerendered HTML and the first client render disagree, React
// throws the prerender away, re-renders the whole tree, and logs a console
// error, which costs the paint we bought and an audit besides. So the property
// is tested rather than assumed.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { LIVE_PUZZLES } from '../src/data/puzzles.js';

let nonce = 0;

async function loadHome(t) {
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    t.skip('esbuild unavailable');
    return null;
  }
  // Inside the project so the bundle's `react` import resolves normally.
  const cacheDir = path.join('node_modules', '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const outfile = path.join(cacheDir, `algonow-home-${process.pid}-${nonce++}.mjs`);
  await esbuild.build({
    entryPoints: ['src/pages/Home.jsx'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    outfile,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    logLevel: 'silent',
  });
  const [{ default: React }, { renderToString }, mod] = await Promise.all([
    import('react'),
    import('react-dom/server'),
    import(pathToFileURL(outfile).href),
  ]);
  return {
    render: (day) =>
      renderToString(
        React.createElement(React.StrictMode, null, React.createElement(mod.default, { day })),
      ),
    cleanup: () => fs.rmSync(outfile, { force: true }),
  };
}

const DAY = 20700; // a fixed day, so the expectations here never drift

test('the prerendered homepage is a function of its stamped day, not of the clock', async (t) => {
  const home = await loadHome(t);
  if (!home) return;
  const realNow = Date.now;
  try {
    const first = home.render(DAY);
    // Set the clock TO the stamped day. This is the pair of readings that has
    // teeth: the new-puzzle window is open on one side of it and shut on the
    // other, so a render path that reaches for the clock instead of the day it
    // was handed produces visibly different markup here.
    Date.now = () => DAY * 86400000 + 3600000;
    const onThatDay = home.render(DAY);
    assert.equal(
      onThatDay,
      first,
      'same day, different clock: the markup must be identical or hydration discards it',
    );
    // And a visitor arriving long after the build, the normal case for a static
    // deploy, must still get exactly what was prerendered.
    Date.now = () => realNow() + 45 * 86400000;
    assert.equal(home.render(DAY), first, 'a stale deploy must still render its stamped day');
  } finally {
    Date.now = realNow;
    home.cleanup();
  }
});

test('the prerendered homepage carries the whole catalog and an LCP heading', async (t) => {
  const home = await loadHome(t);
  if (!home) return;
  try {
    const html = home.render(DAY);
    assert.match(html, /<h1>/, 'the hero heading is the largest paint, so it must be in the HTML');
    for (const p of LIVE_PUZZLES) {
      assert.ok(
        html.includes(`href="/${p.slug}/"`),
        `${p.slug} is missing from the prerendered homepage`,
      );
    }
  } finally {
    home.cleanup();
  }
});

test('the daily pair advances with the day', async (t) => {
  const home = await loadHome(t);
  if (!home) return;
  try {
    const today = home.render(DAY);
    const tomorrow = home.render(DAY + 1);
    const pick = (html) => html.match(/pc-today[\s\S]*?<h3>([\s\S]*?)<\/h3>/)?.[1] ?? null;
    assert.ok(pick(today), 'the today card renders a pair title');
    assert.notEqual(
      pick(tomorrow),
      pick(today),
      'a new day must select a new pair, which is what the client corrects after hydration',
    );
  } finally {
    home.cleanup();
  }
});
