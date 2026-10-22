import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import requestsJson from '../python/fixtures/requests.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './tokenBucketModel.js';

// The worked example's token bucket, played at a reading pace on its own eight
// arrivals. The model (tokenBucketModel.js) runs the same admit function as
// solution.py and lays the decisions on a timeline; the shared driver handles
// the canvas, the caption, and the step buttons.
export default function TokenBucketViz() {
  const data = useMemo(() => JSON.parse(requestsJson), []);
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
      ariaLabel="A token bucket admitting or rejecting the worked example's eight requests, arrival by arrival"
    />
  );
}
