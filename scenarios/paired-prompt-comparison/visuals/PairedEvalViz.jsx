import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import ticketsJson from '../python/fixtures/tickets.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './pairedEvalModel.js';

// The worked example's comparison, played at a reading pace on its own nine
// tickets. The model (pairedEvalModel.js) runs the same comparison as
// solution.py on the same lists and lays the decisions on a timeline; the
// shared LessonTimelineViz drives the canvas, the caption, and the buttons.
export default function PairedEvalViz() {
  const data = useMemo(() => JSON.parse(ticketsJson), []);
  const trace = useMemo(() => buildTrace(data), [data]);
  const timeline = useMemo(() => buildTimeline(trace, data), [trace, data]);
  const sceneAtSeconds = useMemo(() => (seconds) => sceneAt(timeline, trace, data, seconds), [timeline, trace, data]);
  return (
    <LessonTimelineViz
      width={W}
      height={H}
      stepMs={STEP_MS}
      timeline={timeline}
      sceneAt={sceneAtSeconds}
      drawScene={drawScene}
      ariaLabel="The paired comparison from the worked example, sorting its nine tickets into the four combinations of prompt A right or wrong and prompt B right or wrong"
    />
  );
}
