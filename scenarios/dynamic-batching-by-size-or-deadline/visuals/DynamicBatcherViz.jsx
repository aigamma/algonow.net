import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import arrivalsJson from '../python/fixtures/arrivals.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './dynamicBatcherModel.js';

// The worked example's batcher, played at a reading pace on its own nine
// arrivals. The model (dynamicBatcherModel.js) runs the same batch function as
// solution.py and lays the joins and flushes on a timeline; the shared driver
// handles the canvas, the caption, and the step buttons.
export default function DynamicBatcherViz() {
  const data = useMemo(() => JSON.parse(arrivalsJson), []);
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
      ariaLabel="A dynamic batcher collecting the worked example's nine requests into three model calls, arrival by arrival"
    />
  );
}
