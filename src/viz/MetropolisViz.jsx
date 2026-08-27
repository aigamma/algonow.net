import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The critic's wandering, watched. The blue curve is the unnormalized
// bimodal target; the walker (green dot) proposes Gaussian steps: an
// accepted move slides, a rejected one flashes red and stays (and is
// counted again: that is the rule). The amber histogram is the chain's
// occupancy filling in the curve's shape. Act one: a timid step size
// stuck circling its starting hill. Act two: the tuned step, crossing
// modes and painting both. Same rule, same target: the dial is the
// whole difference.
const W = 640;
const H = 300;
const SEED = 20260827;
const STEPS = 520;
const STEPS_PER_TICK = 2;
const ACT_HOLD = 60;
const BINS = 44;
const XMIN = -7;
const XMAX = 7;

function target(t) {
  return 0.5 * Math.exp(-0.5 * (t + 3) ** 2) + 0.5 * Math.exp(-0.5 * (t - 3) ** 2);
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const gauss = () => {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const runs = [0.25, 2.4].map((sigma, idx) => {
    let x = -3;
    const steps = [];
    let acc = 0;
    let crossings = 0;
    for (let i = 0; i < STEPS; i++) {
      const y = x + sigma * gauss();
      const accept = target(y) / target(x) > rand();
      if (accept) {
        if (x > 0 !== y > 0) crossings += 1;
        x = y;
        acc += 1;
      }
      steps.push({ x, y, accept });
    }
    return {
      sigma,
      steps,
      accRate: acc / STEPS,
      crossings,
      note:
        idx === 0
          ? `act 1 · timid σ = ${sigma}: busy, and stuck on one hill`
          : `act 2 · tuned σ = ${sigma}: the same rule, crossing freely`,
    };
  });
  return runs;
}

export default function MetropolisViz() {
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
        runs: makeScene(SEED + cycle.current * 7919),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= s.runs.length) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              runs: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= Math.ceil(STEPS / STEPS_PER_TICK) + ACT_HOLD) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = Math.ceil(STEPS / STEPS_PER_TICK) + ACT_HOLD;
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

        const done = s.act >= s.runs.length;
        const actIdx = done ? s.runs.length - 1 : s.act;
        const run = s.runs[actIdx];
        const upTo = done
          ? STEPS
          : Math.min(s.tick * STEPS_PER_TICK, STEPS);

        const xOf = (t) => 20 + ((t - XMIN) / (XMAX - XMIN)) * (W - 40);
        const base = 232;

        // The occupancy histogram so far.
        const hist = new Array(BINS).fill(0);
        for (let i = 0; i < upTo; i++) {
          const t = run.steps[i].x;
          const b = Math.min(
            BINS - 1,
            Math.max(0, Math.floor(((t - XMIN) / (XMAX - XMIN)) * BINS)),
          );
          hist[b] += 1;
        }
        const hmax = Math.max(...hist, 1);
        const bw = (W - 40) / BINS;
        for (let b = 0; b < BINS; b++) {
          const h = (hist[b] / hmax) * 150;
          ctx.fillStyle = `${heur}55`;
          ctx.fillRect(20 + b * bw + 1, base - h, bw - 2, h);
        }

        // The target curve.
        ctx.strokeStyle = algo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= W - 40; px += 3) {
          const t = XMIN + (px / (W - 40)) * (XMAX - XMIN);
          const y = base - (target(t) / target(3)) * 150;
          if (px === 0) ctx.moveTo(20 + px, y);
          else ctx.lineTo(20 + px, y);
        }
        ctx.stroke();

        // The walker and the latest proposal.
        const cur = run.steps[Math.max(0, upTo - 1)];
        if (cur && !done) {
          const px = xOf(cur.x);
          ctx.fillStyle = good;
          ctx.beginPath();
          ctx.arc(px, base + 12, 6, 0, Math.PI * 2);
          ctx.fill();
          const qx = xOf(Math.max(XMIN, Math.min(XMAX, cur.y)));
          ctx.strokeStyle = cur.accept ? good : warn;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(px, base + 12);
          ctx.quadraticCurveTo((px + qx) / 2, base - 6, qx, base + 10);
          ctx.stroke();
          if (!cur.accept) {
            ctx.fillStyle = warn;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText('×', qx - 3, base + 8);
          }
        }

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(run.note, 14, 20);
        const accSoFar =
          upTo > 0
            ? run.steps.slice(0, upTo).filter((st) => st.accept).length / upTo
            : 0;
        let line = `step ${upTo}/${STEPS} · acceptance ${(accSoFar * 100).toFixed(0)}% · mode crossings ${run.crossings}`;
        if (done || upTo >= STEPS) {
          ctx.fillStyle = actIdx === 0 ? warn : good;
          line =
            actIdx === 0
              ? `one hill painted: ${(run.accRate * 100).toFixed(0)}% acceptance looked healthy, ${run.crossings} crossings say otherwise`
              : `both hills painted: ${(run.accRate * 100).toFixed(0)}% acceptance, ${run.crossings} crossings: occupancy ≈ the curve`;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, 42);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('blue: the target (unnormalized) · amber: the chain’s occupancy · red ×: rejected proposal (state recounted)', 14, H - 10);

        statsRef.current = {
          line: done ? 'the dial is the whole difference: same rule, same target, two fates' : line,
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
          new walk
        </button>
        <span className="viz-stat">
          {snap.line || 'the critic sets out…'}
        </span>
      </div>
    </>
  );
}
