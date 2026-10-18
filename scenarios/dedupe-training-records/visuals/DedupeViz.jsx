import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import recordsJson from '../python/fixtures/records.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './dedupeModel.js';

// The worked example's normalize and dedupe, played at a reading pace on its
// own eight records. The model (dedupeModel.js) runs the same functions as
// solution.py on the same records and lays the decisions on a timeline; the
// shared driver handles the canvas, the caption, and the step buttons.
export default function DedupeViz() {
  const data = useMemo(() => JSON.parse(recordsJson), []);
  const trace = useMemo(() => buildTrace(data), [data]);
  const timeline = useMemo(() => buildTimeline(trace, data), [trace, data]);
  const scene = useMemo(() => (seconds) => sceneAt(timeline, trace, data, seconds), [timeline, trace, data]);
  return (
    <LessonTimelineViz width={W} height={H} stepMs={STEP_MS} timeline={timeline} sceneAt={scene} drawScene={drawScene}
      ariaLabel="The normalized-key deduplication from the worked example, running at a reading pace on its eight records" />
  );
}
