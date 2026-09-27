import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/theme.css';
import PuzzlePage from '../src/components/PuzzlePage.jsx';
import { PUZZLES } from '../src/data/puzzles.js';
import { content } from '../src/content/byte-pair-encoding-frequency-merge-vocabulary.jsx';
import narrationManifest from '../src/data/narration/byte-pair-encoding-frequency-merge-vocabulary.json';
import { MEDIA_BASE_URL } from '../src/config/media.js';
import { narrationManifestProblem } from '../src/lib/preservedNarrationPlayer.js';

const PreservedListenPlayer = lazy(
  () => import('../src/components/PreservedListenPlayer.jsx'),
);

function PreservedPlayerBoundary(props) {
  return (
    <Suspense
      fallback={(
        <button type="button" className="btn btn-listen narration-disclosure" disabled>
          ▥ Text Narration
        </button>
      )}
    >
      <PreservedListenPlayer {...props} />
    </Suspense>
  );
}

// Preserved narration is mandatory from puzzle 115 on: a missing or pending
// manifest is a ship blocker, never a browser-speech fallback.
const manifestProblem = narrationManifestProblem(narrationManifest, MEDIA_BASE_URL);
if (manifestProblem) {
  throw new Error(`Byte pair encoding preserved narration is not deployable: ${manifestProblem}`);
}

const narrationPlayer = {
  Component: PreservedPlayerBoundary,
  manifest: narrationManifest,
  mediaBaseUrl: MEDIA_BASE_URL,
};

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PuzzlePage
      puzzle={PUZZLES['/byte-pair-encoding-frequency-merge-vocabulary/']}
      content={content}
      narrationPlayer={narrationPlayer}
    />
  </React.StrictMode>
);
