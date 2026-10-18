import { useCallback, useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import transcriptsJson from '../python/fixtures/transcripts.json?raw';
import traceJson from '../python/fixtures/expected-trace.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './stableSplitModel.js';

// The worked example's bucket rule, played at a reading pace on its own eight
// transcript ids. The model (stableSplitModel.js) hashes the ids in the browser
// exactly as solution.py does and lays the placements on a timeline; the
// seeded shuffle shown for comparison comes from the Python run (the trace
// fixture), because Python's shuffle is not replayed here. The shared driver
// supplies the canvas loop, the live caption, the step buttons, and the
// ?viz-t=SECONDS#visual deep link.
export default function StableSplitViz() {
  const data = useMemo(() => JSON.parse(transcriptsJson), []);
  const trace = useMemo(() => buildTrace(data, JSON.parse(traceJson).shuffle), [data]);
  const timeline = useMemo(() => buildTimeline(trace, data), [trace, data]);
  const scene = useCallback((seconds) => sceneAt(timeline, trace, data, seconds), [timeline, trace, data]);
  return (
    <LessonTimelineViz
      width={W}
      height={H}
      stepMs={STEP_MS}
      timeline={timeline}
      sceneAt={scene}
      drawScene={drawScene}
      ariaLabel="Eight transcript ids hashed into one hundred buckets at a reading pace, with the seeded shuffle that shipped shown for comparison"
    />
  );
}
