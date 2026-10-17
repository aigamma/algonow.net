// Prerender both collection pages from their real React trees. Neither page
// depends on the current day, so client hydration needs no date stamp.
// Run after Vite; lesson pages retain their existing client entry points.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import React from 'react';
import { renderToString } from 'react-dom/server';

const PAGES = [
  { name: 'home', source: 'src/pages/Home.jsx', html: 'dist/index.html' },
  { name: 'legacy', source: 'src/pages/Legacy.jsx', html: 'dist/legacy/index.html' },
];
const ROOT_TAG = '<div id="root"></div>';
let failures = 0;

for (const page of PAGES) {
  const bundle = `dist/.${page.name}-ssr.mjs`;
  try {
    await build({
      entryPoints: [page.source], bundle: true, format: 'esm', platform: 'node',
      jsx: 'automatic', outfile: bundle,
      // Vite links the production CSS. Server rendering only needs the tree.
      loader: { '.css': 'empty' },
      external: ['react', 'react-dom', 'react/jsx-runtime'], logLevel: 'silent',
    });
    const { default: Page } = await import(pathToFileURL(bundle).href);
    const markup = renderToString(React.createElement(React.StrictMode, null, React.createElement(Page)));
    const html = readFileSync(page.html, 'utf8');
    if (!html.includes(ROOT_TAG)) throw new Error(`${page.html} has no empty root to fill`);
    if (!/<h1(?:\s[^>]*)?>/.test(markup)) throw new Error('rendered markup has no h1');

    // Prerendered HTML can paint before JavaScript arrives. Keep modulepreloads
    // discoverable while yielding network priority to the stylesheet.
    const preloads = (html.match(/<link rel="modulepreload"[^>]*>/g) || []).length;
    const filled = html.replace(/<link rel="modulepreload"/g, '<link rel="modulepreload" fetchpriority="low"')
      .replace(ROOT_TAG, `<div id="root">${markup}</div>`);
    writeFileSync(page.html, filled);
    const gz = (gzipSync(Buffer.from(filled)).length / 1024).toFixed(1);
    console.log(`PASS prerender ${page.name}: ${markup.length} markup characters, ${preloads} preloads at low priority, ${gz}KB gz page`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL prerender ${page.name}: ${error.message}`);
  } finally {
    rmSync(bundle, { force: true });
    rmSync(bundle.replace(/\.mjs$/, '.css'), { force: true });
  }
}

process.exitCode = failures ? 1 : 0;
