import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LIVE_SCENARIOS, SCENARIOS, publishedScenarios } from '../src/data/engineering.js';

const cacheFiles = [];
async function loadUiModule(source, name) {
  const cacheDir = path.join('node_modules', '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const outfile = path.join(cacheDir, `algonow-engineering-ui-${name}-${process.pid}.mjs`);
  cacheFiles.push(outfile);
  await build({
    entryPoints: [source], bundle: true, format: 'esm', platform: 'node',
    jsx: 'automatic', outfile, loader: { '.css': 'empty' },
    external: ['react', 'react-dom', 'react/jsx-runtime'], logLevel: 'silent',
  });
  return import(pathToFileURL(outfile).href);
}

let Home;
let ScenarioCatalog;
let ScenarioPage;
before(async () => {
  const [home, page] = await Promise.all([
    loadUiModule('src/pages/Home.jsx', 'home'),
    loadUiModule('src/components/ScenarioPage.jsx', 'page'),
  ]);
  Home = home.default;
  ScenarioCatalog = home.ScenarioCatalog;
  ScenarioPage = page.default;
});
after(() => { for (const file of cacheFiles) fs.rmSync(file, { force: true }); });

const render = (Component, props = {}) => renderToStaticMarkup(React.createElement(Component, props));

// These sentinel fixtures exercise UI contracts only. They are not lessons,
// catalog entries, authored learning scenarios, or publishable content.
const metadata = {
  slug: 'unit-test-card', title: 'Unit test published card', summary: 'UI fixture only.',
  track: 'rag', difficulty: 'advanced', durationMinutes: 45, listenMinutes: 4,
  skills: ['unit-test-marker'], status: 'published',
};
const paragraph = (marker) => React.createElement('p', null, marker);
const content = {
  brief: paragraph('BRIEF_FIXTURE'),
  starter: paragraph('STARTER_FIXTURE'),
  evidence: paragraph('EVIDENCE_FIXTURE'),
  visual: React.createElement('figure', null, React.createElement('figcaption', null, 'VISUAL_FIXTURE')),
  solution: paragraph('SOLUTION_FIXTURE'),
  files: [
    { path: 'fixture_starter.py', role: 'starter', language: 'python', description: 'Unit test starter.', source: 'starter_marker = "STARTER_SOURCE_FIXTURE"' },
    { path: 'fixture_checks.py', role: 'test', language: 'python', description: 'Unit test checks.', source: 'assert True  # CHECK_SOURCE_FIXTURE' },
    { path: 'fixture_data.txt', role: 'data', language: 'text', description: 'Unit test text.', source: '<script>DATA_SOURCE_FIXTURE</script>' },
    { path: 'fixture_reference.py', role: 'reference', language: 'python', description: 'Unit test reference.', source: 'answer_marker = "REFERENCE_SOURCE_FIXTURE"' },
  ],
  tradeoffs: [{ name: 'ALTERNATIVE_FIXTURE', preferWhen: 'PREFERENCE_FIXTURE', cost: 'COST_FIXTURE' }],
};

function sectionHtml(html, id) {
  const section = html.match(new RegExp(`<section id="${id}"[^>]*>([\\s\\S]*?)</section>`));
  assert.ok(section, `missing section ${id}`);
  return section[1];
}

// Check the actual emitted HTML, including nested reference-file disclosures.
// Closed details prevent accidental spoilers; they do not make source private.
function disclosureAncestors(html, marker) {
  const index = html.indexOf(marker);
  assert.notEqual(index, -1, `missing fixture marker ${marker}`);
  const stack = [];
  for (const tag of html.slice(0, index).matchAll(/<\/?details\b[^>]*>/g)) {
    if (tag[0].startsWith('</')) stack.pop();
    else stack.push({ open: /\sopen(?:\s|=|>)/.test(tag[0]) });
  }
  return stack;
}

test('Home reports the published catalog honestly and links classics through the legacy entrance', () => {
  const html = render(Home);
  assert.ok(html.includes(`${LIVE_SCENARIOS.length} published · Python`));
  assert.doesNotMatch(html, /class="pair-card"|new this week|on the bench|pc-today/);
  assert.match(html, /href="\/legacy\/"/);
  assert.match(html, /id="scenarios"/);
  assert.match(html, /id="tracks"/);
  assert.doesNotMatch(html, /class="track-card"/);
  for (const draft of SCENARIOS.filter((scenario) => scenario.status === 'draft')) {
    assert.ok(!html.includes(draft.title), 'draft metadata must stay off Home');
    assert.ok(!html.includes(`/scenarios/${draft.slug}/`), 'draft routes must stay off Home');
  }
  if (LIVE_SCENARIOS.length === 0) {
    assert.doesNotMatch(html, /class="scenario-card"/);
    assert.match(html, /The first AI engineering scenarios are coming/);
    assert.match(html, /Planned practice area/);
  }
});

test('an empty scenario catalog shows no fake cards or unusable filters', () => {
  const html = render(ScenarioCatalog, { scenarios: [] });
  assert.match(html, /0 published · Python/);
  assert.match(html, /class="collection-empty"/);
  assert.match(html, /href="#tracks"/);
  assert.doesNotMatch(html, /class="scenario-card"|<select|type="search"/);
});

test('published scenario metadata produces canonical cards while draft fixtures stay absent', () => {
  const scenarios = publishedScenarios([
    metadata,
    { ...metadata, slug: 'unit-test-second', title: 'Unit test second card', track: 'distillation' },
    { ...metadata, slug: 'unit-test-draft', title: 'DRAFT_CARD_FIXTURE', status: 'draft' },
  ]);
  const html = render(ScenarioCatalog, { scenarios });
  assert.equal((html.match(/class="scenario-card"/g) || []).length, 2);
  assert.match(html, /2 published · Python/);
  assert.match(html, /role="status">2 scenarios/);
  assert.match(html, /href="\/scenarios\/unit-test-card\/"/);
  assert.match(html, /href="\/scenarios\/unit-test-second\/"/);
  assert.match(html, /Retrieval and RAG/);
  assert.match(html, /Distillation/);
  assert.match(html, /advanced · 45 min · Python/);
  assert.match(html, /role="group" aria-label="Practice area"/);
  assert.match(html, /aria-pressed="true">All areas/);
  assert.match(html, /aria-pressed="false">Distillation/);
  assert.match(html, /role="img" aria-label="Retrieval and RAG: Documents to Chunks to Retrieval"/);
  assert.match(html, /aria-label="Skills practiced"><li>unit-test-marker/);
  assert.doesNotMatch(html, /type="search"|>Fine-tuning</);
  assert.doesNotMatch(html, /DRAFT_CARD_FIXTURE|unit-test-draft|class="collection-empty"/);
});

test('a single published scenario gets the wide card without unnecessary filter controls', () => {
  const html = render(ScenarioCatalog, { scenarios: publishedScenarios([metadata]) });
  assert.match(html, /class="scenario-grid" data-count="1"/);
  assert.match(html, /id="tracks"/);
  assert.match(html, /Open scenario/);
  assert.doesNotMatch(html, /aria-pressed|type="search"/);
});

test('search appears as the published collection grows', () => {
  const scenarios = publishedScenarios(Array.from({ length: 4 }, (_, index) => ({ ...metadata, slug: `unit-test-${index}` })));
  const html = render(ScenarioCatalog, { scenarios });
  assert.match(html, /Find a scenario<input type="search"/);
  assert.match(html, /4 published · Python/);
});

test('ScenarioPage renders the brief, evidence, visual, and working files without inventing a player', () => {
  const html = render(ScenarioPage, { scenario: metadata, content });
  for (const id of ['brief', 'visual', 'starter', 'files', 'evidence', 'solution', 'tradeoffs']) {
    const section = sectionHtml(html, id);
    assert.ok(html.includes(`aria-labelledby="${id}-heading"`));
    assert.ok(section.includes(`id="${id}-heading"`));
  }
  for (const marker of ['BRIEF_FIXTURE', 'STARTER_FIXTURE', 'EVIDENCE_FIXTURE', 'VISUAL_FIXTURE']) {
    assert.equal(disclosureAncestors(html, marker).length, 0, `${marker} must be available before revealing an answer`);
  }
  const files = sectionHtml(html, 'files');
  for (const marker of ['fixture_starter.py', 'STARTER_SOURCE_FIXTURE', 'fixture_checks.py', 'CHECK_SOURCE_FIXTURE']) {
    assert.ok(files.includes(marker), `working files must include ${marker}`);
  }
  assert.match(files, /&lt;script&gt;DATA_SOURCE_FIXTURE&lt;\/script&gt;/);
  assert.doesNotMatch(files, /<script>|REFERENCE_SOURCE_FIXTURE|fixture_reference\.py/);
  assert.doesNotMatch(html, /<audio|class="listen-player|Text Narration/);
});

test('reference code, solution reasoning, and tradeoffs require closed native disclosures', () => {
  const html = render(ScenarioPage, { scenario: metadata, content });
  for (const marker of ['SOLUTION_FIXTURE', 'REFERENCE_SOURCE_FIXTURE', 'ALTERNATIVE_FIXTURE', 'PREFERENCE_FIXTURE', 'COST_FIXTURE']) {
    const ancestors = disclosureAncestors(html, marker);
    assert.ok(ancestors.length > 0, `${marker} must be inside a disclosure`);
    assert.ok(ancestors.every((ancestor) => !ancestor.open), `${marker} must start concealed`);
    assert.equal(html.split(marker).length - 1, 1, `${marker} must not be duplicated outside its disclosure`);
  }
  assert.equal(disclosureAncestors(html, 'REFERENCE_SOURCE_FIXTURE').length, 2, 'reference file stays inside the solution disclosure');
  const solution = sectionHtml(html, 'solution');
  assert.match(solution, /<details><summary>Reveal the solution and reasoning<\/summary>/);
  assert.match(solution, /fixture_reference\.py/);
  assert.match(solution, /REFERENCE_SOURCE_FIXTURE/);
  assert.match(sectionHtml(html, 'tradeoffs'), /<details><summary>Reveal the engineering tradeoffs<\/summary>/);
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:\s|=|>)/);
});

