import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LIVE_PUZZLES, VITE_ENTRIES } from '../src/data/puzzles.js';

let nonce = 0;
async function loadPage(name) {
  const cacheDir = path.join('node_modules', '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const outfile = path.join(cacheDir, `algonow-${name}-${process.pid}-${nonce++}.mjs`);
  await build({
    entryPoints: [`src/pages/${name}.jsx`], bundle: true, format: 'esm', platform: 'node',
    jsx: 'automatic', outfile,
    loader: { '.css': 'empty' },
    external: ['react', 'react-dom', 'react/jsx-runtime'], logLevel: 'silent',
  });
  const { default: Page } = await import(pathToFileURL(outfile).href);
  return {
    render: () => renderToString(React.createElement(React.StrictMode, null, React.createElement(Page))),
    cleanup: () => fs.rmSync(outfile, { force: true }),
  };
}

for (const name of ['Home', 'Legacy']) {
  test(`${name} prerender remains identical across the build and visitor clocks`, async () => {
    const page = await loadPage(name);
    const realNow = Date.now;
    try {
      Date.now = () => Date.UTC(2026, 9, 10);
      const first = page.render();
      Date.now = () => Date.UTC(2027, 9, 10);
      assert.ok(page.render() === first, 'later visits must hydrate the original markup without a date stamp');
      assert.match(first, /<h1(?:\s[^>]*)?>/, 'the collection heading must be present before JavaScript runs');
    } finally {
      Date.now = realNow;
      page.cleanup();
    }
  });
}

test('legacy prerender preserves every published lesson URL and retires future-pair promises', async () => {
  const page = await loadPage('Legacy');
  try {
    const html = page.render();
    assert.equal(VITE_ENTRIES.legacy, 'legacy/index.html');
    assert.equal((html.match(/class="pair-card"/g) || []).length, LIVE_PUZZLES.length);
    for (const puzzle of LIVE_PUZZLES) {
      assert.ok(html.includes(`href="/${puzzle.slug}/"`), `${puzzle.slug} is missing from the legacy catalog`);
    }
    for (const target of ['/atlas/', '/problem/', '/category/', '#listen']) {
      assert.ok(html.includes(`href="${target}"`), `missing legacy reference link ${target}`);
    }
    assert.match(html, /legacy collection/);
    assert.match(html, /id="pairs"/);
    assert.match(html, /id="listen"/);
    assert.doesNotMatch(html, /pc-today|pc-new|on the bench|new this week|ten new puzzles|data-day=/i);
  } finally {
    page.cleanup();
  }
});
