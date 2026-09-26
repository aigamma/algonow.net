import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Christofides on twelve random cities, in three acts. Act 1: Prim grows
// the minimum spanning tree edge by edge. Act 2: the odd-degree cities
// light up (always an even number of them) and the minimum-weight
// perfect matching on exactly those cities is added, which makes every
// degree even. Act 3: an Euler walk of the multigraph is traced and
// shortcut into a tour, and the tour is priced against the exact
// Held-Karp optimum and the plain double-tree shortcut.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 12;

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function primMst(pts) {
  const n = pts.length;
  const inTree = new Array(n).fill(false);
  const best = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  best[0] = 0;
  const edges = [];
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
    inTree[u] = true;
    if (parent[u] >= 0) edges.push([parent[u], u]);
    for (let v = 0; v < n; v++) {
      if (!inTree[v]) {
        const d = dist(pts[u], pts[v]);
        if (d < best[v]) {
          best[v] = d;
          parent[v] = u;
        }
      }
    }
  }
  return edges;
}

export function oddVertices(edges, n) {
  const deg = new Array(n).fill(0);
  for (const [u, v] of edges) {
    deg[u] += 1;
    deg[v] += 1;
  }
  return [...Array(n).keys()].filter((i) => deg[i] % 2 === 1);
}

export function minMatching(odd, pts) {
  const m = odd.length;
  const memo = new Map();
  memo.set(0, { cost: 0, pairs: [] });
  const solve = (mask) => {
    if (memo.has(mask)) return memo.get(mask);
    let i = 0;
    while (!((mask >> i) & 1)) i += 1;
    const rest = mask & ~(1 << i);
    let best = { cost: Infinity, pairs: [] };
    for (let j = i + 1; j < m; j++) {
      if ((rest >> j) & 1) {
        const sub = solve(rest & ~(1 << j));
        const cost = sub.cost + dist(pts[odd[i]], pts[odd[j]]);
        if (cost < best.cost) best = { cost, pairs: [...sub.pairs, [odd[i], odd[j]]] };
      }
    }
    memo.set(mask, best);
    return best;
  };
  return solve((1 << m) - 1);
}

export function eulerWalk(edges, n) {
  const adj = Array.from({ length: n }, () => []);
  edges.forEach(([u, v], idx) => {
    adj[u].push([v, idx]);
    adj[v].push([u, idx]);
  });
  const used = new Array(edges.length).fill(false);
  const stack = [0];
  const walk = [];
  while (stack.length) {
    const u = stack[stack.length - 1];
    while (adj[u].length && used[adj[u][adj[u].length - 1][1]]) adj[u].pop();
    if (adj[u].length) {
      const [v, idx] = adj[u].pop();
      used[idx] = true;
      stack.push(v);
    } else {
      walk.push(stack.pop());
    }
  }
  return walk;
}

export function shortcut(walk) {
  const seen = new Set();
  const tour = [];
  for (const v of walk) {
    if (!seen.has(v)) {
      seen.add(v);
      tour.push(v);
    }
  }
  return tour;
}

export function tourLength(tour, pts) {
  let s = 0;
  for (let i = 0; i < tour.length; i++) s += dist(pts[tour[i]], pts[tour[(i + 1) % tour.length]]);
  return s;
}

export function heldKarp(pts) {
  const n = pts.length;
  const full = 1 << (n - 1);
  const dp = Array.from({ length: full }, () => new Array(n - 1).fill(Infinity));
  for (let j = 0; j < n - 1; j++) dp[1 << j][j] = dist(pts[0], pts[j + 1]);
  for (let mask = 1; mask < full; mask++) {
    for (let j = 0; j < n - 1; j++) {
      if (!((mask >> j) & 1) || dp[mask][j] === Infinity) continue;
      const base = dp[mask][j];
      for (let k = 0; k < n - 1; k++) {
        if ((mask >> k) & 1) continue;
        const nm = mask | (1 << k);
        const cand = base + dist(pts[j + 1], pts[k + 1]);
        if (cand < dp[nm][k]) dp[nm][k] = cand;
      }
    }
  }
  let best = Infinity;
  for (let j = 0; j < n - 1; j++) best = Math.min(best, dp[full - 1][j] + dist(pts[j + 1], pts[0]));
  return best;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const pts = Array.from({ length: N }, () => [20 + rand() * 260, 30 + rand() * 210]);
  const mst = primMst(pts);
  const odd = oddVertices(mst, N);
  const matching = minMatching(odd, pts);
  const walk = eulerWalk([...mst, ...matching.pairs], N);
  const tour = shortcut(walk);
  const doubleTour = shortcut(eulerWalk([...mst, ...mst], N));
  return {
    pts,
    mst,
    odd,
    pairs: matching.pairs,
    walk,
    tour,
    mstLen: mst.reduce((s, [u, v]) => s + dist(pts[u], pts[v]), 0),
    matchLen: matching.cost,
    tourLen: tourLength(tour, pts),
    doubleLen: tourLength(doubleTour, pts),
    opt: heldKarp(pts),
  };
}

