import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import requestsJson from '../python/fixtures/requests.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './lruCacheModel.js';

// The worked example's cache, played at a reading pace on its own nine
// requests. The model (lruCacheModel.js) runs the same key normalization and
// the same hit, miss, and eviction logic as solution.py and lays the requests
// on a timeline; the shared driver handles the canvas, the caption, and the
// step buttons.
export default function LruCacheViz() {
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
      ariaLabel="A least-recently-used cache of three answers handling the worked example's nine requests, one request at a time"
    />
  );
}
