import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import logitsJson from '../python/fixtures/logits.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './distillationModel.js';

// The worked example's softmax and losses, played at a reading pace on its
// own three examples. The model (distillationModel.js) runs the same
// arithmetic as solution.py on the same logits and lays the steps on a
// timeline; the shared LessonTimelineViz drives the canvas, the caption, and
// the step buttons.
export default function DistillationViz() {
  const data = useMemo(() => JSON.parse(logitsJson), []);
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
      ariaLabel="The teacher's logits from the worked example turning into probabilities at temperature one and two, the student's distribution beside them, and the soft, hard, and blended losses"
    />
  );
}
