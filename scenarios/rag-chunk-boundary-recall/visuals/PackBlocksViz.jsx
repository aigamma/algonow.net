import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import blocksJson from '../python/fixtures/blocks.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './packBlocksModel.js';

// The worked example's loop, played at a reading pace on its own five blocks.
// The model (packBlocksModel.js) runs the same loop as solution.py on the same
// records and lays the decisions on a timeline; the shared driver handles the
// canvas, the live caption, the step buttons, the ?viz-t= deep link, and the
// site's motion preference (calm plays once and rests two minutes before
// repeating, slow stretches every movement, still paints the finished state).
export default function PackBlocksViz() {
  const data = useMemo(() => JSON.parse(blocksJson), []);
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
      ariaLabel="The packing loop from the worked example, running at a reading pace on its five blocks"
    />
  );
}
