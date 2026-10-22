import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import positionsJson from '../python/fixtures/positions.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './topKTruncateModel.js';

// The worked example's truncation, played at a reading pace on its own three
// positions. The model (topKTruncateModel.js) runs the same top-k and top-p
// functions as the Python files and lays the steps on a timeline; the shared
// driver handles the canvas, the caption, and the step buttons.
export default function TopKTruncateViz() {
  const data = useMemo(() => JSON.parse(positionsJson), []);
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
      ariaLabel="Top-k truncation of the teacher's probabilities at three positions from the worked example, position by position, then the top-p variation"
    />
  );
}
