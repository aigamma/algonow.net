import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import candidatesJson from '../python/fixtures/candidates.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './mmrModel.js';

// The worked example's greedy loop, played at a reading pace on its own six
// candidates. The model (mmrModel.js) runs the same rounds as solution.py and
// lays the picks on a timeline; the shared driver handles the canvas, the
// caption, and the step buttons.
export default function MmrViz() {
  const data = useMemo(() => JSON.parse(candidatesJson), []);
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
      ariaLabel="Maximal marginal relevance picking three of six chunks from the worked example, one round at a time"
    />
  );
}
