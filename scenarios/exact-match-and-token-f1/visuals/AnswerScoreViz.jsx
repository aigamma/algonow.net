import { useMemo } from 'react';
import LessonTimelineViz from '../../../src/viz/LessonTimelineViz.jsx';
import answersJson from '../python/fixtures/answers.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './answerScoreModel.js';

// The worked example's scoring, played at a reading pace on its own five
// answer pairs. The model (answerScoreModel.js) runs the same normalize,
// exact match, and token F1 as solution.py and lays the pairs on a timeline;
// the shared driver handles the canvas, the caption, and the step buttons.
export default function AnswerScoreViz() {
  const data = useMemo(() => JSON.parse(answersJson), []);
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
      ariaLabel="Exact match and token F1 computed pair by pair on the worked example's five answers"
    />
  );
}
