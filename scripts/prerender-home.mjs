// Prerender the homepage's React tree into dist/index.html.
//
// Why: the homepage shipped as an empty <div id="root">, so nothing appeared
// until React, the vendor chunk, and the 114-pair registry had all downloaded,
// parsed, and run. Vite already preloads those in parallel, so the cost is not
// a request waterfall, it is simply that first paint waited on ~80KB of
// JavaScript. Measured against algonow.net on a throttled phone profile, the
// prerendered reference surface at /problem/ painted at 1568ms while this page
// painted at 2422ms: 854ms spent waiting for a framework to draw markup that
// never changes between visitors. Lighthouse's Speed Index is a blend that
// weights the observed number at 1.4, so that gap alone was worth roughly 1.2
// seconds of Speed Index and the difference between 98 and 100 on mobile.
//
// This emits markup, not a second implementation: the same components render
// here and in the browser, and main.jsx hydrates what lands. Hydration only
// keeps prerendered markup when the first client render reproduces it exactly,
// so the day this HTML was rendered for is stamped onto #root and the client
// opens on it. See src/lib/day.js.
//
// Run after `vite build`. Rewrites dist/index.html in place.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { dayNow } from '../src/lib/day.js';

const PAGE = 'dist/index.html';
const ROOT_TAG = '<div id="root"></div>';
const BUNDLE = 'dist/.home-ssr.mjs';

let failures = 0;
const ok = (msg) => console.log(`PASS ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL ${msg}`);
};

const esbuild = await import('esbuild');

// Bundle the page for node with React left external, the same shape the
// motion test uses, so the SSR pass runs the real component tree rather than a
// copy of it.
await esbuild.build({
  entryPoints: ['src/pages/Home.jsx'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  outfile: BUNDLE,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  logLevel: 'silent',
});

try {
  const [{ default: React }, { renderToString }, page] = await Promise.all([
    import('react'),
    import('react-dom/server'),
    import(pathToFileURL(BUNDLE).href),
  ]);

  const day = dayNow();
  // StrictMode here too: it does not change the output, but the client tree is
  // wrapped in it and the two trees should differ in nothing at all.
  const markup = renderToString(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(page.default, { day }),
    ),
  );

  const html = readFileSync(PAGE, 'utf8');
  if (!html.includes(ROOT_TAG)) {
    fail(`prerender home: ${PAGE} has no ${ROOT_TAG} to fill`);
  } else if (!markup.includes('<h1>')) {
    fail('prerender home: rendered markup carries no <h1>, refusing to ship it');
  } else {
    const filled = html.replace(
      ROOT_TAG,
      `<div id="root" data-day="${day}">${markup}</div>`,
    );
    writeFileSync(PAGE, filled);
    const gz = (gzipSync(Buffer.from(filled)).length / 1024).toFixed(1);
    ok(`prerender home: day ${day}, ${markup.length} bytes of markup, ${gz}KB gz page`);
  }
} finally {
  rmSync(BUNDLE, { force: true });
}

process.exit(failures ? 1 : 0);
