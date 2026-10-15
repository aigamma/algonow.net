import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// 2-opt on a seeded random tour through thirteen points in the unit square,
// one swap every two ticks: the first tick shows the pair of edges about to
// go (red) and the pair that replaces them (amber dashed), the second tick
// applies the reversal. Crossing pairs are taken first, then the remaining
// improving swaps that cross nothing, so the viewer sees that 2-opt does
// more than uncross. The invariant checked on every swap is that the tour
// stays a permutation, strictly shortens by exactly the predicted delta, and
// never beats the exact Held-Karp optimum computed at the start; at the
// local optimum the crossing count must be zero.
const W = 640;
const H = 300;
const SEED = 20261010;
const N = 13;

function tourLength(D, tour) {
  let s = 0;
  for (let i = 0; i < tour.length; i += 1) s += D[tour[i]][tour[(i + 1) % tour.length]];
  return s;
}

function orient(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsCross(p1, p2, p3, p4) {
  const o1 = orient(p1, p2, p3);
  const o2 = orient(p1, p2, p4);
  const o3 = orient(p3, p4, p1);
  const o4 = orient(p3, p4, p2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function countCrossings(pts, tour) {
  const n = tour.length;
  let c = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsCross(pts[tour[i]], pts[tour[(i + 1) % n]], pts[tour[j]], pts[tour[(j + 1) % n]])) c += 1;
    }
  }
  return c;
}

export function heldKarp(D) {
  const n = D.length;
  const size = 1 << n;
  const dp = new Float64Array(size * n).fill(Infinity);
  dp[1 * n + 0] = 0;
  for (let mask = 1; mask < size; mask += 2) {
    for (let last = 0; last < n; last += 1) {
      const cur = dp[mask * n + last];
      if (cur === Infinity) continue;
      for (let nxt = 1; nxt < n; nxt += 1) {
        const bit = 1 << nxt;
        if (mask & bit) continue;
        const idx = (mask | bit) * n + nxt;
        const val = cur + D[last][nxt];
        if (val < dp[idx]) dp[idx] = val;
      }
    }
  }
  let best = Infinity;
  for (let last = 1; last < n; last += 1) best = Math.min(best, dp[(size - 1) * n + last] + D[last][0]);
  return best;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const pts = Array.from({ length: N }, () => [0.06 + 0.88 * rand(), 0.06 + 0.88 * rand()]);
  const D = pts.map((p) => pts.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
  const tour = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const t = tour[i];
    tour[i] = tour[j];
    tour[j] = t;
  }
  const len = tourLength(D, tour);
  const cross = countCrossings(pts, tour);
  const opt = heldKarp(D);
  return { pts, D, tour, len, start: len, startCross: cross, cross, opt, swaps: 0, uncross: 0, pending: null, done: false, ok: true, last: `random tour of ${N} cities: length ${len.toFixed(3)}, ${cross} crossings; the exact optimum is ${opt.toFixed(3)}` };
}

function findMove(sc) {
  const { tour, D, pts } = sc;
  const n = tour.length;
  let first = null;
  for (let i = 0; i < n; i += 1) {
    const a = tour[i];
    const b = tour[(i + 1) % n];
    const jEnd = i === 0 ? n - 1 : n;
    for (let j = i + 2; j < jEnd; j += 1) {
      const c = tour[j];
      const d = tour[(j + 1) % n];
      const delta = D[a][c] + D[b][d] - D[a][b] - D[c][d];
      if (delta < -1e-12) {
        if (segmentsCross(pts[a], pts[b], pts[c], pts[d])) return { i, j, delta, crossing: true };
        if (!first) first = { i, j, delta, crossing: false };
      }
    }
  }
  return first;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.pending) {
    const { i, j, delta, crossing } = sc.pending;
    const seg = sc.tour.slice(i + 1, j + 1).reverse();
    sc.tour.splice(i + 1, seg.length, ...seg);
    const newLen = tourLength(sc.D, sc.tour);
    const perm = [...sc.tour].sort((x, y) => x - y).every((v, k) => v === k);
    sc.ok = sc.ok && perm && newLen < sc.len - 1e-12 && Math.abs(newLen - (sc.len + delta)) < 1e-9 && newLen >= sc.opt - 1e-9;
    sc.len = newLen;
    sc.cross = countCrossings(sc.pts, sc.tour);
    sc.swaps += 1;
    if (crossing) sc.uncross += 1;
    sc.last = `swap ${sc.swaps} (${crossing ? 'uncrossing' : 'shortcut, nothing crossed'}): length ${sc.len.toFixed(3)}, ${sc.cross} crossings left`;
    sc.pending = null;
    return false;
  }
  const mv = findMove(sc);
  if (!mv) {
    sc.done = true;
    sc.ok = sc.ok && sc.cross === 0;
    const gap = 100 * (sc.len / sc.opt - 1);
    sc.last = `local optimum after ${sc.swaps} swaps (${sc.uncross} uncrossings): length ${sc.len.toFixed(3)} from ${sc.start.toFixed(3)}, ${sc.cross} crossings; ${gap < 1e-6 ? 'this one is the exact optimum' : `${gap.toFixed(2)}% above the exact optimum ${sc.opt.toFixed(3)}`}`;
    return true;
  }
  sc.pending = mv;
  sc.last = `${mv.crossing ? 'two edges cross' : 'nothing crosses; an improving swap remains'}: drop the red pair, add the amber pair, save ${(-mv.delta).toFixed(3)}`;
  return false;
}

