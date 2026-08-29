import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one carve. Act one: the plane splits at medians,
// axes alternating, until every point owns a cell: then a query
// drops in: the best ball shrinks candidate by candidate, and
// whole regions flash red as the slab test proves them
// irrelevant, unopened. The counter tallies nodes visited
// against the brute scan's everything. Act two: the curse: the
// same code at d = 2, 4, 8, 12, average visits climbing toward
// n as the prune dies.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;
const N1 = 140;

export function buildKd(pts, depth, d, bbox) {
  if (!pts.length) return null;
  const axis = depth % d;
  const sorted = [...pts].sort((a, b) => a[axis] - b[axis]);
  const mid = sorted.length >> 1;
  const pt = sorted[mid];
  const lb = bbox.map((r) => [...r]);
  lb[axis][1] = pt[axis];
  const rb = bbox.map((r) => [...r]);
  rb[axis][0] = pt[axis];
  return {
    pt,
    axis,
    depth,
    bbox,
    left: buildKd(sorted.slice(0, mid), depth + 1, d, lb),
    right: buildKd(sorted.slice(mid + 1), depth + 1, d, rb),
  };
}

export function segmentsOf(root) {
  const segs = [];
  const walk = (n) => {
    if (!n) return;
    segs.push({ axis: n.axis, at: n.pt[n.axis], span: n.bbox[1 - n.axis] ?? null, bbox: n.bbox, depth: n.depth });
    walk(n.left);
    walk(n.right);
  };
  walk(root);
  segs.sort((a, b) => a.depth - b.depth);
  return segs;
}

const d2 = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);

export function nnTrace(root, q) {
  // returns { best, events: [{type:'visit'|'prune', ...}], visited }
  const events = [];
  let best = Infinity;
  let bestPt = null;
  let visited = 0;
  const visit = (node) => {
    if (!node) return;
    visited += 1;
    const dd = d2(node.pt, q);
    if (dd < best) {
      best = dd;
      bestPt = node.pt;
    }
    events.push({ type: 'visit', pt: node.pt, best });
    const delta = q[node.axis] - node.pt[node.axis];
    const [near, far] = delta < 0 ? [node.left, node.right] : [node.right, node.left];
    visit(near);
    if (delta * delta < best) {
      visit(far);
    } else if (far) {
      events.push({ type: 'prune', bbox: far.bbox });
    }
  };
  visit(root);
  return { best, bestPt, events, visited };
}

export function bruteNn(pts, q) {
  let best = Infinity;
  for (const p of pts) best = Math.min(best, d2(p, q));
  return best;
}

export function curseSweep(rand, n, dims, queries) {
  const out = [];
  for (const d of dims) {
    const pts = Array.from({ length: n }, () => Array.from({ length: d }, () => rand()));
    const bbox = Array.from({ length: d }, () => [-Infinity, Infinity]);
    const root = buildKd(pts, 0, d, bbox);
    let total = 0;
    let ok = true;
    for (let i = 0; i < queries; i++) {
      const q = Array.from({ length: d }, () => rand());
      const t = nnTrace(root, q);
      total += t.visited;
      if (t.best !== bruteNn(pts, q)) ok = false;
    }
    out.push({ d, avg: total / queries, ok });
  }
  return out;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const pts = Array.from({ length: N1 }, () => [rand(), rand()]);
  const root = buildKd(pts, 0, 2, [[-Infinity, Infinity], [-Infinity, Infinity]]);
  const segs = segmentsOf(root);
  const q = [0.25 + rand() * 0.5, 0.25 + rand() * 0.5];
  const trace = nnTrace(root, q);
  const bruteBest = bruteNn(pts, q);
  const curse = curseSweep(rand, 512, [2, 4, 8, 12], 30);
  return { pts, segs, q, trace, bruteBest, curse };
}

const PX = (x) => 30 + x * 290;
const PY = (y) => 34 + y * 230;

