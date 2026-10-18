import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import scriptsJson from '../python/fixtures/scripts.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './retryBackoffModel.js';

// The worked example's retry loop, played on its own three scripts along a
// time axis. The model (retryBackoffModel.js) runs the same loop as solution.py
// on the same scripts with simulated time and lays every attempt on a
// timeline; the shared driver handles the canvas, caption, and step buttons.
export default function RetryBackoffViz() {
  const data = useMemo(() => JSON.parse(scriptsJson), []);
  const trace = useMemo(() => buildTrace(data), [data]);
  const timeline = useMemo(() => buildTimeline(trace, data), [trace, data]);
  const scene = useMemo(() => (seconds) => sceneAt(timeline, trace, data, seconds), [timeline, trace, data]);
  return (
    <LessonTimelineViz width={W} height={H} stepMs={STEP_MS} timeline={timeline} sceneAt={scene} drawScene={drawScene}
      ariaLabel="The retry loop from the worked example, running on its three scripted endpoints along a time axis" />
  );
}
