import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import candidatesJson from '../python/fixtures/candidates.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './marginModel.js';

// The worked example's margin selection, played at a reading pace on its own
// eight prompts. The model (marginModel.js) runs the same score and select as
// solution.py and lays the prompts on a timeline; the shared driver handles
// the canvas, the caption, and the step buttons.
export default function MarginViz() {
  const data = useMemo(() => JSON.parse(candidatesJson), []);
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
      ariaLabel="Eight unlabeled prompts, each with three route probabilities as dots on a line, the margin between the top two bracketed, the rows sorted by margin, and the three smallest sent to the teacher"
    />
  );
}
