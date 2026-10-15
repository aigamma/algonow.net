import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('diagram enlargement is reversible, keyboard accessible, and does not move its controls', async (t) => {
  const outfile = path.resolve(`node_modules/.cache/diagram-interaction-${process.pid}.mjs`);
  await build({
    entryPoints: ['src/components/DiagramViewport.jsx'], bundle: true, format: 'esm', platform: 'node',
    jsx: 'automatic', outfile, external: ['react/jsx-runtime'], logLevel: 'silent',
    plugins: [{ name: 'controlled-hooks', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'hooks', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
        export const useState = () => [globalThis.__diagramTest.enlarged, (fn) => { globalThis.__diagramTest.enlarged = fn(globalThis.__diagramTest.enlarged); }];
        export const useRef = () => globalThis.__diagramTest.viewportRef;
        export const useId = () => 'diagram-test';
      ` }));
    } }],
  });
  globalThis.__diagramTest = { enlarged: false, viewportRef: { current: { scrollLeft: 0 } } };
  t.after(() => { fs.rmSync(outfile, { force: true }); delete globalThis.__diagramTest; });
  const { default: DiagramViewport } = await import(pathToFileURL(outfile).href);
  const render = () => DiagramViewport({ width: 640, children: React.createElement('canvas') });
  let tree = render();
  let [toolbar, scroll] = tree.props.children;
  let button = toolbar.props.children[0];
  assert.equal(button.props.children, 'Enlarge diagram');
  assert.equal(button.props['aria-controls'], scroll.props.id);
  assert.equal(scroll.props.tabIndex, undefined);
  button.props.onClick();
  tree = render();
  [toolbar, scroll] = tree.props.children;
  button = toolbar.props.children[0];
  assert.equal(button.props['aria-pressed'], true);
  assert.equal(button.props.children, 'Fit diagram to page');
  assert.equal(scroll.props.tabIndex, 0);
  assert.equal(scroll.props['aria-describedby'], toolbar.props.children[1].props.id);
  assert.equal(scroll.props.children.props.children.type, 'canvas', 'the scroll region contains only the drawing');
  assert.equal(scroll.props.children.props.style['--diagram-detail-width'], '1200px');
  globalThis.__diagramTest.viewportRef.current.scrollLeft = 500;
  button.props.onClick();
  assert.equal(globalThis.__diagramTest.viewportRef.current.scrollLeft, 0);
  assert.equal(render().props.children[0].props.children[0].props['aria-pressed'], false);
});

test('static figures retain caption and SVG accessibility outside the scroll area with unique control targets', async (t) => {
  const outfile = path.resolve(`node_modules/.cache/diagram-figure-${process.pid}.mjs`);
  await build({ entryPoints: ['src/components/Figure.jsx'], bundle: true, format: 'esm', platform: 'node',
    jsx: 'automatic', outfile, external: ['react', 'react/jsx-runtime'], logLevel: 'silent' });
  t.after(() => fs.rmSync(outfile, { force: true }));
  const { default: Figure } = await import(pathToFileURL(outfile).href);
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, ...[1, 2].map((id) => (
    React.createElement(Figure, { key: id, id: `figure-${id}`, caption: `Explanation ${id}` },
      React.createElement('svg', { viewBox: '0 0 640 320', role: 'img', 'aria-label': `Diagram ${id}` }))
  ))));
  const targets = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(targets).size, 2);
  for (const id of targets) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /role="img" aria-label="Diagram 1"/);
  assert.match(html, /<\/svg><\/div><\/div><\/div><figcaption/);
  assert.match(html, /Explanation 2/);
});
