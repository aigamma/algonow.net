import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import answersJson from '../python/fixtures/answers.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './calibrationFitModel.js';

// The worked example's training loop, played at a reading pace on its own
// eight answers. The model (calibrationFitModel.js) runs the same gradient
// descent as solution.py and lays the epochs on a timeline; the shared driver
// handles the canvas, the caption, and the step buttons.
export default function CalibrationFitViz() {
  const data = useMemo(() => JSON.parse(answersJson), []);
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
      ariaLabel="Gradient descent fitting the confidence calibration curve from the worked example, epoch by epoch"
    />
  );
}
