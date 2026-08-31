import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_NARRATION_RATE,
  NARRATION_RATES,
  chooseNarrationRate,
  chooseNarrationVoice,
  clampMediaTime,
  formatNarrationRate,
  formatNarrationTime,
  mediaProgressRatio,
  narrationManifestProblem,
  sectionStartTime,
  seekBySeconds,
  timeAtProgressRatio,
  usableNarrationTracks,
} from '../src/lib/preservedNarrationPlayer.js';
import { mediaUrl } from '../src/config/media.js';

const manifest = {
  schema_version: 1,
  content_id: 'puzzle:kalman-covariance-correction',
  source_sha256: 'a'.repeat(64),
  recipe_sha256: 'b'.repeat(64),
  release_sha256: 'c'.repeat(64),
  default_voice: 'aoede',
  default_rate: 1.25,
  source_characters: 1200,
  tracks: {
    aoede: {
      label: 'Aoede',
      gender: 'female',
      voice_id: 'en-US-Chirp3-HD-Aoede',
      object_key: 'narration/v1/puzzles/kalman test/aoede-file.mp3',
      duration_seconds: 100,
      section_starts: { puzzle: 4, origins: 23.5 },
    },
    algieba: {
      label: 'Algieba',
      gender: 'male',
      voice_id: 'en-US-Chirp3-HD-Algieba',
      object_key: 'narration/v1/puzzles/kalman test/algieba-file.mp3',
      duration_seconds: 104,
      section_starts: { puzzle: 4.2, origins: 24.1 },
    },
  },
};

const narration = [
  { section: 'puzzle', text: 'First authored paragraph.' },
  { section: 'origins', text: 'Second authored paragraph.' },
  { section: 'tradeoffs', text: 'Third authored paragraph.' },
];

test('the user-selected rate menu and defaults are exact', () => {
  assert.deepEqual(NARRATION_RATES, [1, 1.25, 1.5, 1.75]);
  assert.equal(DEFAULT_NARRATION_RATE, 1.25);
  assert.deepEqual(NARRATION_RATES.map(formatNarrationRate), [
    '1.00x',
    '1.25x',
    '1.50x',
    '1.75x',
  ]);
  assert.equal(chooseNarrationRate(1.25), 1.25);
  assert.equal(chooseNarrationRate(2), 1.25, 'the retired 2x value is rejected');
  assert.equal(chooseNarrationRate(0.8), 1.25, 'the SpokenHistory slow rate is not in this pilot');
});

test('Aoede is the female default and Algieba remains available', () => {
  const tracks = usableNarrationTracks(manifest);
  assert.deepEqual(tracks.map((track) => track.id), ['aoede', 'algieba']);
  assert.equal(chooseNarrationVoice(tracks, manifest.default_voice), 'aoede');
  assert.equal(tracks[0].gender, 'female');
  assert.equal(tracks[1].gender, 'male');
});

test('seek, ratio, clock, and section helpers clamp predictably', () => {
  assert.equal(clampMediaTime(-8, 60), 0);
  assert.equal(clampMediaTime(80, 60), 60);
  assert.equal(seekBySeconds(8, -15, 60), 0);
  assert.equal(seekBySeconds(55, 15, 60), 60);
  assert.equal(mediaProgressRatio(25, 100), 0.25);
  assert.equal(timeAtProgressRatio(0.25, 104), 26);
  assert.equal(formatNarrationTime(65.9), '1:05');
  assert.equal(formatNarrationTime(3661), '1:01:01');

  const tracks = usableNarrationTracks(manifest);
  assert.equal(sectionStartTime(tracks[0], 'origins', 100), 23.5);
  const withoutCues = { ...tracks[0], sectionStarts: {} };
  assert.equal(sectionStartTime(withoutCues, 'origins', 100), null);
});

