import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import examplesJson from '../python/fixtures/examples.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './klDivergenceModel.js';

// The worked example's divergence arithmetic, played at a reading pace on its
// own four examples. The model (klDivergenceModel.js) runs the same functions
// as solution.py and lays the examples on a timeline; the shared driver
// handles the canvas, the caption, and the step buttons.
export default function KlDivergenceViz() {
  const data = useMemo(() => JSON.parse(examplesJson), []);
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
      ariaLabel="KL divergence from the teacher to the student computed for the worked example's four routing examples, then ranked worst first"
    />
  );
}
