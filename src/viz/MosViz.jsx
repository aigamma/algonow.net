import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts over the same query points. Each query is a dot in the
// (l, r) plane; the window pays |dl| + |dr| to hop between dots, and
// the meter counts every unit. Act one visits in arrival order: a red
// crisscross and a spinning meter. Act two sorts by (l-block, snaked
// r): the same dots become a tidy boustrophedon, the strip below
// shows the actual window sliding, and the meter lands far lower:
// same queries, same machinery, only the path changed.
const W = 640;
const H = 300;
const SEED = 20260827;
const NQ = 16;
const HOP_TICKS = 13;
const ACT_HOLD = 52;
const BLOCK = 25;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < NQ; i++) {
    const l = Math.floor(rand() * 70);
    const r = l + 6 + Math.floor(rand() * (92 - l));
    pts.push({ l, r });
  }
  const moOrder = pts
    .map((p, i) => i)
    .sort((a, b) => {
      const ba = Math.floor(pts[a].l / BLOCK);
      const bb = Math.floor(pts[b].l / BLOCK);
      if (ba !== bb) return ba - bb;
      const ra = ba % 2 === 1 ? -pts[a].r : pts[a].r;
      const rb = bb % 2 === 1 ? -pts[b].r : pts[b].r;
      return ra - rb;
    });
  const cost = (order) => {
    let c = 0;
    let L = 0;
    let R = 0;
    order.forEach((i) => {
      c += Math.abs(pts[i].l - L) + Math.abs(pts[i].r - R);
      L = pts[i].l;
      R = pts[i].r;
    });
    return c;
  };
  const arrival = pts.map((_, i) => i);
  return {
    pts,
    acts: [
      { order: arrival, cost: cost(arrival), note: 'act 1 · arrival order: the window crisscrosses', bad: true },
      { order: moOrder, cost: cost(moOrder), note: "act 2 · Mo's order: l-blocks, snaked r: same queries", bad: false },
    ],
  };
}

export default function MosViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const ACT_TOTAL = NQ * HOP_TICKS + ACT_HOLD;

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 45,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 3571),
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
              scene: makeScene(SEED + cycle.current * 3571),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= ACT_TOTAL) {
          s.tick = 0;
          s.act += 1;
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
        const pts = s.scene.pts;
        const tick = done ? ACT_TOTAL - 1 : s.tick;
        const hops = Math.min(Math.floor(tick / HOP_TICKS), NQ);
        const frac = hops < NQ ? ((tick % HOP_TICKS) + 1) / HOP_TICKS : 1;

        // Plane: x = l in [0,99] -> [40, 600]; y = r in [0,99] -> [200, 34].
        const X = (l) => 40 + (l / 99) * 560;
        const Y = (r) => 200 - (r / 99) * 166;

        ctx.strokeStyle = '#2a3450';
        ctx.strokeRect(40, 34, 560, 166);
        if (!act.bad) {
          for (let b = BLOCK; b < 100; b += BLOCK) {
            ctx.strokeStyle = '#2a3450';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(X(b), 34);
            ctx.lineTo(X(b), 200);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Path so far plus the in-flight segment.
        const seq = act.order;
        let px = 0;
        let py = 0;
        ctx.strokeStyle = act.bad ? warn : good;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        let curL = 0;
        let curR = 0;
        let spent = 0;
        for (let h = 0; h < hops; h++) {
          const p = pts[seq[h]];
          if (h === 0) ctx.moveTo(X(curL), Y(curR));
          ctx.lineTo(X(p.l), Y(p.r));
          spent += Math.abs(p.l - curL) + Math.abs(p.r - curR);
          curL = p.l;
          curR = p.r;
        }
        let showL = curL;
        let showR = curR;
        if (hops < NQ) {
          const p = pts[seq[hops]];
          showL = curL + (p.l - curL) * frac;
          showR = curR + (p.r - curR) * frac;
          if (hops === 0) ctx.moveTo(X(curL), Y(curR));
          ctx.lineTo(X(showL), Y(showR));
          spent += Math.round((Math.abs(p.l - curL) + Math.abs(p.r - curR)) * frac);
        }
        ctx.stroke();

        // The query points.
        const visited = new Set(seq.slice(0, hops));
        pts.forEach((p, i) => {
          ctx.fillStyle = visited.has(i) ? (act.bad ? warn : good) : algo;
          ctx.beginPath();
          ctx.arc(X(p.l), Y(p.r), 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // The window dot and the array strip below.
        ctx.fillStyle = heur;
        ctx.beginPath();
        ctx.arc(X(showL), Y(showR), 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a3450';
        ctx.fillRect(40, 228, 560, 10);
        ctx.fillStyle = heur;
        ctx.fillRect(X(showL), 228, Math.max(2, X(showR) - X(showL)), 10);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('the window itself: [l, r] sliding on the array', 40, 252);

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 20);

        let line;
        if (!done && hops < NQ) {
          line = `query ${hops + 1}/${NQ} · moves so far: ${spent.toLocaleString()}`;
          ctx.fillStyle = act.bad ? warn : good;
        } else {
          const a0 = s.scene.acts[0].cost;
          const a1 = s.scene.acts[1].cost;
          if (actIdx === 0) {
            line = `arrival order total: ${a0.toLocaleString()} moves`;
            ctx.fillStyle = warn;
          } else {
            line = `same ${NQ} queries: ${a0.toLocaleString()} moves became ${a1.toLocaleString()}: the schedule is the algorithm`;
            ctx.fillStyle = good;
          }
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

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
          new queries
        </button>
        <span className="viz-stat">
          {snap.line || 'the cart rolls out…'}
        </span>
      </div>
    </>
  );
}
