import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import examplesJson from '../python/fixtures/examples.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './labelMaskModel.js';

// The worked example's label building, played at a reading pace on its own
// three examples. The model (labelMaskModel.js) runs the same encode,
// build_labels, and pad_batch as solution.py and lays the rows on a timeline;
// the shared driver handles the canvas, the caption, and the step buttons.
export default function LabelMaskViz() {
  const data = useMemo(() => JSON.parse(examplesJson), []);
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
      ariaLabel="Three training rows of token ids with their labels: minus one hundred over the prompt and the padding, the ids over the completion and the end-of-sequence token"
    />
  );
}
