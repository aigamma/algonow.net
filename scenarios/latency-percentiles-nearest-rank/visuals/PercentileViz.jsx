import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import latenciesJson from '../python/fixtures/latencies.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './percentileModel.js';

// The worked example's percentiles, played at a reading pace on its own two
// deployments. The model (percentileModel.js) runs the same percentile
// function as solution.py and lays the picks on a timeline; the shared driver
// handles the canvas, the caption, and the step buttons.
export default function PercentileViz() {
  const data = useMemo(() => JSON.parse(latenciesJson), []);
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
      ariaLabel="Two deployments' twenty latency samples sorted, with the median, ninety-fifth, and ninety-ninth percentiles picked by rank and the means drawn for comparison"
    />
  );
}
