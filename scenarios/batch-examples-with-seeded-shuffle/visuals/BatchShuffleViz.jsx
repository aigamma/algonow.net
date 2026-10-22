import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import examplesJson from '../python/fixtures/examples.json?raw';
import traceJson from '../python/fixtures/expected-trace.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './batchShuffleModel.js';

// The worked example's batching, played at a reading pace on its own ten
// examples. The model (batchShuffleModel.js) slices, counts, and drops exactly
// as solution.py and practice_answer.py do; the shuffled order of each epoch
// is taken from the trace the Python suite derives from the real
// random.Random(seed).shuffle. The shared driver handles the canvas, the
// caption, and the step buttons.
export default function BatchShuffleViz() {
  const data = useMemo(() => JSON.parse(examplesJson), []);
  const pinned = useMemo(() => JSON.parse(traceJson), []);
  const trace = useMemo(() => buildTrace(data, pinned), [data, pinned]);
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
      ariaLabel="Ten training examples shuffled with a seed and sliced into batches of four, epoch by epoch, from the worked example"
    />
  );
}
