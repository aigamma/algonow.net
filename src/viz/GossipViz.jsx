import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Forty-eight nodes on a ring, the same update spread two ways, one
// round per tick. Left: each informed node pushes to one uniformly
// random peer (amber chords); the spread is an epidemic and finishes in
// about log2 N + ln N rounds. Right: each informed node always
// contacts its ring neighbor; the spread takes N - 1 rounds. Informed
// nodes are blue; the counters show rounds and the fraction informed.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 48;
const CAP = 60;

function makeRun(kind, rand) {
  return { kind, rand, informed: new Array(N).fill(false), count: 1, rounds: 0, contacts: [], done: false, doneAt: null };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const push = makeRun('push', rand);
  const ring = makeRun('ring', rand);
  push.informed[0] = true;
  ring.informed[0] = true;
  return { push, ring, done: false, estimate: Math.log2(N) + Math.log(N) };
}

function stepRun(R) {
  if (R.done) return;
  R.rounds += 1;
  R.contacts = [];
  const newly = [];
  for (let v = 0; v < N; v++) {
    if (!R.informed[v]) continue;
    const p = R.kind === 'push' ? Math.floor(R.rand() * N) : (v + 1) % N;
    R.contacts.push([v, p]);
    if (!R.informed[p]) newly.push(p);
  }
  for (const p of newly) {
    if (!R.informed[p]) {
      R.informed[p] = true;
      R.count += 1;
    }
  }
  if (R.count === N) {
    R.done = true;
    R.doneAt = R.rounds;
  }
}

export function sceneTick(sc) {
  stepRun(sc.push);
  stepRun(sc.ring);
  if (sc.ring.rounds >= CAP) sc.ring.done = true;
  sc.done = sc.push.done && sc.ring.done;
  return sc.done;
}

export default function GossipViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 350,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0 });
          }
          return true;
        }
        if (sceneTick(s.scene)) s.done = true;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${N} nodes, one update starting at node 0, one round per tick; estimate for random push: log₂N + ln N = ${sc.estimate.toFixed(1)} rounds`, 12, 18);
        const panels = [
          { cx: 150, R: sc.push, name: 'random peer each round' },
          { cx: 470, R: sc.ring, name: 'fixed peer (ring neighbor)' },
        ];
        for (const p of panels) {
          const R = p.R;
          const cy = 150;
          const rad = 92;
          const pos = (i) => [p.cx + rad * Math.cos((2 * Math.PI * i) / N - Math.PI / 2), cy + rad * Math.sin((2 * Math.PI * i) / N - Math.PI / 2)];
          if (!R.done) {
            ctx.strokeStyle = `${heur}99`;
            for (const [a, b] of R.contacts) {
              const [x1, y1] = pos(a);
              const [x2, y2] = pos(b);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
          for (let i = 0; i < N; i++) {
            const [x, y] = pos(i);
            ctx.fillStyle = R.informed[i] ? (R.done ? good : algo) : `${dim}55`;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = ink;
          ctx.fillText(p.name, p.cx - 80, 262);
          ctx.fillStyle = dim;
          ctx.fillText(`round ${R.rounds}: ${R.count} of ${N} informed${R.doneAt ? ` (complete at round ${R.doneAt})` : ''}`, p.cx - 80, 278);
        }
        let line;
        if (s.done) {
          line = `random peers finished in ${sc.push.doneAt} rounds (estimate ${sc.estimate.toFixed(1)}); the ring ${sc.ring.doneAt ? `needed ${sc.ring.doneAt}` : `has ${sc.ring.count} of ${N} after ${CAP}`}: it needs N − 1 = ${N - 1}`;
          ctx.fillStyle = good;
        } else {
          line = 'an epidemic doubles while few know and finishes off the last few by luck; a fixed neighbor is a queue';
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8);
        statsRef.current = { line };
      },
    },
    [restart],
  );

  return (
    <>
      <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          new run
        </button>
        <span className="viz-stat">{snap.line || 'gossiping…'}</span>
      </div>
    </>
  );
}
