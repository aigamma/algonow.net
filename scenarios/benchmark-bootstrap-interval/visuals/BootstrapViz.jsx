import { useCallback, useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import resultsJson from '../python/fixtures/results.json?raw';
import traceJson from '../python/fixtures/expected-trace.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './bootstrapModel.js';

// The worked example's paired bootstrap, played at a reading pace on its own
// twenty-five items. The model (bootstrapModel.js) rescores the shown resamples
// from the indices the Python file drew and recomputes the interval from the
// two hundred differences it produced; Python's seeded generator itself is not
// replayed in the browser, and the figure says so. The shared driver supplies
// the canvas loop, the live caption, the step buttons, and the
// ?viz-t=SECONDS#visual deep link.
export default function BootstrapViz() {
  const data = useMemo(() => JSON.parse(resultsJson), []);
  const trace = useMemo(() => {
    const python = JSON.parse(traceJson);
    return buildTrace(data, { resamples: python.resamples, differences: python.differences });
  }, [data]);
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
      ariaLabel="A paired bootstrap of the benchmark difference at a reading pace: twenty-five items resampled, the histogram of differences filling, and the ninety-five percent interval"
    />
  );
}
