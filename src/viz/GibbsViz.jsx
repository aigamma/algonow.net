import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts, one staircase. Act one: a rho 0.6 Gaussian: the walker
// moves only along the axes (freeze y, redraw x; freeze x, redraw y),
// every move accepted, and the scatter fills the ellipse in a few
// dozen sweeps. Act two: rho 0.995: the same staircase on a knife
// ridge: every move still accepted, every move still axis-aligned,
// and the walker shuffles along the diagonal at a crawl: acceptance
// 1.000 in both panels, mixing set by geometry alone.
const W = 640;
const H = 300;
const SEED = 20260827;
const SWEEPS_A1 = 70;
const SWEEPS_A2 = 130;
const HALF_TICKS = 3; // ticks per half-step (x move, then y move)
const END_HOLD = 60;

function gauss(rand) {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function makeChain(rho, sweeps, rand) {
  const s = Math.sqrt(1 - rho * rho);
  let x = -2.2;
  let y = -2.2; // start off in a tail so the walk-in is visible
  const halves = [];
  for (let t = 0; t < sweeps; t++) {
    x = rho * y + s * gauss(rand);
    halves.push({ x, y });
    y = rho * x + s * gauss(rand);
    halves.push({ x, y });
  }
  return halves;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  return {
    acts: [
      {
        rho: 0.6,
        halves: makeChain(0.6, SWEEPS_A1, rand),
        sweeps: SWEEPS_A1,
        note: 'act 1 · ρ = 0.6: the staircase strides the ellipse',
        tau: '2.1',
        bad: false,
      },
      {
        rho: 0.995,
        halves: makeChain(0.995, SWEEPS_A2, rand),
        sweeps: SWEEPS_A2,
        note: 'act 2 · ρ = 0.995: same staircase, knife ridge',
        tau: '199',
        bad: true,
      },
    ],
  };
}

export default function GibbsViz() {
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
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 2749),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 2749),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        const act = s.scene.acts[s.act];
        const total = act.halves.length * HALF_TICKS + END_HOLD;
        s.tick += 1;
        if (s.tick >= total) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = total;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.act += 1;
            s.actRest = 0;
          }
        }
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const act = s.scene.acts[actIdx];
        const tick = done ? act.halves.length * HALF_TICKS + END_HOLD - 1 : s.tick;
        const shown = Math.min(Math.floor(tick / HALF_TICKS), act.halves.length);

        // Plane: [-3.2, 3.2] on both axes.
        const X = (v) => 320 + (v / 3.2) * 268;
        const Y = (v) => 138 - (v / 3.2) * 118;

        // Target contours: ellipse axes along the diagonals.
        const a = Math.sqrt(1 + act.rho);
        const b = Math.sqrt(1 - act.rho);
        [2.15, 1.2].forEach((k, i) => {
          ctx.strokeStyle = i === 0 ? '#2a3450' : act.bad ? warn : algo;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let t = 0; t <= 64; t++) {
            const th = (t / 64) * Math.PI * 2;
            const u = k * a * Math.cos(th);
            const v = k * b * Math.sin(th);
            const px = X((u - v) / Math.SQRT2);
            const py = Y((u + v) / Math.SQRT2);
            if (t === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        });

        // The staircase path (recent tail) and the settled scatter.
        const TAIL = 26;
        for (let i = 0; i < shown; i++) {
          const p = act.halves[i];
          if (i < shown - TAIL) {
            ctx.fillStyle = act.bad ? 'rgba(226,96,108,0.45)' : 'rgba(93,162,255,0.45)';
            ctx.fillRect(X(p.x) - 1.4, Y(p.y) - 1.4, 2.8, 2.8);
          }
        }
        ctx.strokeStyle = heur;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        let started = false;
        for (let i = Math.max(0, shown - TAIL); i < shown; i++) {
          const p = act.halves[i];
          if (!started) {
            ctx.moveTo(X(p.x), Y(p.y));
            started = true;
          } else {
            ctx.lineTo(X(p.x), Y(p.y));
          }
        }
        ctx.stroke();
        if (shown > 0) {
          const p = act.halves[shown - 1];
          ctx.fillStyle = heur;
          ctx.beginPath();
          ctx.arc(X(p.x), Y(p.y), 4.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 20);
        ctx.fillText('moves are axis-aligned only: freeze one coordinate, redraw the other', 14, H - 34);

        const sweepsDone = Math.floor(shown / 2);
        let line;
        if (shown < act.halves.length) {
          line = `sweep ${sweepsDone}/${act.sweeps} · accepted: ${shown}/${shown} (1.000) · τ = ${act.tau}`;
          ctx.fillStyle = act.bad ? warn : good;
        } else if (act.bad) {
          line = `every draw accepted, τ = 199 (theory 200): the ridge sets the speed, not the proposal`;
          ctx.fillStyle = warn;
        } else {
          line = `every draw accepted, τ = 2.1 sweeps: the ellipse fills in a blink`;
          ctx.fillStyle = good;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done ? 'acceptance is the proposal; mixing is the geometry' : line,
        };
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
          new chain
        </button>
        <span className="viz-stat">
          {snap.line || 'the staircase sets out…'}
        </span>
      </div>
    </>
  );
}
