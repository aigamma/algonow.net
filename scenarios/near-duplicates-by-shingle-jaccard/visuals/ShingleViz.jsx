import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import recordsJson from '../python/fixtures/records.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './shingleModel.js';

// The worked example's shingle comparison, played at a reading pace on its own
// five records. The model (shingleModel.js) runs the same shingles, Jaccard,
// and first-kept walk as solution.py and lays the pairs on a timeline; the
// shared driver handles the canvas, the caption, and the step buttons.
export default function ShingleViz() {
  const data = useMemo(() => JSON.parse(recordsJson), []);
  const trace = useMemo(() => buildTrace(data), [data]);
  const timeline = useMemo(() => buildTimeline(trace), [trace]);
  const scene = useMemo(() => (seconds) => sceneAt(timeline, trace, seconds), [timeline, trace]);
  const draw = useMemo(() => (ctx, state) => drawScene(ctx, state, trace), [trace]);
  return (
    <LessonTimelineViz
      width={W}
      height={H}
      stepMs={STEP_MS}
      timeline={timeline}
      sceneAt={scene}
      drawScene={draw}
      ariaLabel="Five records scored pair by pair with Jaccard similarity over word shingles, the near-duplicate pairs turning red, then the walk that keeps the first record of each group"
    />
  );
}
