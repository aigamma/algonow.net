import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/theme.css';
import ScenarioPage from '../../src/components/ScenarioPage.jsx';
import { SCENARIOS, scenarioPaths } from '../../src/data/engineering.js';
import { content } from './content.jsx';
import narrationManifest from '../../src/data/narration/balance-classes-by-downsampling.json';
import { MEDIA_BASE_URL } from '../../src/config/media.js';
import { narrationManifestProblem } from '../../src/lib/preservedNarrationPlayer.js';

// The canonical narration array is needed only once a reader opens the player
// (character check and the text panel), so it loads with the player instead of
// riding in the page chunk next to the whole Python package.
const PreservedListenPlayer = lazy(async () => {
  const [player, spoken] = await Promise.all([
    import('../../src/components/PreservedListenPlayer.jsx'),
    import('../../src/content/balance-classes-by-downsampling.narration.js'),
  ]);
  const Player = player.default;
  return { default: (props) => <Player {...props} narration={spoken.narration} /> };
});
function PreservedPlayerBoundary(props) {
  return <Suspense fallback={<button type="button" className="btn btn-listen" disabled>Text Narration</button>}><PreservedListenPlayer {...props} /></Suspense>;
}
const entry = SCENARIOS.find(scenario => scenario.slug === 'balance-classes-by-downsampling');
if (!entry) throw new Error('Engineering scenario registry entry is missing');
const scenario = { ...entry, ...scenarioPaths(entry.slug) };
const manifestProblem = narrationManifestProblem(narrationManifest, MEDIA_BASE_URL);
if (manifestProblem) throw new Error('Scenario preserved narration is not deployable: ' + manifestProblem);
const narrationPlayer = { Component: PreservedPlayerBoundary, manifest: narrationManifest, mediaBaseUrl: MEDIA_BASE_URL };
createRoot(document.getElementById('root')).render(<React.StrictMode><ScenarioPage scenario={scenario} content={content} narrationPlayer={narrationPlayer} /></React.StrictMode>);
