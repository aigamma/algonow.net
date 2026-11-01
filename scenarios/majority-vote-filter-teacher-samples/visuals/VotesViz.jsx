import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import samplesJson from '../python/fixtures/samples.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './votesModel.js';

// The worked example's majority vote, played at a reading pace on its own five
// prompts. The model (votesModel.js) runs the same normalize, tally, and
// decide as solution.py and lays the prompts on a timeline; the shared driver
// handles the canvas, the caption, and the step buttons.
export default function VotesViz() {
  const data = useMemo(() => JSON.parse(samplesJson), []);
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
      ariaLabel="Five prompts with five teacher samples each, the samples normalized and counted into a tally, and each prompt kept with its majority label or dropped"
    />
  );
}
