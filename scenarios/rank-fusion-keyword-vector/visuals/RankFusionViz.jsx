import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import rankingsJson from '../python/fixtures/rankings.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './rankFusionModel.js';

// The worked example's fusion, played at a reading pace on its own two
// rankings. The model (rankFusionModel.js) runs the same accumulation as
// solution.py on the same lists and lays every contribution on a timeline;
// the shared driver handles the canvas, the caption, and the step buttons.
export default function RankFusionViz() {
  const data = useMemo(() => JSON.parse(rankingsJson), []);
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
      ariaLabel="Reciprocal rank fusion of the keyword and vector rankings from the worked example, one contribution at a time"
    />
  );
}
