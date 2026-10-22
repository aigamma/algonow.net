import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import queriesJson from '../python/fixtures/queries.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './retrievalMetricsModel.js';

// The worked example's metrics, played at a reading pace on its own four
// queries. The model (retrievalMetricsModel.js) runs the same functions as
// solution.py and practice_answer.py and lays the rankings on a timeline; the
// shared driver handles the canvas, the caption, and the step buttons.
export default function RetrievalMetricsViz() {
  const data = useMemo(() => JSON.parse(queriesJson), []);
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
      ariaLabel="Precision at three, recall at three, and reciprocal rank scored for the old and the new ranking of each query in the worked example"
    />
  );
}
