import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import callsJson from '../python/fixtures/calls.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './circuitBreakerModel.js';

// The worked example's circuit breaker, played at a reading pace on its own
// ten calls. The model (circuitBreakerModel.js) runs the same protect function
// as solution.py and lays the decisions on a timeline; the shared driver
// handles the canvas, the caption, and the step buttons.
export default function CircuitBreakerViz() {
  const data = useMemo(() => JSON.parse(callsJson), []);
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
      ariaLabel="A circuit breaker passing, skipping, or trialling the worked example's ten calls to a model provider, call by call"
    />
  );
}
