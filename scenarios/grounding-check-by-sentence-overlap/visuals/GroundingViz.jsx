import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import answerJson from '../python/fixtures/answer.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './groundingModel.js';

// The worked example's grounding check, played at a reading pace on its own
// three chunks and four sentences. The model (groundingModel.js) runs the same
// splitting, word sets, and scores as solution.py and lays the sentences on a
// timeline; the shared driver handles the canvas, the caption, and the step
// buttons.
export default function GroundingViz() {
  const data = useMemo(() => JSON.parse(answerJson), []);
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
      ariaLabel="The grounding check from the worked example, sentence by sentence: content words, support scores against three chunks, and the verdict"
    />
  );
}
