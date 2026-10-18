import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import scheduleJson from '../python/fixtures/schedule.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './lrScheduleModel.js';

// The worked example's schedule, drawn one bar per step at a reading pace. The
// model (lrScheduleModel.js) evaluates the same function as solution.py on the
// same parameters and lays the phases on a timeline; the shared driver handles
// the canvas, the caption, and the step buttons.
export default function LrScheduleViz() {
  const data = useMemo(() => JSON.parse(scheduleJson), []);
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
      ariaLabel="The learning-rate schedule from the worked example, one bar per step: linear warmup, cosine decay, and the practice hold"
    />
  );
}
