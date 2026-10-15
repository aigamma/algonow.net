import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('corrected lessons with stale recordings cannot mount either narration player', async (t) => {
  const correctedHash = 'a'.repeat(64);
  const staleHash = 'b'.repeat(64);
  const cacheDir = path.join('node_modules', '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const outfile = path.join(cacheDir, `algonow-narration-revisions-${process.pid}.mjs`);
  await build({
    entryPoints: ['src/components/PuzzlePage.jsx'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    outfile,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    logLevel: 'silent',
    plugins: [{
      name: 'narration-revision-fixtures',
      setup(buildContext) {
        buildContext.onLoad({ filter: /narration-revisions\.json$/ }, () => ({
          contents: JSON.stringify({ 'corrected-lesson': correctedHash }),
          loader: 'json',
        }));
        buildContext.onLoad({ filter: /[/\\]ListenPlayer\.jsx$/ }, () => ({
          contents: 'export default function BrowserPlayer() { return "browser-player-mounted"; }',
          loader: 'js',
        }));
      },
    }],
  });
  t.after(() => fs.rmSync(outfile, { force: true }));
  const { default: PuzzlePage } = await import(pathToFileURL(outfile).href);
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  globalThis.window = { speechSynthesis: {}, SpeechSynthesisUtterance: class {} };
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  });

  const puzzle = {
    slug: 'corrected-lesson', number: 1, algorithm: 'Test algorithm', heuristic: 'Test rule',
    domain: 'Test', oneLiner: 'Corrected text is available.', listenMinutes: 1,
    time: 'O(n)', space: 'O(1)', baseline: 'Baseline',
  };
  const content = {
    given: 'Input', task: 'Task', constraint: 'Constraint', steps: [], signals: [], rivals: [],
    contest: { columns: [], rows: [] }, code: 'pass', filename: 'example.py',
    Viz: () => null, narration: [{ section: 'puzzle', text: 'Corrected narration.' }],
  };
  let preservedMounts = 0;
  function PreservedPlayer() {
    preservedMounts += 1;
    return 'preserved-player-mounted';
  }
  const render = ({ slug = puzzle.slug, hash = staleHash, player = true } = {}) => (
    renderToStaticMarkup(React.createElement(PuzzlePage, {
      puzzle: { ...puzzle, slug },
      content,
      narrationPlayer: player ? {
        Component: PreservedPlayer, manifest: hash ? { source_sha256: hash } : {},
      } : null,
    }))
  );

  for (const options of [{}, { hash: null }, { player: false }]) {
    const html = render(options);
    assert.match(html, /Recorded narration is awaiting an update after a lesson correction/);
    assert.match(html, /Corrected text is available/);
    assert.doesNotMatch(html, /(?:browser|preserved)-player-mounted/);
    assert.doesNotMatch(html, /Listen from the/);
    assert.doesNotMatch(html, /class="btn btn-listen"/);
  }
  assert.equal(preservedMounts, 0, 'stale audio never reaches the preserved player component');

  const refreshed = render({ hash: correctedHash });
  assert.match(refreshed, /preserved-player-mounted/);
  assert.doesNotMatch(refreshed, /awaiting an update|browser-player-mounted/);
  assert.equal(preservedMounts, 1);

  const unchanged = render({ slug: 'unchanged-lesson' });
  assert.match(unchanged, /preserved-player-mounted/);
  assert.doesNotMatch(unchanged, /awaiting an update|browser-player-mounted/);

  const legacy = render({ slug: 'legacy-lesson', player: false });
  assert.match(legacy, /browser-player-mounted/);
  assert.match(legacy, /Listen from the/);
  assert.match(legacy, /class="btn btn-listen"/);
  assert.doesNotMatch(legacy, /awaiting an update|preserved-player-mounted/);
});