test('deployable manifests require both exact voices and a credential-free HTTPS origin', () => {
  assert.equal(narrationManifestProblem(manifest, 'https://media.example.test'), '');
  assert.match(narrationManifestProblem(manifest, ''), /VITE_MEDIA_BASE_URL/);
  assert.match(
    narrationManifestProblem({
      ...manifest,
      tracks: { aoede: manifest.tracks.aoede },
    }, 'https://media.example.test'),
    /both preserved Aoede and Algieba/,
  );
  assert.match(
    narrationManifestProblem({
      ...manifest,
      tracks: { ...manifest.tracks, spare: manifest.tracks.aoede },
    }, 'https://media.example.test'),
    /both preserved Aoede and Algieba/,
  );
  assert.match(
    narrationManifestProblem(manifest, 'https://user:secret@media.example.test'),
    /credential-free HTTPS origin/,
  );
});

test('media URLs encode each immutable object-key segment', () => {
  assert.equal(
    mediaUrl('narration/v1/kalman test/aoede-file.mp3', 'https://media.example.test/'),
    'https://media.example.test/narration/v1/kalman%20test/aoede-file.mp3',
  );
  assert.equal(mediaUrl('narration/v1/x.mp3', ''), '');
});

test('collapsed and expanded player markup preserve lazy media and control order', async (t) => {
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    return t.skip('esbuild unavailable');
  }

  const cacheDir = path.join('node_modules', '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const outfile = path.join(cacheDir, `algonow-preserved-player-${process.pid}.mjs`);
  await esbuild.build({
    entryPoints: ['src/components/PreservedListenPlayer.jsx'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    outfile,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    define: { 'import.meta.env.VITE_MEDIA_BASE_URL': '""' },
    logLevel: 'silent',
  });

  try {
    const [{ default: React }, { renderToStaticMarkup }, mod] = await Promise.all([
      import('react'),
      import('react-dom/server'),
      import(`${pathToFileURL(outfile).href}?t=${Date.now()}`),
    ]);

    const collapsed = renderToStaticMarkup(
      React.createElement(mod.default, {
        label: 'Listen to Kalman',
        listenMinutes: 8,
        manifest,
        mediaBaseUrl: 'https://media.example.test',
        narration,
      }),
    );
    assert.match(collapsed, /aria-expanded="false"/);
    assert.match(collapsed, /aria-controls="([^"]+)"/);
    const controlledId = collapsed.match(/aria-controls="([^"]+)"/)[1];
    assert.ok(collapsed.includes(`id="${controlledId}"`), 'the controlled panel exists while closed');
    assert.match(collapsed, /hidden=""/);
    assert.doesNotMatch(collapsed, /<audio/, 'closed disclosure mounts no media element');

    const expanded = renderToStaticMarkup(
      React.createElement(mod.NarrationTransport, {
        label: 'Listen to Kalman',
        manifest: { ...manifest, default_voice: 'algieba', default_rate: 1.75 },
        mediaBaseUrl: 'https://media.example.test',
        narration,
        onClose: () => {},
        sectionRequest: null,
      }),
    );
    assert.match(expanded, /<audio[^>]+preload="metadata"/);
    assert.match(expanded, /aoede-file\.mp3/);
    assert.doesNotMatch(expanded, /algieba-file\.mp3/, 'only the selected voice is attached');
    assert.match(expanded, /Voice: Aoede, female/);
    assert.match(
      expanded,
      /<option value="1\.25" selected="">1\.25x<\/option>/,
      'the UI enforces 1.25x even when a manifest asks for another default',
    );
    assert.match(expanded, />1\.00x</);
    assert.match(expanded, />1\.25x</);
    assert.match(expanded, />1\.50x</);
    assert.match(expanded, />1\.75x</);
    assert.doesNotMatch(expanded, />0\.8x</);
    assert.doesNotMatch(expanded, />2\.00x</);

    const rewindAt = expanded.indexOf('aria-label="Rewind 15 seconds"');
    const playAt = expanded.indexOf('aria-label="Play narration"');
    const forwardAt = expanded.indexOf('aria-label="Forward 15 seconds"');
    const speedAt = expanded.indexOf('aria-label="Narration playback speed"');
    assert.ok(rewindAt < playAt && playAt < forwardAt && forwardAt < speedAt);
  } finally {
    fs.rmSync(outfile, { force: true });
  }
});
