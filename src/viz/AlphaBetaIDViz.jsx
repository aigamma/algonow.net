import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one search. Act one: a small game tree searched by
// the final ID iteration: visited nodes light green in order,
// and every cutoff shades a whole sibling subtree red: unopened,
// with a proof: the counter racing the full tree's size. Act
// two: the paradox as a ladder: each ID iteration's cost stacked
// against one blind full-depth search on the same tree.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;
const B1 = 3;
const D1 = 4;

export function makeGame(rand, b, depth) {
  const inc = Array.from({ length: depth }, () => Array.from({ length: b }, () => Math.floor(rand() * 201) - 100));
  const key = Math.floor(rand() * (1 << 30));
  const leaf = (path) => {
    let total = 0;
    path.forEach((m, i) => {
      total += i % 2 === 0 ? inc[i][m] : -inc[i][m];
    });
    let h = 2166136261 ^ key;
    for (const m of path) {
      h = Math.imul(h ^ (m + 101), 16777619) >>> 0;
    }
    return total + (h % 121) - 60;
  };
  return { b, depth, leaf };
}

export function minimax(g, path, depth, count) {
  count.c += 1;
  if (depth === 0) {
    const v = g.leaf(path);
    return path.length % 2 === 0 ? v : -v;
  }
  let best = -1e9;
  for (let m = 0; m < g.b; m++) {
    const v = -minimax(g, [...path, m], depth - 1, count);
    if (v > best) best = v;
  }
  return best;
}

export function alphabeta(g, path, depth, alpha, beta, count, orderOf, trace, first) {
  count.c += 1;
  if (trace) trace.push({ type: 'visit', path: [...path] });
  if (depth === 0) {
    const v = g.leaf(path);
    return path.length % 2 === 0 ? v : -v;
  }
  const moves = orderOf(path, depth);
  let best = -1e9;
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const v = -alphabeta(g, [...path, m], depth - 1, -beta, -alpha, count, orderOf, trace, first);
    if (v > best) {
      best = v;
      if (first) first.set(path.join(','), m);
    }
    if (best > alpha) alpha = best;
    if (alpha >= beta) {
      if (trace) {
        for (let j = i + 1; j < moves.length; j++) {
          trace.push({ type: 'prune', path: [...path, moves[j]] });
        }
      }
      break;
    }
  }
  return best;
}

export function runId(g, depth, orderStatic, wantTrace) {
  let table = new Map();
  const history = new Map();
  const perDepth = [];
  let v = null;
  let trace = null;
  for (let d = 1; d <= depth; d++) {
    const first = new Map();
    const orderOf = (path) => {
      const ply = path.length;
      const ms = [...Array(g.b).keys()].sort(
        (a, b2) => (history.get(`${ply}:${b2}`) ?? 0) - (history.get(`${ply}:${a}`) ?? 0),
      );
      const bm = table.get(path.join(','));
      if (bm !== undefined) {
        ms.splice(ms.indexOf(bm), 1);
        ms.unshift(bm);
      }
      return ms;
    };
    const count = { c: 0 };
    const tr = wantTrace && d === depth ? [] : null;
    v = alphabeta(g, [], d, -1e9, 1e9, count, orderOf, tr, first);
    if (tr) trace = tr;
    perDepth.push(count.c);
    for (const [p, m] of first) {
      const ply = p === '' ? 0 : p.split(',').length;
      const k = `${ply}:${m}`;
      history.set(k, (history.get(k) ?? 0) + 1);
    }
    table = first;
  }
  return { v, perDepth, trace };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // act 1: small tree, traced final iteration
  const g1 = makeGame(rand, B1, D1);
  const mmCount = { c: 0 };
  const ref1 = minimax(g1, [], D1, mmCount);
  const id1 = runId(g1, D1, null, true);
  // act 2: the ladder on a bigger tree
  const g2 = makeGame(rand, 6, 6);
  const mm2 = { c: 0 };
  const ref2 = minimax(g2, [], 6, mm2);
  const id2 = runId(g2, 6, null, false);
  const cBlind = { c: 0 };
  const shuffled = (path) => {
    const ms = [...Array(g2.b).keys()];
    for (let i = ms.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [ms[i], ms[j]] = [ms[j], ms[i]];
    }
    return ms;
  };
  const vBlind = alphabeta(g2, [], 6, -1e9, 1e9, cBlind, shuffled, null, null);
  return {
    g1,
    ref1,
    idVal1: id1.v,
    trace: id1.trace,
    totalNodes1: mmCount.c,
    ref2,
    idVal2: id2.v,
    vBlind,
    perDepth: id2.perDepth,
    blind: cBlind.c,
    mm2: mm2.c,
  };
}

