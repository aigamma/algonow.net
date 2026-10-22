import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import docsJson from '../python/fixtures/docs.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './invertedIndexModel.js';

// The worked example's index build and queries, played at a reading pace on
// its own five documents. The model (invertedIndexModel.js) runs the same
// tokenize, build_index, and and_query as solution.py and lays the documents
// and queries on a timeline; the shared driver handles the canvas, the
// caption, and the step buttons.
export default function InvertedIndexViz() {
  const data = useMemo(() => JSON.parse(docsJson), []);
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
      ariaLabel="An inverted index built from the worked example's five documents one document at a time, then three AND queries answered by intersecting posting lists"
    />
  );
}