export default function KdTreeViz() {
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
      stepMs: 55,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
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
              scene: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0
          ? 90 + s.scene.trace.events.length * 4 + END_HOLD
          : 200 + END_HOLD;
        if (s.tick >= len) {
          s.tick = len;
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
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const evLen = sc.trace.events.length;
          const total = 90 + evLen * 4;
          const t = done ? total : Math.min(s.tick, total);
          const carveFrac = Math.min(1, t / 90);
          const evIdx = t <= 90 ? 0 : Math.min(evLen, Math.floor((t - 90) / 4));
          ctx.fillText('act 1 · carve at medians, cycle the axes: then one query, one shrinking ball, whole regions closed unopened', 14, 20);
          // frame
          ctx.strokeStyle = 'rgba(154,165,189,0.4)';
          ctx.strokeRect(PX(0), PY(0), 290, 230);
          // splits appear by depth
          const maxDepth = sc.segs[sc.segs.length - 1].depth;
          const showDepth = carveFrac * (maxDepth + 1);
          for (const seg of sc.segs) {
            if (seg.depth > showDepth) continue;
            if (seg.depth > 3) continue; // deeper cuts clutter: carve is legible at 4 levels
            const other = seg.bbox[1 - seg.axis];
            const lo = Math.max(0, other[0] === -Infinity ? 0 : other[0]);
            const hi = Math.min(1, other[1] === Infinity ? 1 : other[1]);
            ctx.strokeStyle = seg.axis === 0 ? `${algo}${seg.depth < 2 ? 'DD' : '66'}` : `${heur}${seg.depth < 2 ? 'DD' : '66'}`;
            ctx.lineWidth = seg.depth < 2 ? 1.8 : 1;
            ctx.beginPath();
            if (seg.axis === 0) {
              ctx.moveTo(PX(seg.at), PY(lo));
              ctx.lineTo(PX(seg.at), PY(hi));
            } else {
              ctx.moveTo(PX(lo), PY(seg.at));
              ctx.lineTo(PX(hi), PY(seg.at));
            }
            ctx.stroke();
          }
          // points
          for (const [x, y] of sc.pts) {
            ctx.fillStyle = 'rgba(154,165,189,0.75)';
            ctx.fillRect(PX(x) - 1.4, PY(y) - 1.4, 2.8, 2.8);
          }
          let line;
          if (t <= 90) {
            line = `the carve: median splits, axes alternating (blue x, amber y): balanced by construction`;
            ctx.fillStyle = ink;
          } else {
            // query phase
            let best = Infinity;
            let visited = 0;
            for (let i = 0; i < evIdx; i++) {
              const ev = sc.trace.events[i];
              if (ev.type === 'prune') {
                const [bx, by] = ev.bbox;
                const x0 = Math.max(0, bx[0] === -Infinity ? 0 : bx[0]);
                const x1 = Math.min(1, bx[1] === Infinity ? 1 : bx[1]);
                const y0 = Math.max(0, by[0] === -Infinity ? 0 : by[0]);
                const y1 = Math.min(1, by[1] === Infinity ? 1 : by[1]);
                ctx.fillStyle = 'rgba(226,96,108,0.13)';
                ctx.fillRect(PX(x0), PY(y0), (x1 - x0) * 290, (y1 - y0) * 230);
              } else {
                best = ev.best;
                visited += 1;
                ctx.fillStyle = good;
                ctx.fillRect(PX(ev.pt[0]) - 2.2, PY(ev.pt[1]) - 2.2, 4.4, 4.4);
              }
            }
            // query + ball
            ctx.fillStyle = warn;
            ctx.beginPath();
            ctx.arc(PX(sc.q[0]), PY(sc.q[1]), 4, 0, Math.PI * 2);
            ctx.fill();
            if (best < Infinity) {
              const r = Math.sqrt(best);
              ctx.strokeStyle = good;
              ctx.lineWidth = 1.6;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.ellipse(PX(sc.q[0]), PY(sc.q[1]), r * 290, r * 230, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            ctx.fillStyle = ink;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(`visited ${visited} / brute would examine ${N1}`, 350, 60);
            ctx.fillStyle = warn;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText('red regions: proven irrelevant,', 350, 84);
            ctx.fillText('never opened (the slab test)', 350, 98);
            if (evIdx >= evLen) {
              line = `answer exact (equals the full scan): ${sc.trace.visited} visits vs ${N1}: the ball closed the map`;
              ctx.fillStyle = good;
            } else {
              line = 'descend to the home cell, then unwind: every candidate shrinks the ball, and the ball closes folds';
              ctx.fillStyle = heur;
            }
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · the curse, counted: same code, n = 512, dimension rising: average visits per query', 14, 20);
          const frac = Math.min(1, t / 200);
          sc.curse.forEach(({ d, avg }, i) => {
            const y = 56 + i * 48;
            const val = Math.floor(frac * avg);
            const colr = i === 0 ? good : i === 1 ? algo : i === 2 ? heur : warn;
            ctx.fillStyle = colr;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(`d = ${String(d).padEnd(2)} · ${val} visits`, 60, y - 6);
            ctx.strokeStyle = colr;
            ctx.strokeRect(60, y, 500 * Math.min(1, 512 / 512), 12);
            ctx.fillStyle = `${colr}55`;
            ctx.fillRect(60, y, 500 * Math.min(1, val / 512), 12);
          });
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('the outline is n = 512: the bar reaching it means the prune is dead', 60, 248);
          let line;
          if (done || t >= 200) {
            const last = sc.curse[sc.curse.length - 1];
            line = `d = ${last.d}: ${Math.round(last.avg)} of 512 visited (${Math.round((100 * last.avg) / 512)}%): a brute scan wearing a tree costume: change tools, not tuning`;
            ctx.fillStyle = warn;
          } else {
            line = 'every answer stays exact (brute-checked in this figure): only the visit bill explodes';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'carve at medians, prune with the ball, and watch the visit counter: it names your regime'
              : line,
          };
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
          new points
        </button>
        <span className="viz-stat">
          {snap.line || 'folding the map…'}
        </span>
      </div>
    </>
  );
}
