import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import documentJson from '../python/fixtures/document.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './windowChunksModel.js';

// The worked example's sliding-window chunker, played at a reading pace on its
// own document. The model (windowChunksModel.js) runs the same chunk_words
// function as solution.py and lays the windows on a timeline; the shared
// driver handles the canvas, the caption, and the step buttons.
export default function WindowChunksViz() {
  const data = useMemo(() => JSON.parse(documentJson), []);
  const trace = useMemo(() => buildTrace(data), [data]);
  const timeline = useMemo(() => buildTimeline(trace), [trace]);
  const scene = useMemo(() => (seconds) => sceneAt(timeline, trace, seconds), [timeline, trace]);
  const draw = useMemo(() => (ctx, state) => drawScene(ctx, state, trace), [trace]);
  return (
    <LessonTimelineViz
      width={W}
      height={H}
      stepMs={STEP_MS}
      timeline={timeline}
      sceneAt={scene}
      drawScene={draw}
      ariaLabel="Five twelve-word windows sliding eight words at a time over a thirty-nine word paragraph, their four-word overlaps hatched, the instruction span landing whole in the third window"
    />
  );
}