export function summarize(sc) {
  return { ok: sc.ok, swaps: sc.swaps, uncross: sc.uncross, cross: sc.cross, gapPct: Number((100 * (sc.len / sc.opt - 1)).toFixed(3)) };
}

export default function TwoOptViz() {
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
      stepMs: 280,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const n = sc.tour.length;
        const bx = 16;
        const by = 14;
        const bs = 262;
        const px = (p) => [bx + p[0] * bs, by + p[1] * bs];
        ctx.font = '11px ui-monospace, monospace';
        ctx.lineWidth = 1.5;
        const removed = new Set();
        if (sc.pending) {
          removed.add(sc.pending.i);
          removed.add(sc.pending.j);
        }
        for (let k = 0; k < n; k += 1) {
          const [x1, y1] = px(sc.pts[sc.tour[k]]);
          const [x2, y2] = px(sc.pts[sc.tour[(k + 1) % n]]);
          ctx.strokeStyle = removed.has(k) ? warn : s.done ? good : algo;
          ctx.lineWidth = removed.has(k) ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        if (sc.pending) {
          const { i, j } = sc.pending;
          const a = px(sc.pts[sc.tour[i]]);
          const b = px(sc.pts[sc.tour[(i + 1) % n]]);
          const c = px(sc.pts[sc.tour[j]]);
          const d = px(sc.pts[sc.tour[(j + 1) % n]]);
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(c[0], c[1]);
          ctx.moveTo(b[0], b[1]);
          ctx.lineTo(d[0], d[1]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = ink;
        for (const p of sc.pts) {
          const [x, y] = px(p);
          ctx.beginPath();
          ctx.arc(x, y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        const tx = 304;
        ctx.fillStyle = dim;
        ctx.fillText(`2-opt: ${n} cities, random starting tour`, tx, 24);
        ctx.fillText('red: removed; amber dashed: replacements', tx, 40);
        ctx.fillStyle = ink;
        ctx.fillText(`length ${sc.len.toFixed(3)}  (start ${sc.start.toFixed(3)}, exact optimum ${sc.opt.toFixed(3)})`, tx, 68);
        ctx.fillText(`crossings ${sc.cross} (start ${sc.startCross}); swaps ${sc.swaps} (${sc.uncross} uncross)`, tx, 86);
        const barX = tx;
        const barW = 316;
        const scale = (v) => barX + (barW * v) / sc.start;
        ctx.fillStyle = `${dim}55`;
        ctx.fillRect(barX, 104, barW, 10);
        ctx.fillStyle = s.done ? good : algo;
        ctx.fillRect(barX, 104, scale(sc.len) - barX, 10);
        ctx.fillStyle = heur;
        ctx.fillRect(scale(sc.opt) - 1, 100, 2, 18);
        ctx.fillStyle = dim;
        ctx.fillText('length / start; amber: exact Held-Karp optimum', barX, 132);
        ctx.fillText('uncrossing improves a Euclidean tour;', tx, 160);
        ctx.fillText('a local optimum has no crossings.', tx, 176);
        ctx.fillText('solution: 103 swaps at n=400; +1.85% at n=16', tx, 192);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'permutation; predicted descent; ≥ optimum' : 'INVARIANT BROKEN', tx, 216);
        const line = sc.last;
        ctx.fillStyle = s.done ? good : ink;
        ctx.fillText(line.length > 100 ? `${line.slice(0, 99)}…` : line, 12, H - 6);
        statsRef.current = { line };
      },
    },
    [restart],
  );

  return (
    <>
      <DiagramViewport width={W}>
        <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      </DiagramViewport>
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
        <span className="viz-stat">{snap.line || 'untangling…'}</span>
      </div>
    </>
  );
}