function nodeXY(path) {
  // layered layout for b=3, d=4
  let x = 0.5;
  let span = 0.5;
  for (const m of path) {
    span /= 3;
    x += (m - 1) * span * 2;
  }
  return [30 + x * 580, 44 + path.length * 44];
}

export default function AlphaBetaIDViz() {
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
        const len = s.act === 0 ? s.scene.trace.length * 2 + END_HOLD : 200 + END_HOLD;
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
          const T = sc.trace.length * 2;
          const t = done ? T : Math.min(s.tick, T);
          const upto = Math.min(sc.trace.length, Math.floor(t / 2));
          ctx.fillText('act 1 · the final ID pass on a b=3, d=4 tree: yesterday’s best move first, whole subtrees die unopened', 14, 20);
          // skeleton edges
          ctx.strokeStyle = 'rgba(154,165,189,0.18)';
          const drawEdges = (path) => {
            if (path.length >= D1) return;
            const [x1, y1] = nodeXY(path);
            for (let m = 0; m < B1; m++) {
              const child = [...path, m];
              const [x2, y2] = nodeXY(child);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              drawEdges(child);
            }
          };
          drawEdges([]);
          // events
          let visited = 0;
          for (let i = 0; i < upto; i++) {
            const ev = sc.trace[i];
            const [x, y] = nodeXY(ev.path);
            if (ev.type === 'visit') {
              visited += 1;
              ctx.fillStyle = good;
              ctx.beginPath();
              ctx.arc(x, y, ev.path.length === D1 ? 2.2 : 3.2, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // shade the pruned subtree region
              let span = 0.5;
              for (let k = 0; k < ev.path.length; k++) span /= 3;
              const width = span * 2 * 580;
              ctx.fillStyle = 'rgba(226,96,108,0.10)';
              ctx.fillRect(x - width / 2, y - 8, width, (D1 - ev.path.length) * 44 + 20);
              ctx.strokeStyle = 'rgba(226,96,108,0.5)';
              ctx.strokeRect(x - width / 2, y - 8, width, (D1 - ev.path.length) * 44 + 20);
            }
          }
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`visited ${visited} / ${sc.totalNodes1} total`, 480, 40);
          let line;
          if (done || upto >= sc.trace.length) {
            line = `value ${sc.idVal1} == exhaustive minimax's ${sc.ref1}: same answer, a fraction of the tree opened`;
            ctx.fillStyle = good;
          } else {
            line = 'red regions: proven irrelevant by one strong reply, never opened';
            ctx.fillStyle = warn;
          }
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · the paradox on a b=6, d=6 tree: every ID iteration stacked vs one blind full-depth search', 14, 20);
          const frac = Math.min(1, t / 200);
          const totalId = sc.perDepth.reduce((a, b) => a + b, 0);
          const maxW = Math.max(sc.blind, totalId);
          // stacked ID bar
          let x = 60;
          const y1 = 80;
          ctx.fillStyle = algo;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`all ${sc.perDepth.length} ID iterations: ${Math.floor(frac * totalId).toLocaleString()} nodes`, 60, y1 - 10);
          for (let i = 0; i < sc.perDepth.length; i++) {
            const w = 500 * ((sc.perDepth[i] * Math.min(1, frac * 1.2)) / maxW);
            ctx.fillStyle = `rgba(93,162,255,${0.25 + i * 0.12})`;
            ctx.fillRect(x, y1, w, 18);
            ctx.strokeStyle = algo;
            ctx.strokeRect(x, y1, w, 18);
            x += w;
          }
          const y2 = 150;
          ctx.fillStyle = warn;
          ctx.fillText(`one blind depth-6 search: ${Math.floor(frac * sc.blind).toLocaleString()} nodes`, 60, y2 - 10);
          ctx.strokeStyle = warn;
          ctx.strokeRect(60, y2, 500 * (sc.blind / maxW), 18);
          ctx.fillStyle = 'rgba(226,96,108,0.35)';
          ctx.fillRect(60, y2, 500 * ((frac * sc.blind) / maxW), 18);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`exhaustive minimax on this tree: ${sc.mm2.toLocaleString()} nodes · every method's value agrees: ${sc.ref2}`, 60, 200);
          let line;
          if (done || t >= 200) {
            line = `${sc.perDepth.length} searches for ${(100 * totalId / sc.blind).toFixed(0)}% of one blind search's bill: the shallow passes are the guide, not the overhead`;
            ctx.fillStyle = good;
          } else {
            line = 'each iteration is a geometric fraction of the next: the memory it leaves is worth more than it costs';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'deepen, remember, order, cut: yesterday’s search is today’s oracle'
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
          new tree
        </button>
        <span className="viz-stat">
          {snap.line || 'deepening…'}
        </span>
      </div>
    </>
  );
}
