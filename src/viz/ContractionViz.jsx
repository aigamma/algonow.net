import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A small road grid, contracted and then queried. Act 1: nodes leave in
// importance order (edge difference plus contracted neighbors, lazily
// updated); when the only shortest path between two neighbors ran
// through the leaving node, an amber shortcut is added. Act 2: a query
// climbs the hierarchy from both ends (blue from the source, amber
// from the target), meets at the top, and the unpacked path is drawn
// in green, with the settled count against plain Dijkstra's.
const W = 640;
const H = 300;
const SEED = 20260926;
const SIDE = 8;

function makeGrid(rand) {
  const n = SIDE * SIDE;
  const adj = Array.from({ length: n }, () => new Map());
  const edges = [];
  for (let r = 0; r < SIDE; r++) {
    for (let c = 0; c < SIDE; c++) {
      const u = r * SIDE + c;
      if (c + 1 < SIDE) edges.push([u, u + 1]);
      if (r + 1 < SIDE) edges.push([u, u + SIDE]);
    }
  }
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }
  const parent = [...Array(n).keys()];
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const kept = [];
  const rest = [];
  for (const [u, v] of edges) {
    const a = find(u);
    const b = find(v);
    if (a !== b) {
      parent[a] = b;
      kept.push([u, v]);
    } else rest.push([u, v]);
  }
  for (const e of rest) if (rand() > 0.22) kept.push(e);
  for (const [u, v] of kept) {
    const w = 1 + Math.floor(rand() * 9);
    adj[u].set(v, w);
    adj[v].set(u, w);
  }
  return adj;
}

class MinHeap {
  constructor() { this.a = []; }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.a[p][0] <= this.a[i][0]) break; [this.a[p], this.a[i]] = [this.a[i], this.a[p]]; i = p; } }
  pop() { const top = this.a[0]; const last = this.a.pop(); if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < this.a.length && this.a[l][0] < this.a[m][0]) m = l; if (r < this.a.length && this.a[r][0] < this.a[m][0]) m = r; if (m === i) break; [this.a[m], this.a[i]] = [this.a[i], this.a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
}

function dijkstraSettled(adj, s, t) {
  const n = adj.length;
  const dist = new Array(n).fill(Infinity);
  const done = new Array(n).fill(false);
  dist[s] = 0;
  const pq = new MinHeap();
  pq.push([0, s]);
  let settled = 0;
  while (pq.size) {
    const [d, u] = pq.pop();
    if (done[u]) continue;
    done[u] = true;
    settled += 1;
    if (u === t) return { dist: d, settled };
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        pq.push([d + w, v]);
      }
    }
  }
  return { dist: Infinity, settled };
}

export function buildHierarchy(adj) {
  const n = adj.length;
  const g = adj.map((m) => new Map(m));
  const contracted = new Array(n).fill(false);
  const deleted = new Array(n).fill(0);
  const up = Array.from({ length: n }, () => new Map());
  const via = new Map();
  const events = [];
  const witness = (u, w, v, limit) => {
    const dist = new Map([[u, 0]]);
    const pq = new MinHeap();
    pq.push([0, u]);
    let settled = 0;
    while (pq.size) {
      const [d, x] = pq.pop();
      if (d > (dist.get(x) ?? Infinity)) continue;
      settled += 1;
      if (x === w) return true;
      if (d > limit || settled > 60) break;
      for (const [y, wt] of g[x]) {
        if (y === v || contracted[y]) continue;
        const nd = d + wt;
        if (nd <= limit && nd < (dist.get(y) ?? Infinity)) {
          dist.set(y, nd);
          pq.push([nd, y]);
        }
      }
    }
    return false;
  };
  const shortcutsFor = (v, simulate) => {
    const nbrs = [...g[v]].filter(([u]) => !contracted[u]);
    let added = 0;
    const list = [];
    for (let i = 0; i < nbrs.length; i++) {
      for (let j = i + 1; j < nbrs.length; j++) {
        const [u, du] = nbrs[i];
        const [w, dw] = nbrs[j];
        const through = du + dw;
        if (!witness(u, w, v, through) && !(g[u].has(w) && g[u].get(w) <= through)) {
          added += 1;
          if (!simulate) {
            g[u].set(w, through);
            g[w].set(u, through);
            via.set(`${u},${w}`, v);
            via.set(`${w},${u}`, v);
            list.push([u, w, through]);
          }
        }
      }
    }
    return { added, removed: nbrs.length, list };
  };
  const priority = (v) => {
    const { added, removed } = shortcutsFor(v, true);
    return 2 * (added - removed) + deleted[v];
  };
  const pq = new MinHeap();
  for (let v = 0; v < n; v++) pq.push([priority(v), v]);
  const rank = new Array(n).fill(-1);
  let r = 0;
  while (pq.size) {
    const [, v] = pq.pop();
    const np = priority(v);
    if (pq.size && np > pq.peek()[0]) {
      pq.push([np, v]);
      continue;
    }
    const { list } = shortcutsFor(v, false);
    rank[v] = r;
    contracted[v] = true;
    for (const [u, w] of g[v]) {
      if (!contracted[u]) {
        deleted[u] += 1;
        up[v].set(u, w);
      }
    }
    events.push({ v, priority: np, shortcuts: list });
    r += 1;
  }
  return { up, via, rank, events, shortcutCount: events.reduce((s, e) => s + e.shortcuts.length, 0) };
}

