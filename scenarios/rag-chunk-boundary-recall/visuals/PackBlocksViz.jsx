import { useEffect, useMemo, useRef, useState } from 'react';
import DiagramViewport from '../../../src/components/DiagramViewport.jsx';
import { useCanvasLoop, isStill, holdTicks } from '../../../src/viz/useCanvasLoop.js';
import blocksJson from '../python/fixtures/blocks.json?raw';
import { W, H, STEP_MS, buildTrace, buildTimeline, sceneAt, drawScene } from './packBlocksModel.js';

// The worked example's loop, played at a reading pace on its own five blocks. The model
// (packBlocksModel.js) runs the same loop as solution.py on the same records
// and lays the decisions on a timeline; this component only drives the canvas,
// the caption, and the step buttons. The site's motion preference sets the
// pace: calm plays once and rests two minutes before repeating, slow stretches
// every movement, still paints the finished state once.

// A deep link such as ?viz-t=35#visual starts the figure paused at that second.
function hashSeconds() {
  if (typeof window === 'undefined') return null;
  const match = /viz-t=(\d+(?:\.\d+)?)/.exec(`${window.location.search || ''}${window.location.hash || ''}`);
  return match ? Number(match[1]) : null;
}

export default function PackBlocksViz() {
  const data = useMemo(() => JSON.parse(blocksJson), []);
  const trace = useMemo(() => buildTrace(data), [data]);
  const timeline = useMemo(() => buildTimeline(trace, data), [trace, data]);
  const canvasRef = useRef(null);
  const seek = useRef(null);                 // { seconds, paused } consumed by the next init
  const [run, setRun] = useState(0);
  const [still, setStill] = useState(false);
  const [snap, setSnap] = useState({ caption: timeline.beats[0].caption, paused: false, beat: 0 });

  useEffect(() => { setStill(isStill()); }, [run]);

  const stateRef = useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: STEP_MS,
      init: () => {
        const requested = seek.current || (hashSeconds() !== null ? { seconds: hashSeconds(), paused: true } : null);
        seek.current = null;
        return { elapsed: requested ? requested.seconds : 0, paused: requested ? requested.paused : false, rest: 0, stopAtRest: isStill() };
      },
      tick: (st) => {
        if (st.paused) return st.stopAtRest ? false : true;
        if (st.elapsed < timeline.duration) {
          st.elapsed = Math.min(timeline.duration, st.elapsed + STEP_MS / 1000);
          return true;
        }
        if (st.stopAtRest) return false;            // still: the finished picture, painted once
        if (st.rest <= 0) st.rest = holdTicks(st);  // finished: rest before playing again
        st.rest -= 1;
        if (st.rest <= 0) st.elapsed = 0;
        return true;
      },
      draw: (ctx, st) => drawScene(ctx, sceneAt(timeline, trace, data, st.elapsed)),
    },
    [run]
  );

  useEffect(() => {
    const id = setInterval(() => {
      const st = stateRef.current;
      if (!st) return;
      const scene = sceneAt(timeline, trace, data, st.elapsed);
      setSnap((previous) =>
        previous.caption === scene.caption && previous.paused === st.paused && previous.beat === scene.beatIndex
          ? previous
          : { caption: scene.caption, paused: st.paused, beat: scene.beatIndex }
      );
    }, 250);
    return () => clearInterval(id);
  }, [timeline, trace, data, stateRef]);

  const restartAt = (seconds, paused) => {
    seek.current = { seconds, paused };
    setRun((n) => n + 1);
  };
  const jump = (direction) => {
    const st = stateRef.current;
    const elapsed = st ? st.elapsed : 0;
    const { markers } = timeline;
    let current = markers.filter((m) => m <= elapsed + 0.001).length - 1;
    if (current < 0) current = 0;
    const target = direction > 0
      ? Math.min(markers.length - 1, current + 1)
      : (elapsed - markers[current] > 1 ? current : Math.max(0, current - 1));
    restartAt(markers[target], true);
  };
  const togglePause = () => {
    const st = stateRef.current;
    if (!st) return;
    if (still) { restartAt(st.elapsed, !st.paused); return; }
    st.paused = !st.paused;
    setSnap((previous) => ({ ...previous, paused: st.paused }));
  };

  return (
    <div className="viz-frame">
      <DiagramViewport width={W} aspect={`${W} / ${H}`}>
        <canvas
          ref={canvasRef}
          style={{ aspectRatio: `${W} / ${H}` }}
          role="img"
          aria-label="The packing loop from the worked example, running at a reading pace on its five blocks"
        />
      </DiagramViewport>
      <p className="viz-caption" aria-live="polite">{snap.caption}</p>
      <div className="viz-controls">
        <button type="button" className="btn" onClick={() => jump(-1)}>Previous step</button>
        {!still && <button type="button" className="btn" onClick={togglePause}>{snap.paused ? 'Resume' : 'Pause'}</button>}
        <button type="button" className="btn" onClick={() => jump(1)}>Next step</button>
        <button type="button" className="btn" onClick={() => restartAt(0, false)}>Restart</button>
        <span className="viz-stat">step <b>{snap.beat + 1}</b> of {timeline.beats.length}</span>
      </div>
    </div>
  );
}
