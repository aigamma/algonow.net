import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/theme.css';
import PuzzlePage from '../src/components/PuzzlePage.jsx';
import { PUZZLES } from '../src/data/puzzles.js';
import { content } from '../src/content/kalman-covariance-correction.jsx';
import narrationManifest from '../src/data/narration/kalman-covariance-correction.json';
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

const narrationPending = narrationManifest?.status === 'pending';
if (!narrationPending) {
  const manifestProblem = narrationManifestProblem(narrationManifest, MEDIA_BASE_URL);
  if (manifestProblem) {
    throw new Error(`Kalman preserved narration is not deployable: ${manifestProblem}`);
  }
}

const narrationPlayer = narrationPending
  ? null
  : {
      Component: PreservedPlayerBoundary,
      manifest: narrationManifest,
      mediaBaseUrl: MEDIA_BASE_URL,
    };

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PuzzlePage
      puzzle={PUZZLES['/kalman-covariance-correction/']}
      content={content}
      narrationPlayer={narrationPlayer}
    />
  </React.StrictMode>
);