export function queryHierarchy(h, s, t) {
  const n = h.up.length;
  const dist = [new Array(n).fill(Infinity), new Array(n).fill(Infinity)];
  const prev = [new Array(n).fill(-1), new Array(n).fill(-1)];
  const done = [new Array(n).fill(false), new Array(n).fill(false)];
  dist[0][s] = 0;
  dist[1][t] = 0;
  const pq = [new MinHeap(), new MinHeap()];
  pq[0].push([0, s]);
  pq[1].push([0, t]);
  let best = Infinity;
  let meet = -1;
  const settles = [];
  while (pq[0].size || pq[1].size) {
    const side = pq[0].size && (!pq[1].size || pq[0].peek()[0] <= pq[1].peek()[0]) ? 0 : 1;
    const [d, u] = pq[side].pop();
    if (done[side][u]) continue;
    done[side][u] = true;
    settles.push({ side, u });
    if (d >= best) {
      pq[side] = new MinHeap();
      continue;
    }
    if (done[1 - side][u] && d + dist[1 - side][u] < best) {
      best = d + dist[1 - side][u];
      meet = u;
    }
    for (const [v, w] of h.up[u]) {
      if (d + w < dist[side][v]) {
        dist[side][v] = d + w;
        prev[side][v] = u;
        pq[side].push([d + w, v]);
      }
    }
  }
  const half = (side, end) => {
    const chain = [end];
    while (prev[side][chain[chain.length - 1]] !== -1) chain.push(prev[side][chain[chain.length - 1]]);
    return chain;
  };
  const unpack = (a, b) => {
    const v = h.via.get(`${a},${b}`);
    if (v === undefined) return [a, b];
    return [...unpack(a, v), ...unpack(v, b).slice(1)];
  };
  let path = [];
  if (meet >= 0) {
    const route = [...half(0, meet).reverse(), ...half(1, meet).slice(1)];
    path = [route[0]];
    for (let i = 1; i < route.length; i++) path.push(...unpack(route[i - 1], route[i]).slice(1));
  }
  return { dist: best, settles, path, meet };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const adj = makeGrid(rand);
  const h = buildHierarchy(adj);
  const s = Math.floor(rand() * SIDE) * SIDE + Math.floor(rand() * 2);
  const t = Math.floor(rand() * SIDE) * SIDE + SIDE - 1 - Math.floor(rand() * 2);
  const q = queryHierarchy(h, s, t);
  const plain = dijkstraSettled(adj, s, t);
  const edgeCount = adj.reduce((c, m) => c + m.size, 0) / 2;
  return { adj, h, s, t, q, plain, edgeCount };
}

