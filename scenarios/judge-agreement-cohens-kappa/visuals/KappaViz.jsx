import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import gradesJson from '../python/fixtures/grades.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './kappaModel.js';

// The worked example's kappa computation, played at a reading pace on its own
// ten graded answers. The model (kappaModel.js) runs the same kappa function as
// solution.py and lays the pairs on a timeline; the shared driver handles the
// canvas, the caption, and the step buttons.
export default function KappaViz() {
  const data = useMemo(() => JSON.parse(gradesJson), []);
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
      ariaLabel="Ten graded answers landing in a two by two agreement table, then the observed agreement, the chance agreement, and Cohen's kappa"
    />
  );
}
