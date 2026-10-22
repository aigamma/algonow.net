import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import repliesJson from '../python/fixtures/replies.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './jsonExtractModel.js';

// The worked example's brace walk, parse, and checks, played at a reading pace
// on its own six replies. The model (jsonExtractModel.js) runs the same
// functions as solution.py and lays the replies on a timeline; the shared
// driver handles the canvas, the caption, and the step buttons.
export default function JsonExtractViz() {
  const data = useMemo(() => JSON.parse(repliesJson), []);
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
      ariaLabel="The brace walk, the parse, and the checks from the worked example, replayed on its six replies one at a time"
    />
  );
}