test('ScenarioPage passes the preserved-player configuration through unchanged', () => {
  const manifest = { source_sha256: 'unit-test-manifest-marker' };
  const narration = [{ section: 'brief', text: 'UNIT_TEST_NARRATION_FIXTURE' }];
  let received;
  function PlayerFixture(props) {
    received = props;
    return React.createElement('div', { 'data-player-fixture': true }, 'UNIT_TEST_PLAYER_FIXTURE');
  }
  const html = render(ScenarioPage, {
    scenario: metadata, content,
    narrationPlayer: { Component: PlayerFixture, manifest, narration, mediaBaseUrl: 'https://media.example.test' },
  });
  assert.match(html, /UNIT_TEST_PLAYER_FIXTURE/);
  assert.equal(received.manifest, manifest);
  assert.equal(received.narration, narration);
  assert.equal(received.mediaBaseUrl, 'https://media.example.test');
  assert.equal(received.listenMinutes, metadata.listenMinutes);
  assert.equal(received.label, `Listen to ${metadata.title}`);
});

test('primary files show the worked solution first and keep practice optional', () => {
  const primaryContent = { ...content, files: content.files.map(file =>
    file.role === 'starter' || file.role === 'reference'
      ? { ...file, path: `python/src/example/${file.path}`, primary: true } : file) };
  const html = render(ScenarioPage, { scenario: metadata, content: primaryContent });
  const starter = sectionHtml(html, 'starter');
  const solution = sectionHtml(html, 'solution');
  const files = sectionHtml(html, 'files');
  assert.match(starter, /STARTER_SOURCE_FIXTURE/);
  for (const marker of ['STARTER_FIXTURE', 'STARTER_SOURCE_FIXTURE']) {
    assert.deepEqual(disclosureAncestors(html, marker), [{ open: false }], 'practice instructions and code start collapsed together');
  }
  for (const marker of ['REFERENCE_SOURCE_FIXTURE', 'SOLUTION_FIXTURE']) {
    assert.deepEqual(disclosureAncestors(html, marker), [{ open: true }], 'complete code and explanation are visible by default');
  }
  assert.match(starter, /Practice this pattern/);
  assert.match(starter, /<details><summary>Open optional practice<\/summary>/);
  assert.match(solution, /<details open=""><summary>Complete Python code and explanation<\/summary>/);
  assert.match(html, /href="#solution">Worked solution<\/a>/);
  assert.deepEqual([...html.matchAll(/<section id="([^"]+)"/g)].map(match => match[1]),
    ['brief', 'solution', 'visual', 'evidence', 'tradeoffs', 'starter', 'files']);
  assert.doesNotMatch(sectionHtml(html, 'tradeoffs'), /<details/);
  for (const marker of ['ALTERNATIVE_FIXTURE', 'PREFERENCE_FIXTURE', 'COST_FIXTURE']) {
    assert.equal(disclosureAncestors(html, marker).length, 0, 'architectural comparisons stay visible');
  }
  assert.doesNotMatch(files, /STARTER_SOURCE_FIXTURE|REFERENCE_SOURCE_FIXTURE/);
  assert.match(files, /Optional full project/);
  for (const file of primaryContent.files.filter(file => file.primary)) {
    const section = file.role === 'starter' ? starter : solution;
    const href = section.match(/href="(data:text\/plain;charset=utf-8,[^"]+)"/)[1];
    assert.equal(decodeURIComponent(href.split(',')[1]), file.source);
    assert.ok(section.includes(`download="${file.path.split('/').pop()}"`));
  }
  assert.match(files, /href="\/downloads\/unit-test-card-project.zip" download="">Download full project ZIP \(includes solution\)<\/a>/);
  assert.equal(disclosureAncestors(html, '/downloads/unit-test-card-project.zip').length, 0);
  assert.equal((html.match(/<details[^>]*\sopen(?:\s|=|>)/g) || []).length, 1);
});

test('primary mode omits supporting source, descriptions, and path inventories entirely', () => {
  const primaryContent = { ...content, files: [
    ...content.files.map(file => file.role === 'starter' || file.role === 'reference'
      ? { ...file, path: `python/src/example/${file.path}`, primary: true } : file),
    { path: 'python/src/example/pipeline.py', role: 'reference', language: 'python', description: 'SUPPORT_DESCRIPTION_FIXTURE', source: '# SUPPORT_REFERENCE_FIXTURE' },
  ] };
  const html = render(ScenarioPage, { scenario: metadata, content: primaryContent });
  for (const file of primaryContent.files.filter(file => !file.primary)) {
    assert.ok(!html.includes(file.path), `support path must not render: ${file.path}`);
    assert.ok(!html.includes(file.description), 'support descriptions must not render');
  }
  assert.doesNotMatch(html, /CHECK_SOURCE_FIXTURE|DATA_SOURCE_FIXTURE|SUPPORT_REFERENCE_FIXTURE|Working files|Explore supporting files/);
  assert.doesNotMatch(html, /python\/src\/example\//, 'primary files use simple download names, without project paths');
  assert.equal((html.match(/class="code-block"/g) || []).length, 2, 'only the worked solution and optional practice code appear');
});
