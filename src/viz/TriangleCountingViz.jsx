import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The node-iterator on a seeded two-community graph, one node per tick: the
// current node (amber) checks every pair of its neighbors for an edge and
// counts the triangles whose lowest index is this node, so the running total
// never double counts. The invariant checked every tick is that the running
// total equals the brute-force count of triangles whose smallest node has
// been processed; at the end the total equals the brute force over all
// triples and the transitivity equals 3T over the wedge count.
const W = 640;
const H = 300;
const SEED = 20261010;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const n = 20 + Math.floor(rand() * 7); // 20 to 26 nodes
  const half = Math.ceil(n / 2);
  const adj = Array.from({ length: n }, () => new Set());
  for (let u = 0; u < n; u += 1) {
    for (let v = u + 1; v < n; v += 1) {
      const same = (u < half) === (v < half);
      if (rand() < (same ? 0.42 : 0.05)) {
        adj[u].add(v);
        adj[v].add(u);
      }
    }
  }
  // brute force over all triples, keyed by the smallest node
  const byMin = new Array(n).fill(0);
  const tris = [];
  for (let a = 0; a < n; a += 1) {
    for (let b = a + 1; b < n; b += 1) {
      if (!adj[a].has(b)) continue;
      for (let c = b + 1; c < n; c += 1) {
        if (adj[a].has(c) && adj[b].has(c)) {
          byMin[a] += 1;
          tris.push([a, b, c]);
        }
      }
    }
  }
  const pos = [];
  for (let v = 0; v < n; v += 1) {
    const left = v < half;
    const k = left ? v : v - half;
    const count = left ? half : n - half;
    const ang = (2 * Math.PI * k) / count - Math.PI / 2;
    const r = 88 + (k % 2) * 14;
    pos.push([(left ? 165 : 475) + r * Math.cos(ang), 150 + r * Math.sin(ang) * 0.9]);
  }
  const edges = adj.reduce((s, a) => s + a.size, 0) / 2;
  const wedges = adj.reduce((s, a) => s + (a.size * (a.size - 1)) / 2, 0);
  return {
    n, adj, pos, byMin, bruteTotal: tris.length, edges, wedges,
    v: 0, found: [], count: 0, checks: 0, hereChecks: 0, hereHits: 0, hits: 0,
    done: false, ok: true,
    last: `${n} nodes, ${edges} edges, ${wedges} wedges; brute force says ${tris.length} triangles`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const v = sc.v;
  const nb = [...sc.adj[v]].sort((a, b) => a - b);
  let here = 0;
  let hits = 0;
  for (let i = 0; i < nb.length; i += 1) {
    for (let j = i + 1; j < nb.length; j += 1) {
      sc.checks += 1;
      here += 1;
      if (sc.adj[nb[i]].has(nb[j])) {
        hits += 1; // a triangle through v (counted from this corner)
        if (nb[i] > v) {
          sc.count += 1; // v is the smallest corner: count it once here
          sc.found.push([v, nb[i], nb[j]]);
        }
      }
    }
  }
  sc.hereChecks = here;
  sc.hereHits = hits;
  sc.hits += hits;
  // invariant: triangles whose smallest node is <= v, by brute force
  let expect = 0;
  for (let a = 0; a <= v; a += 1) expect += sc.byMin[a];
  sc.ok = sc.ok && sc.count === expect;
  sc.v += 1;
  if (sc.v >= sc.n) {
    sc.done = true;
    const trans = sc.wedges ? (3 * sc.count) / sc.wedges : 0;
    sc.ok = sc.ok && sc.count === sc.bruteTotal && sc.hits === 3 * sc.bruteTotal;
    sc.last = `done: ${sc.count} triangles (brute force ${sc.bruteTotal}), seen ${sc.hits} times = 3T, ${sc.checks} pair checks = ${sc.wedges} wedges; transitivity ${trans.toFixed(3)}; invariant ${sc.ok ? 'held' : 'BROKEN'}`;
    return true;
  }
  sc.last = `node ${v}: degree ${nb.length}, ${here} pair checks, ${hits} triangles through it, ${sc.count} counted so far (${sc.checks} checks)`;
  return false;
}

export default function TriangleCountingViz() {
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
      stepMs: 420,
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
        const cur = s.done ? -1 : sc.v;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('the node-iterator: each node checks every pair of its neighbors; a triangle is counted at its lowest corner', 12, 16);
        // found triangles
        ctx.fillStyle = `${good}33`;
        for (const [a, b, c] of sc.found) {
          ctx.beginPath();
          ctx.moveTo(sc.pos[a][0], sc.pos[a][1]);
          ctx.lineTo(sc.pos[b][0], sc.pos[b][1]);
          ctx.lineTo(sc.pos[c][0], sc.pos[c][1]);
          ctx.closePath();
          ctx.fill();
        }
        // edges
        ctx.lineWidth = 1;
        for (let u = 0; u < sc.n; u += 1) {
          for (const v of sc.adj[u]) {
            if (v <= u) continue;
            const hot = u === cur || v === cur;
            ctx.strokeStyle = hot ? heur : `${dim}66`;
            ctx.lineWidth = hot ? 1.6 : 1;
            ctx.beginPath();
            ctx.moveTo(sc.pos[u][0], sc.pos[u][1]);
            ctx.lineTo(sc.pos[v][0], sc.pos[v][1]);
            ctx.stroke();
          }
        }
        // nodes
        for (let v = 0; v < sc.n; v += 1) {
          const [x, y] = sc.pos[v];
          const isNb = cur >= 0 && sc.adj[cur].has(v);
          ctx.beginPath();
          ctx.arc(x, y, v === cur ? 7 : 5, 0, 2 * Math.PI);
          ctx.fillStyle = v === cur ? heur : isNb ? `${heur}aa` : v < sc.v ? algo : `${dim}88`;
          ctx.fill();
        }
        ctx.fillStyle = dim;
        ctx.fillText(`processed ${Math.min(sc.v, sc.n)} of ${sc.n} nodes; pair checks ${sc.checks} of ${sc.wedges} wedges`, 12, 262);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? `triangles counted ${sc.count} (brute force ${sc.bruteTotal}); seen from corners ${sc.hits} = 3 x counted so far or more` : 'INVARIANT BROKEN', 12, 278);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 100 ? `${line.slice(0, 99)}…` : line, 12, H - 6);
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
          new graph
        </button>
        <span className="viz-stat">{snap.line || 'counting…'}</span>
      </div>
    </>
  );
}
