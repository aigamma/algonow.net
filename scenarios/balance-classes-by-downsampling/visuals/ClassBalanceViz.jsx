import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import recordsJson from '../python/fixtures/records.json?raw';
import traceJson from '../python/fixtures/expected-trace.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './classBalanceModel.js';

// The worked example's cap and sample, played at a reading pace on its own
// twelve records. The model (classBalanceModel.js) runs the same grouping,
// cap, order restoration, and floor as the Python files; the ids the seeded
// sample chose come from the trace the Python suite derives from the real
// functions, since the browser cannot reproduce random.Random. The shared
// driver handles the canvas, the caption, and the step buttons.
export default function ClassBalanceViz() {
  const data = useMemo(() => JSON.parse(recordsJson), []);
  const given = useMemo(() => {
    const fixture = JSON.parse(traceJson);
    return { sampled: fixture.sampled, repeats: fixture.practice.repeats };
  }, []);
  const trace = useMemo(() => buildTrace(data, given), [data, given]);
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
      ariaLabel="Capping each label at three records with a seeded sample, label by label, then restoring input order and lifting the smallest label to the floor"
    />
  );
}
