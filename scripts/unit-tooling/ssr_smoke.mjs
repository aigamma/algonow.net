// Server-render every live puzzle page numbered >= FROM through the real
// PuzzlePage component with its real content module, registry record, and
// installed manifest (a stub player component stands in for the lazy
// preserved player). A throw or an empty render is a page that would also
// fail in the browser; the build never executes this code, so this is the
// closest thing to a render oracle without a browser.
// Usage: node ssr_smoke.mjs [--from 164]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const FROM = Number(args[args.indexOf('--from') + 1] || 164);
const esbuild = await import(pathToFileURL(path.resolve('node_modules/esbuild/lib/main.js')).href);
const reg = fs.readFileSync('src/data/puzzles.js', 'utf8');
const units = [];
for (const m of reg.matchAll(/^  '\/([a-z0-9-]+)\/': \{([\s\S]*?)\n  \},/gm)) {
  const num = Number((m[2].match(/number:\s*(\d+)/) || [])[1]);
  if (num >= FROM) units.push({ slug: m[1], number: num });
}
units.sort((a, b) => a.number - b.number);
const cacheDir = path.join('node_modules', '.cache', 'algonow-ssr-smoke');
fs.mkdirSync(cacheDir, { recursive: true });
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');
let bad = 0;
for (const u of units) {
  const entry = path.join(cacheDir, `${u.slug}.entry.jsx`);
  fs.writeFileSync(entry, `
import PuzzlePage from '../../../src/components/PuzzlePage.jsx';
import { PUZZLES } from '../../../src/data/puzzles.js';
import { content } from '../../../src/content/${u.slug}.jsx';
import manifest from '../../../src/data/narration/${u.slug}.json';
export { PuzzlePage, PUZZLES, content, manifest };
`);
  const outfile = path.join(cacheDir, `${u.slug}.bundle.mjs`);
  try {
    await esbuild.build({
      entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', outfile,
      external: ['react', 'react-dom', 'react/jsx-runtime'], loader: { '.py': 'text', '.css': 'empty' }, logLevel: 'silent',
    });
    const mod = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
    const puzzle = mod.PUZZLES[`/${u.slug}/`];
    if (!puzzle) throw new Error('registry record missing');
    const Stub = () => React.createElement('div', { className: 'stub-player' }, 'player');
    const html = renderToStaticMarkup(React.createElement(mod.PuzzlePage, {
      puzzle, content: mod.content,
      narrationPlayer: { Component: Stub, manifest: mod.manifest, mediaBaseUrl: 'https://d1odatz89tx6pl.cloudfront.net' },
    }));
    const probs = [];
    if (html.length < 5000) probs.push(`short render ${html.length} chars`);
    if (!html.includes(puzzle.algorithm.replace(/&/g, '&amp;').replace(/'/g, '&#x27;'))) probs.push('algorithm name not rendered');
    if (!/rivals|rival/i.test(html)) probs.push('no rivals section');
    if (!html.includes('stub-player')) probs.push('player slot not rendered');
    if (/undefined|NaN|\[object Object\]/.test(html.replace(/[A-Za-z]undefined/g, ''))) probs.push('undefined/NaN text in render');
    if (probs.length) bad += 1;
    console.log(`${u.number} ${u.slug} ${probs.length ? 'PROBLEMS: ' + probs.join(' | ') : 'OK ' + html.length + ' chars'}`);
  } catch (e) {
    bad += 1;
    console.log(`${u.number} ${u.slug} THROWS: ${String(e.message || e).split('\n')[0].slice(0, 300)}`);
  }
}
console.log(`\n${units.length - bad} of ${units.length} pages render`);
