import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import linesJson from '../python/fixtures/lines.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './jsonlValidationModel.js';

// The worked example's checks, played at a reading pace on its own nine lines.
// The model (jsonlValidationModel.js) runs the same checks as solution.py on
// the same lines and lays the decisions on a timeline; the shared driver
// handles the canvas, the caption, and the step buttons.
export default function JsonlValidationViz() {
  const data = useMemo(() => JSON.parse(linesJson), []);
  const trace = useMemo(() => buildTrace(data), [data]);
  const timeline = useMemo(() => buildTimeline(trace, data), [trace, data]);
  const scene = useMemo(() => (seconds) => sceneAt(timeline, trace, data, seconds), [timeline, trace, data]);
  return (
    <LessonTimelineViz width={W} height={H} stepMs={STEP_MS} timeline={timeline} sceneAt={scene} drawScene={drawScene}
      ariaLabel="The validation checks from the worked example, running at a reading pace on its nine lines" />
  );
}
