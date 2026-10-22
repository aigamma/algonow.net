import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import problemsJson from '../python/fixtures/problems.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './passAtKModel.js';

// The worked example's estimator, played at a reading pace on its own six
// problems. The model (passAtKModel.js) counts the same subsets as solution.py
// and lays the table on a timeline; the shared driver handles the canvas, the
// caption, and the step buttons.
export default function PassAtKViz() {
  const data = useMemo(() => JSON.parse(problemsJson), []);
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
      ariaLabel="The pass at k estimator from the worked example: the subsets of three samples for one problem, then the table of estimates for six problems"
    />
  );
}