export default function ContractionViz() {
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
      stepMs: 50,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0 });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0 ? s.scene.h.events.length * 2 + 6 : s.scene.q.settles.length * 2 + 24;
        if (s.tick >= len) {
          s.tick = len;
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
        const done = s.act >= 2;
        const act = done ? 1 : s.act;
        const pos = (v) => [40 + (v % SIDE) * 34, 46 + Math.floor(v / SIDE) * 32];
        const n = SIDE * SIDE;

        // base edges
        ctx.strokeStyle = `${dim}66`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let u = 0; u < n; u++) {
          for (const [v] of sc.adj[u]) {
            if (v > u) {
              const [x1, y1] = pos(u);
              const [x2, y2] = pos(v);
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
            }
          }
        }
        ctx.stroke();

        let line;
        const contractedSet = new Set();
        const shortcutsShown = [];
        if (act === 0) {
          const k = Math.min(sc.h.events.length, Math.floor(s.tick / 2));
          for (let i = 0; i < k; i++) {
            contractedSet.add(sc.h.events[i].v);
            shortcutsShown.push(...sc.h.events[i].shortcuts);
          }
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`act 1 · contract in importance order: ${k} of ${n} nodes gone, ${shortcutsShown.length} shortcuts for ${sc.edgeCount} edges`, 14, 18);
          const ev = k > 0 && k <= sc.h.events.length ? sc.h.events[k - 1] : null;
          line = ev
            ? `node ${ev.v} leaves (priority ${ev.priority}): ${ev.shortcuts.length === 0 ? 'every neighbor pair has a witness path, no shortcut' : `${ev.shortcuts.length} shortcut${ev.shortcuts.length === 1 ? '' : 's'} added where it was the only way through`}`
            : 'cheapest nodes first: edge difference plus contracted neighbors, recomputed lazily when popped';
        } else {
          for (const ev of sc.h.events) shortcutsShown.push(...ev.shortcuts);
          const k = done ? sc.q.settles.length : Math.min(sc.q.settles.length, Math.floor(s.tick / 2));
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`act 2 · query: climb from both ends over ${shortcutsShown.length + sc.edgeCount} edges, meet at the top, unpack the shortcuts`, 14, 18);
          // shortcuts (all)
          ctx.strokeStyle = `${heur}55`;
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const [u, v] of shortcutsShown) {
            const [x1, y1] = pos(u);
            const [x2, y2] = pos(v);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          for (let i = 0; i < k; i++) {
            const { side, u } = sc.q.settles[i];
            const [x, y] = pos(u);
            ctx.fillStyle = side === 0 ? algo : heur;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          const showPath = done || s.tick >= sc.q.settles.length * 2 + 6;
          if (showPath && sc.q.path.length) {
            ctx.strokeStyle = good;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            sc.q.path.forEach((v, i) => {
              const [x, y] = pos(v);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();
          }
          line = showPath
            ? `distance ${sc.q.dist}, equal to Dijkstra's ${sc.plain.dist}: ${sc.q.settles.length} nodes settled against Dijkstra's ${sc.plain.settled}`
            : `settled ${k}: forward (blue) and backward (amber) searches only ever step to higher-ranked nodes`;
        }
        // shortcuts during act 1
        if (act === 0) {
          ctx.strokeStyle = heur;
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (const [u, v] of shortcutsShown) {
            const [x1, y1] = pos(u);
            const [x2, y2] = pos(v);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // nodes
        for (let v = 0; v < n; v++) {
          const [x, y] = pos(v);
          const gone = contractedSet.has(v);
          ctx.fillStyle = gone ? `${dim}33` : v === sc.s || v === sc.t ? good : ink;
          ctx.beginPath();
          ctx.arc(x, y, v === sc.s || v === sc.t ? 4.5 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        // ledger
        const lx = 330;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = ink;
        ctx.fillText(`${n} nodes, ${sc.edgeCount} edges`, lx, 52);
        ctx.fillStyle = heur;
        ctx.fillText(`shortcuts: ${sc.h.shortcutCount} (${(sc.h.shortcutCount / sc.edgeCount).toFixed(2)}x the edges)`, lx, 72);
        ctx.fillStyle = algo;
        ctx.fillText(`query settles ${sc.q.settles.length} nodes`, lx, 100);
        ctx.fillStyle = dim;
        ctx.fillText(`plain Dijkstra settles ${sc.plain.settled}`, lx, 120);
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('amber dashed: shortcuts (the only shortest way through a gone node)', lx, 148);
        ctx.fillText('blue dots: forward climb · amber dots: backward climb', lx, 162);
        ctx.fillText('green: the unpacked path, every edge original', lx, 176);
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = act === 1 && (done || s.tick >= sc.q.settles.length * 2 + 6) ? good : ink;
        ctx.fillText(line, 14, H - 8);
        statsRef.current = { line: done ? `${sc.h.shortcutCount} shortcuts, ${sc.q.settles.length} settled per query against ${sc.plain.settled}: the order is the whole trick` : line };
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
          new map
        </button>
        <span className="viz-stat">{snap.line || 'contracting…'}</span>
      </div>
    </>
  );
}
