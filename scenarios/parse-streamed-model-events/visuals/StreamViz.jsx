import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import chunksJson from '../python/fixtures/chunks.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './streamModel.js';

// The worked example's line buffer, played at a reading pace on its own six
// chunks. The model (streamModel.js) runs the same reader as solution.py and
// lays the chunks on a timeline; the shared driver handles the canvas, the
// caption, and the step buttons.
export default function StreamViz() {
  const data = useMemo(() => JSON.parse(chunksJson), []);
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
      ariaLabel="Six network chunks appended to a buffer one at a time, complete lines released into an event log, and the streamed reply assembled from the text deltas"
    />
  );
}
