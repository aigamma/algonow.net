import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import exportJson from '../python/fixtures/export.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './csvJsonlModel.js';

// The worked example's parse and decisions, played at a reading pace on its
// own five rows. The model (csvJsonlModel.js) runs the same decisions as
// solution.py over a small field walker that agrees with csv.DictReader, and
// lays the rows on a timeline; the shared driver handles the canvas, the
// caption, and the step buttons.
export default function CsvJsonlViz() {
  const data = useMemo(() => JSON.parse(exportJson), []);
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
      ariaLabel="The CSV export parsed row by row into JSONL training examples, with the rows that are skipped and why"
    />
  );
}
