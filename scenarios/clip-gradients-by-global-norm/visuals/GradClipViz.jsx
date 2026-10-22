import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import gradientsJson from '../python/fixtures/gradients.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './gradClipModel.js';

// The worked example's clipping, played at a reading pace on its own two
// batches. The model (gradClipModel.js) runs the same global-norm clipping as
// solution.py and lays the steps on a timeline; the shared driver handles the
// canvas, the caption, and the step buttons.
export default function GradClipViz() {
  const data = useMemo(() => JSON.parse(gradientsJson), []);
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
      ariaLabel="Global-norm gradient clipping from the worked example: the norm, the scale, the shrunken gradients, and the parameter step"
    />
  );
}
