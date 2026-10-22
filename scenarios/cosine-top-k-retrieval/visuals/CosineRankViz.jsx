import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import chunksJson from '../python/fixtures/chunks.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './cosineRankModel.js';

// The worked example's scoring and ranking, played at a reading pace on its
// own five chunks. The model (cosineRankModel.js) runs the same dot, norm,
// cosine, and rank_chunks as solution.py and lays the chunks on a timeline;
// the shared driver handles the canvas, the caption, and the step buttons.
export default function CosineRankViz() {
  const data = useMemo(() => JSON.parse(chunksJson), []);
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
      ariaLabel="Five runbook chunks scored against a query by dot product and by cosine similarity, then sorted into cosine order with the top three kept"
    />
  );
}