export default function ChristofidesViz() {
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
      stepMs: 60,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.act >= 3) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0 });
          }
          return true;
        }
        s.tick += 1;
        const lens = [s.scene.mst.length + 6, s.scene.pairs.length * 6 + 14, s.scene.walk.length * 2 + 12];
        if (s.tick >= lens[s.act]) {
          s.tick = lens[s.act];
          s.actRest += 1;
          if (s.actRest > holdTicks(s)) {
            s.act += 1;
            s.tick = 0;
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const done = s.act >= 3;
        const act = done ? 2 : s.act;
        const t = done ? Infinity : s.tick;
        const titles = [
          'act 1 · Prim grows the minimum spanning tree: a lower bound on any tour',
          'act 2 · the odd-degree cities (always an even count) get a minimum-weight perfect matching',
          'act 3 · an Euler walk of the multigraph, shortcut into a tour by the triangle inequality',
        ];
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(titles[act], 14, 18);

        // MST edges (all in acts 2-3, growing in act 1)
        const mstShown = act === 0 ? Math.min(sc.mst.length, t) : sc.mst.length;
        ctx.strokeStyle = `${algo}AA`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < mstShown; i++) {
          const [u, v] = sc.mst[i];
          ctx.moveTo(sc.pts[u][0], sc.pts[u][1]);
          ctx.lineTo(sc.pts[v][0], sc.pts[v][1]);
        }
        ctx.stroke();

        // matching edges (act 2 onward)
        if (act >= 1) {
          const shown = act === 1 ? Math.min(sc.pairs.length, Math.floor(Math.max(0, t - 8) / 6)) : sc.pairs.length;
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          for (let i = 0; i < shown; i++) {
            const [u, v] = sc.pairs[i];
            ctx.moveTo(sc.pts[u][0], sc.pts[u][1]);
            ctx.lineTo(sc.pts[v][0], sc.pts[v][1]);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          for (const i of sc.odd) {
            ctx.strokeStyle = heur;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sc.pts[i][0], sc.pts[i][1], 8, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Euler walk and shortcut tour (act 3)
        if (act === 2) {
          const steps = Math.min(sc.walk.length - 1, Math.floor(t / 2));
          ctx.strokeStyle = `${dim}AA`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < steps; i++) {
            const a = sc.pts[sc.walk[i]];
            const b = sc.pts[sc.walk[i + 1]];
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
          }
          ctx.stroke();
          if (steps >= sc.walk.length - 1) {
            ctx.strokeStyle = good;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            sc.tour.forEach((v, i) => {
              const p = sc.pts[v];
              if (i === 0) ctx.moveTo(p[0], p[1]);
              else ctx.lineTo(p[0], p[1]);
            });
            ctx.closePath();
            ctx.stroke();
          }
        }

        // cities
        for (let i = 0; i < N; i++) {
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(sc.pts[i][0], sc.pts[i][1], 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // the ledger on the right
        const x = 320;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = algo;
        ctx.fillText(`MST: ${sc.mstLen.toFixed(0)}  (${(sc.mstLen / sc.opt).toFixed(2)} of the optimum: never more than 1)`, x, 60);
        if (act >= 1) {
          ctx.fillStyle = heur;
          ctx.fillText(`${sc.odd.length} odd cities · matching: ${sc.matchLen.toFixed(0)}  (${(sc.matchLen / sc.opt).toFixed(2)}: never more than 0.5)`, x, 84);
        }
        if (act === 2 && t >= (sc.walk.length - 1) * 2) {
          ctx.fillStyle = good;
          ctx.fillText(`tour: ${sc.tourLen.toFixed(0)}  =  ${(sc.tourLen / sc.opt).toFixed(3)} x optimum (bound 1.5)`, x, 116);
          ctx.fillStyle = dim;
          ctx.fillText(`double-tree shortcut: ${(sc.doubleLen / sc.opt).toFixed(3)} x (bound 2)`, x, 136);
          ctx.fillText(`exact optimum (Held-Karp): ${sc.opt.toFixed(0)}`, x, 156);
        }

        let line;
        if (act === 0) line = `Prim: ${mstShown} of ${sc.mst.length} edges: the tree costs at most what any tour costs`;
        else if (act === 1) line = `${sc.odd.length} cities have odd degree: pairing them cheaply makes every degree even, at most half an optimal tour`;
        else if (t < (sc.walk.length - 1) * 2) line = 'every degree even means an Euler walk exists: walk every edge once and come home';
        else line = `shortcut: skip cities already seen: ${(sc.tourLen / sc.opt).toFixed(3)} x optimum, the theorem says at most 1.5`;
        ctx.fillStyle = act === 2 && t >= (sc.walk.length - 1) * 2 ? good : ink;
        ctx.fillText(line, 14, H - 8);
        statsRef.current = { line: done ? `tree plus matching plus shortcut: ${(sc.tourLen / sc.opt).toFixed(3)} x optimum, guaranteed under 1.5 · double-tree ${(sc.doubleLen / sc.opt).toFixed(3)} x` : line };
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
        <span className="viz-stat">{snap.line || 'growing the tree…'}</span>
      </div>
    </>
  );
}
