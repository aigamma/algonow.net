import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import turnsJson from '../python/fixtures/turns.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './transcriptWindowModel.js';

// The worked example's grouping, sort, and windowed walk, played at a reading
// pace on its own nine rows. The model (transcriptWindowModel.js) runs the
// same functions as solution.py and lays the walk on a timeline; the shared
// driver handles the canvas, the caption, and the step buttons.
export default function TranscriptWindowViz() {
  const data = useMemo(() => JSON.parse(turnsJson), []);
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
      ariaLabel="Nine transcript rows grouped into two conversations, sorted by turn, and walked with a window of four to build fine-tuning examples"
    />
  );
}
