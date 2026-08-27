import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The casino, decoded. The background bands are the TRUTH: amber stretches
// are the loaded die, plain ones the fair die. Rolls appear along the top
// (sixes bright). The trellis fills left to right, two cells per column,
// and when it finishes, the backtrace draws the decoded path: watch it
// hug the amber bands it never saw directly, inferring them from runs of
// suspicious sixes, and miss exactly where the evidence is thin.
const N = 56;
const W = 640;
const H = 300;
const SEED = 20260827;
const TICKS_PER_COL = 5;
const A = [[0.95, 0.05], [0.1, 0.9]];
const B = [Array(6).fill(1 / 6), [0.1, 0.1, 0.1, 0.1, 0.1, 0.5]];
const PI = [0.5, 0.5];

function makeScene(seed) {
  const rand = mulberry32(seed);
  const pick = (weights) => {
    let r = rand() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };
  let s = pick(PI);
  const truth = [];
  const rolls = [];
  for (let t = 0; t < N; t++) {
    truth.push(s);
    rolls.push(pick(B[s]));
    s = pick(A[s]);
  }
  // Log-space Viterbi with backpointers.
  const lg = (x) => (x > 0 ? Math.log(x) : -Infinity);
  let V = [lg(PI[0]) + lg(B[0][rolls[0]]), lg(PI[1]) + lg(B[1][rolls[0]])];
  const back = [];
  for (let t = 1; t < N; t++) {
    const nv = [];
    const ptr = [];
    for (let sTo = 0; sTo < 2; sTo++) {
      const c0 = V[0] + lg(A[0][sTo]);
      const c1 = V[1] + lg(A[1][sTo]);
      ptr.push(c0 >= c1 ? 0 : 1);
      nv.push(Math.max(c0, c1) + lg(B[sTo][rolls[t]]));
    }
    V = nv;
    back.push(ptr);
  }
  const path = [V[0] >= V[1] ? 0 : 1];
  for (let t = back.length - 1; t >= 0; t--) path.push(back[t][path[path.length - 1]]);
  path.reverse();
  const correct = path.reduce((a, p, i) => a + (p === truth[i] ? 1 : 0), 0);
  return { truth, rolls, path, correct };
}

export default function ViterbiViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ correct: 0, done: false });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ correct: 0, done: false });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = (N + 14) * TICKS_PER_COL;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            s.scene = makeScene(SEED + cycle.current * 7919);
            s.tick = 0;
            s.rest = 0;
          }
          return true;
        }
        s.tick += 1;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const warn = css.getPropertyValue('--warn').trim() || '#e06767';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const colW = (W - 60) / N;
        const filled = Math.min(Math.floor(s.tick / TICKS_PER_COL), N);
        const tracing = filled >= N;
        const traceCols = tracing
          ? Math.min(Math.floor((s.tick - N * TICKS_PER_COL) / TICKS_PER_COL) * 6, N)
          : 0;

        // Truth bands.
        for (let t = 0; t < N; t++) {
          if (s.scene.truth[t] === 1) {
            ctx.fillStyle = 'rgba(240,185,75,0.13)';
            ctx.fillRect(30 + t * colW, 60, colW, 170);
          }
        }
        // Rolls along the top: sixes bright.
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        for (let t = 0; t < N; t++) {
          const r = s.scene.rolls[t];
          ctx.fillStyle = r === 5 ? heur : dim;
          ctx.fillText(String(r + 1), 30 + t * colW + colW / 2, 50);
        }
        ctx.textAlign = 'start';
        // Trellis rows.
        const rowY = [110, 190];
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('fair', 4, rowY[0] + 3);
        ctx.fillText('loaded', 4, rowY[1] + 3);
        for (let t = 0; t < filled; t++) {
          for (let st = 0; st < 2; st++) {
            ctx.fillStyle = `${algo}55`;
            ctx.fillRect(30 + t * colW + colW / 2 - 1.5, rowY[st] - 1.5, 3, 3);
          }
        }
        // Backtrace path.
        if (tracing && traceCols > 0) {
          ctx.strokeStyle = path;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          const start = N - traceCols;
          for (let t = start; t < N; t++) {
            const x = 30 + t * colW + colW / 2;
            const y = rowY[s.scene.path[t]];
            if (t === start) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          // Mark misses so far.
          for (let t = start; t < N; t++) {
            if (s.scene.path[t] !== s.scene.truth[t]) {
              const x = 30 + t * colW + colW / 2;
              ctx.strokeStyle = warn;
              ctx.lineWidth = 1.3;
              ctx.beginPath();
              ctx.arc(x, rowY[s.scene.path[t]], 6, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
        const done = tracing && traceCols >= N;
        statsRef.current = { correct: s.scene.correct, done };
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(
          done
            ? `decoded: ${s.scene.correct}/${N} states correct · amber bands were the loaded die (never observed directly)`
            : tracing
              ? 'trellis full · backtracing the most probable screenplay…'
              : `filling the trellis · column ${filled}/${N} · two cells, four edges, one max each`,
          14,
          266,
        );
        ctx.fillStyle = heur;
        ctx.fillText('bright numbers: sixes · the loaded die throws them half the time', 14, 284);
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
          new night
        </button>
        <span className="viz-stat">
          {snap.done
            ? <>the screenplay matched truth on <strong>{snap.correct}</strong> of {N} rolls · red rings are the honest misses</>
            : 'watching the rolls for suspicious runs of sixes…'}
        </span>
      </div>
    </>
  );
}
