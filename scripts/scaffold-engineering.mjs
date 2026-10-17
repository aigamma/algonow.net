// Generate only route plumbing for a Fable-authored registry entry.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENARIOS, scenarioPaths } from '../src/data/engineering.js';

const ROOT = fileURLToPath(new URL('..',import.meta.url));
const escapeHtml = value => String(value).replace(/[&<>"']/g,character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function scenarioEntrySources(scenario) {
  const paths = scenarioPaths(scenario.slug);
  if (!scenario.title || !scenario.summary) throw new Error('Registry title and summary are required before scaffolding');
  return {
    [paths.html]: `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(scenario.title)} | algonow</title>
<meta name="description" content="${escapeHtml(scenario.summary)}" />
<link rel="canonical" href="https://algonow.net${paths.href}" />
</head><body><div id="root"></div><script type="module" src="./main.jsx"></script></body></html>
`,
    [paths.main]: `import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/theme.css';
import ScenarioPage from '../../src/components/ScenarioPage.jsx';
import { SCENARIOS, scenarioPaths } from '../../src/data/engineering.js';
import { content } from './content.jsx';
import narrationManifest from '../../src/data/narration/${scenario.slug}.json';
import { MEDIA_BASE_URL } from '../../src/config/media.js';
import { narrationManifestProblem } from '../../src/lib/preservedNarrationPlayer.js';

// The canonical narration array is needed only once a reader opens the player
// (character check and the text panel), so it loads with the player instead of
// riding in the page chunk next to the whole Python package.
const PreservedListenPlayer = lazy(async () => {
  const [player, spoken] = await Promise.all([
    import('../../src/components/PreservedListenPlayer.jsx'),
    import('../../src/content/${scenario.slug}.narration.js'),
  ]);
  const Player = player.default;
  return { default: (props) => <Player {...props} narration={spoken.narration} /> };
});
function PreservedPlayerBoundary(props) {
  return <Suspense fallback={<button type="button" className="btn btn-listen" disabled>Text Narration</button>}><PreservedListenPlayer {...props} /></Suspense>;
}
const entry = SCENARIOS.find(scenario => scenario.slug === '${scenario.slug}');
if (!entry) throw new Error('Engineering scenario registry entry is missing');
const scenario = { ...entry, ...scenarioPaths(entry.slug) };
const manifestProblem = narrationManifestProblem(narrationManifest, MEDIA_BASE_URL);
if (manifestProblem) throw new Error('Scenario preserved narration is not deployable: ' + manifestProblem);
const narrationPlayer = { Component: PreservedPlayerBoundary, manifest: narrationManifest, mediaBaseUrl: MEDIA_BASE_URL };
createRoot(document.getElementById('root')).render(<React.StrictMode><ScenarioPage scenario={scenario} content={content} narrationPlayer={narrationPlayer} /></React.StrictMode>);
`,
  };
}

export function scaffoldEngineeringEntry(scenario,{root=ROOT}={}) {
  const files = scenarioEntrySources(scenario);
  for (const name of Object.keys(files)) if (fs.existsSync(path.join(root,name))) throw new Error(`Refusing to overwrite ${name}`);
  fs.mkdirSync(path.join(root,scenarioPaths(scenario.slug).directory),{recursive:true});
  for (const [name,source] of Object.entries(files)) fs.writeFileSync(path.join(root,name),source,{encoding:'utf8',flag:'wx'});
  return Object.keys(files);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [flag,slug,...rest] = process.argv.slice(2);
  if (flag !== '--slug' || !slug || rest.length) throw new Error('Usage: node scripts/scaffold-engineering.mjs --slug <registered-draft-slug>');
  const scenario = SCENARIOS.find(row => row.slug === slug);
  if (!scenario || scenario.status !== 'draft') throw new Error('Scaffolding requires an existing draft registry entry');
  console.log(scaffoldEngineeringEntry(scenario).join('\n'));
  console.log('Only entry plumbing was created. Fable must author the scenario, Python package, visuals, and narration before publication.');
}
