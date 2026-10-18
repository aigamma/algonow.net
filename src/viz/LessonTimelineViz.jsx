import { useEffect, useRef, useState } from 'react';
import DiagramViewport from '../components/DiagramViewport.jsx';
import { useCanvasLoop, isStill, holdTicks } from './useCanvasLoop.js';

// The shared driver for a worked lesson's animation. A lesson supplies a pure
// model: a timeline ({ beats, duration, markers }, seconds at the calm
// setting), sceneAt(seconds) for the drawable state at any moment (with a
// caption and a beatIndex), and drawScene(ctx, scene). This component only
// drives the canvas, the live caption, and the step buttons. The site's motion
// preference sets the pace: calm plays once and rests two minutes before
// repeating, slow stretches every movement, still paints the finished state.

// A deep link such as ?viz-t=12#visual starts the figure paused at that second.
function hashSeconds() {
  if (typeof window === 'undefined') return null;
  const match = /viz-t=(\d+(?:\.\d+)?)/.exec(`${window.location.search || ''}${window.location.hash || ''}`);
  return match ? Number(match[1]) : null;
}

export default function LessonTimelineViz({ width, height, stepMs, timeline, sceneAt, drawScene, ariaLabel }) {
  const canvasRef = useRef(null);
  const seek = useRef(null);                 // { seconds, paused } consumed by the next init
  const [run, setRun] = useState(0);
  const [still, setStill] = useState(false);
  const [snap, setSnap] = useState(() => ({ caption: sceneAt(0).caption, paused: false, beat: 0 }));

  useEffect(() => { setStill(isStill()); }, [run]);

  const stateRef = useCanvasLoop(
    canvasRef,
    {
      width,
      height,
      stepMs,
      init: () => {
        const requested = seek.current || (hashSeconds() !== null ? { seconds: hashSeconds(), paused: true } : null);
        seek.current = null;
        return { elapsed: requested ? requested.seconds : 0, paused: requested ? requested.paused : false, rest: 0, stopAtRest: isStill() };
      },
      tick: (st) => {
        if (st.paused) return st.stopAtRest ? false : true;
        if (st.elapsed < timeline.duration) {
          st.elapsed = Math.min(timeline.duration, st.elapsed + stepMs / 1000);
          return true;
        }
        if (st.stopAtRest) return false;            // still: the finished picture, painted once
        if (st.rest <= 0) st.rest = holdTicks(st);  // finished: rest before playing again
        st.rest -= 1;
        if (st.rest <= 0) st.elapsed = 0;
        return true;
      },
      draw: (ctx, st) => drawScene(ctx, sceneAt(st.elapsed)),
    },
    [run]
  );

  useEffect(() => {
    const id = setInterval(() => {
      const st = stateRef.current;
      if (!st) return;
      const scene = sceneAt(st.elapsed);
      setSnap((previous) =>
        previous.caption === scene.caption && previous.paused === st.paused && previous.beat === scene.beatIndex
          ? previous
          : { caption: scene.caption, paused: st.paused, beat: scene.beatIndex }
      );
    }, 250);
    return () => clearInterval(id);
  }, [sceneAt, stateRef]);

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
      <DiagramViewport width={width} aspect={`${width} / ${height}`}>
        <canvas ref={canvasRef} style={{ aspectRatio: `${width} / ${height}` }} role="img" aria-label={ariaLabel} />
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
