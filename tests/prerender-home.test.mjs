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
import { CATEGORIES } from '../src/data/atlas-categories.js';

// The same grouping Home builds, rebuilt here rather than exported, so the test
// would notice if the page quietly started grouping by something else.
const homeGroups = () =>
  CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    pairs: LIVE_PUZZLES.filter((p) => p.category === c.key),
  })).filter((g) => g.pairs.length > 0);

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
    // Home.jsx is JSX, so its plain exports come off the bundle rather than
    // from a second import node could not resolve.
    FIRST_PAINT_CARDS: mod.FIRST_PAINT_CARDS,
    openingGroups: mod.openingGroups,
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

test('the prerendered homepage opens with a heading and a bounded slice of catalog', async (t) => {
  const home = await loadHome(t);
  if (!home) return;
  try {
    const html = home.render(DAY);
    assert.match(html, /<h1>/, 'the hero heading is the largest paint, so it must be in the HTML');

    // The slice is what keeps first paint fast on a slow phone. Assert the
    // contract, not a byte count: dist/index.html's gzip ceiling in check.mjs
    // is what watches the actual size, and this watches the rule that produces
    // it. The count is taken from the groups rather than from the HTML because
    // the today card, the bench cards, and the new-this-week grid all render
    // pair cards of their own and none of them are the catalog.
    const groups = homeGroups();
    const opening = home.openingGroups(groups);
    const openingCards = opening.reduce((n, g) => n + g.pairs.length, 0);
    assert.ok(opening.length >= 1, 'at least one category always opens inline');
    assert.ok(
      openingCards <= home.FIRST_PAINT_CARDS || opening.length === 1,
      `the opening slice carries ${openingCards} cards, past the ${home.FIRST_PAINT_CARDS} budget`,
    );
    if (LIVE_PUZZLES.length > home.FIRST_PAINT_CARDS) {
      assert.ok(
        opening.length < groups.length,
        'a catalog past the budget must not all be prerendered inline',
      );
    }
    for (const p of opening.flatMap((g) => g.pairs)) {
      assert.ok(html.includes(`href="/${p.slug}/"`), `${p.slug} should be in the opening slice`);
    }
  } finally {
    home.cleanup();
  }
});

// Nothing may be orphaned by the split: a category the HTML does not render
// still has to be reachable without JavaScript, which is what the strip's
// fallback to the prerendered /category/ page is for.
test('every category is reachable from the prerendered homepage', async (t) => {
  const home = await loadHome(t);
  if (!home) return;
  try {
    const html = home.render(DAY);
    const groups = homeGroups();
    const inline = new Set(home.openingGroups(groups).map((g) => g.key));
    for (const g of groups) {
      const target = inline.has(g.key) ? `id="cat-${g.key}"` : `href="/category/${g.key}/"`;
      assert.ok(html.includes(target), `category ${g.key} has no way in (${target})`);
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
