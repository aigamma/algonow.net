import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts on one map of eight cities. Act one: the ledger fills:
// the subset lattice rises layer by popcount layer (a cell per
// (S, endpoint) predicament, lit as the real DP settles it), the
// transition meter ticking against the factorial's stated count.
// Act two: the tours: nearest neighbor draws itself in red (watch
// the crossings), 2-opt uncrosses to amber, and the DP's proven
// tour lands in green with the three costs side by side.
const W = 640;
const H = 300;
const SEED = 20260827;
const NC = 8;
const LAYER_TICKS = 40;
const TOUR_TICKS = 90;
const END_HOLD = 70;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const pts = [];
  let tries = 0;
  while (pts.length < NC) {
    tries += 1;
    const gap = tries > 300 ? 40 : 60;
    const p = [60 + rand() * 520, 50 + rand() * 160];
    if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > gap)) pts.push(p);
  }
  const d = (a, b) => Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);
  // Held-Karp for real.
  const m = NC - 1;
  const FULL = 1 << m;
  const INF = Infinity;
  const dp = Array.from({ length: FULL }, () => Array(m).fill(INF));
  const par = Array.from({ length: FULL }, () => Array(m).fill(-1));
  let transitions = 0;
  for (let j = 0; j < m; j++) dp[1 << j][j] = d(0, j + 1);
  for (let S = 1; S < FULL; S++) {
    for (let j = 0; j < m; j++) {
      if (!((S >> j) & 1) || dp[S][j] === INF) continue;
      for (let k = 0; k < m; k++) {
        if ((S >> k) & 1) continue;
        transitions += 1;
        const nS = S | (1 << k);
        const cand = dp[S][j] + d(j + 1, k + 1);
        if (cand < dp[nS][k]) {
          dp[nS][k] = cand;
          par[nS][k] = j;
        }
      }
    }
  }
  let best = INF;
  let bj = -1;
  for (let j = 0; j < m; j++) {
    const c = dp[FULL - 1][j] + d(j + 1, 0);
    if (c < best) {
      best = c;
      bj = j;
    }
  }
  let S = FULL - 1;
  let j = bj;
  const rev = [];
  while (j !== -1) {
    rev.push(j + 1);
    const pj = par[S][j];
    S ^= 1 << j;
    j = pj;
  }
  const optTour = [0, ...rev.reverse(), 0];
  // NN and 2-opt.
  const seen = new Set([0]);
  const nn = [0];
  while (seen.size < NC) {
    const cur = nn[nn.length - 1];
    let bk = -1;
    let bd = Infinity;
    for (let k = 0; k < NC; k++) {
      if (!seen.has(k) && d(cur, k) < bd) {
        bd = d(cur, k);
        bk = k;
      }
    }
    nn.push(bk);
    seen.add(bk);
  }
  nn.push(0);
  const cost = (t) => t.slice(1).reduce((a, v, i) => a + d(t[i], v), 0);
  const t2 = nn.slice();
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < t2.length - 2; i++) {
      for (let k = i + 1; k < t2.length - 1; k++) {
        if (
          d(t2[i - 1], t2[k]) + d(t2[i], t2[k + 1]) <
          d(t2[i - 1], t2[i]) + d(t2[k], t2[k + 1]) - 1e-9
        ) {
          const mid = t2.slice(i, k + 1).reverse();
          t2.splice(i, k + 1 - i, ...mid);
          improved = true;
        }
      }
    }
  }
  // Layer counts for the lattice act: states per popcount.
  const layers = Array(m + 1).fill(0);
  for (let s2 = 1; s2 < FULL; s2++) {
    let pc = 0;
    for (let b = 0; b < m; b++) pc += (s2 >> b) & 1;
    layers[pc] += 1;
  }
  return {
    pts,
    optTour,
    nn,
    t2,
    costs: { opt: cost(optTour), nn: cost(nn), t2: cost(t2) },
    transitions,
    layers,
    m,
  };
}

