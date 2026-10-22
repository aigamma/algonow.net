import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import documentsJson from '../python/fixtures/documents.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './ingestDiffModel.js';

// The worked example's plan, played at a reading pace on its own documents.
// The model (ingestDiffModel.js) runs the same comparison as solution.py on the
// recorded hashes and lays the decisions on a timeline; the shared driver
// handles the canvas, the caption, and the step buttons.
export default function IngestDiffViz() {
  const data = useMemo(() => JSON.parse(documentsJson), []);
  const trace = useMemo(() => buildTrace(data), [data]);
  const timeline = useMemo(() => buildTimeline(trace, data), [trace, data]);
  const scene = useMemo(() => (seconds) => sceneAt(timeline, trace, data, seconds), [timeline, trace, data]);
  return (
    <LessonTimelineViz
      width={W}
      height={H}
      stepMs={STEP_MS}
      timeline={timeline}
      sceneAt={scene}
      drawScene={drawScene}
      ariaLabel="The nightly ingest plan from the worked example: each document hashed, compared with the previous manifest, and marked unchanged, changed, new, or deleted"
    />
  );
}