export default function HeldKarpViz() {
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
        scene: makeScene(SEED + cycle.current * 4933),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const A1 = (s.scene.m + 1) * LAYER_TICKS + 40;
        const A2 = 3 * TOUR_TICKS + END_HOLD;
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 4933),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= (s.act === 0 ? A1 : A2)) {
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

        const sc = s.scene;
        if (s.act === 0) {
          const lit = Math.min(Math.floor(s.tick / LAYER_TICKS) + 1, sc.m + 1);
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 1 · the ledger fills by subset size: a page per (visited set, endpoint): cheaper arrival kept', 14, 20);
          for (let layer = 1; layer <= sc.m; layer++) {
            const count = sc.layers[layer];
            const y = 236 - layer * 28;
            const w = Math.min(500, count * 14);
            const on = layer < lit;
            ctx.fillStyle = on
              ? layer === sc.m
                ? 'rgba(98,217,138,0.35)'
                : 'rgba(93,162,255,0.22)'
              : '#1a2138';
            ctx.fillRect(320 - w / 2, y, w, 20);
            ctx.strokeStyle = on ? (layer === sc.m ? good : algo) : '#2a3450';
            ctx.strokeRect(320 - w / 2, y, w, 20);
            ctx.fillStyle = dim;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(`|S|=${layer}: ${count * sc.m} pages`, 320 + w / 2 + 8, y + 14);
          }
          const line =
            lit > sc.m
              ? `ledger complete: ${sc.transitions.toLocaleString()} transitions vs ${(5040).toLocaleString()} orderings at n = 8`
              : `filling layer ${lit}: every set built from the layer below`;
          ctx.fillStyle = lit > sc.m ? good : dim;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const done = s.act >= 2;
          const t = done ? 3 * TOUR_TICKS : Math.min(s.tick, 3 * TOUR_TICKS);
          const phase = Math.min(Math.floor(t / TOUR_TICKS), 2);
          const frac = done ? 1 : Math.min(1, (t % TOUR_TICKS) / (TOUR_TICKS - 15));
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('act 2 · three tours, one map: greedy red, uncrossed amber, PROVEN green', 14, 20);
          const drawTour = (tour, color, f, width) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            const steps = Math.max(2, Math.floor(tour.length * f));
            for (let i = 0; i < steps; i++) {
              const [x, y] = sc.pts[tour[i]];
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          };
          if (phase >= 0) drawTour(sc.nn, warn, phase === 0 ? frac : 1, phase === 0 ? 2.4 : 1.1);
          if (phase >= 1) drawTour(sc.t2, heur, phase === 1 ? frac : 1, phase === 1 ? 2.4 : 1.3);
          if (phase >= 2) drawTour(sc.optTour, good, frac, 2.6);
          sc.pts.forEach(([x, y], i) => {
            ctx.beginPath();
            ctx.arc(x, y, i === 0 ? 7 : 5, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? algo : '#243052';
            ctx.fill();
            ctx.strokeStyle = '#40507a';
            ctx.stroke();
          });
          const c = sc.costs;
          let line;
          if (phase === 0) {
            line = `nearest neighbor: ${c.nn.toFixed(0)} (+${(100 * (c.nn / c.opt - 1)).toFixed(0)}% over the optimum it cannot see)`;
            ctx.fillStyle = warn;
          } else if (phase === 1) {
            line = `2-opt uncrosses: ${c.t2.toFixed(0)} (+${(100 * (c.t2 / c.opt - 1)).toFixed(1)}%)`;
            ctx.fillStyle = heur;
          } else {
            line = `Held-Karp: ${c.opt.toFixed(0)}: PROVEN minimal: the number the others are measured against`;
            ctx.fillStyle = good;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        }
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
          new cities
        </button>
        <span className="viz-stat">
          {snap.line || 'the ledger opens…'}
        </span>
      </div>
    </>
  );
}
