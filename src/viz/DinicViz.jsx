import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The live phases. A small capacitated network runs real Dinic, replayed
// event by event: each phase's BFS survey stamps level numbers on the
// vertices (the blue bands), then blocking-flow augmentations flash amber
// and leave green flow filling the pipes. Watch the one number that drives
// the theorem: the s-to-t distance printed in the header only ever rises,
// which is why the phases must end.
const W = 640;
const H = 300;
const SEED = 20260827;
const COLS = 5;
const ROWS = 4;
const TICKS_PER_EVENT = 14;

function h32(x) {
  x = (x + 0x9e3779b9) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

function buildNetwork(seed) {
  const rand = mulberry32(seed);
  // Nodes: 0 = s, 1 = t, then a COLS x ROWS grid.
  const pos = [
    [34, H / 2 - 20],
    [W - 34, H / 2 - 20],
  ];
  const id = (c, r) => 2 + c * ROWS + r;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      pos.push([104 + c * ((W - 208) / (COLS - 1)), 52 + r * 56]);
    }
  }
  const edges = [];
  const add = (u, v, cap) => edges.push({ u, v, cap, flow: 0 });
  for (let r = 0; r < ROWS; r++) add(0, id(0, r), 2 + Math.floor(rand() * 8));
  for (let c = 0; c < COLS - 1; c++) {
    for (let r = 0; r < ROWS; r++) {
      const outs = new Set([r, Math.floor(rand() * ROWS)]);
      for (const r2 of outs) add(id(c, r), id(c + 1, r2), 1 + Math.floor(rand() * 9));
    }
  }
  for (let r = 0; r < ROWS; r++) add(id(COLS - 1, r), 1, 2 + Math.floor(rand() * 8));
  return { pos, edges, n: pos.length };
}

// Run real Dinic over the network, recording a replayable event log:
// {type:'phase', levels, dist} and {type:'augment', segs:[edgeIdx,dir], f}.
function recordDinic(net) {
  const n = net.n;
  const to = [];
  const cap = [];
  const adj = Array.from({ length: n }, () => []);
  const owner = []; // residual arc -> [edge index, +1 forward / -1 back]
  net.edges.forEach((e, i) => {
    adj[e.u].push(to.length);
    owner.push([i, 1]);
    to.push(e.v);
    cap.push(e.cap);
    adj[e.v].push(to.length);
    owner.push([i, -1]);
    to.push(e.u);
    cap.push(0);
  });
  const events = [];
  let total = 0;
  for (;;) {
    const level = new Array(n).fill(-1);
    level[0] = 0;
    const q = [0];
    for (let qi = 0; qi < q.length; qi++) {
      const u = q[qi];
      for (const a of adj[u]) {
        if (cap[a] > 0 && level[to[a]] < 0) {
          level[to[a]] = level[u] + 1;
          q.push(to[a]);
        }
      }
    }
    events.push({ type: 'phase', levels: level.slice(), dist: level[1] });
    if (level[1] < 0) break;
    const it = new Array(n).fill(0);
    const dfs = (u, limit, trail) => {
      if (u === 1) return limit;
      while (it[u] < adj[u].length) {
        const a = adj[u][it[u]];
        const v = to[a];
        if (cap[a] > 0 && level[v] === level[u] + 1) {
          trail.push(a);
          const got = dfs(v, Math.min(limit, cap[a]), trail);
          if (got > 0) return got;
          trail.pop();
        }
        it[u] += 1;
      }
      return 0;
    };
    for (;;) {
      const trail = [];
      const got = dfs(0, Infinity, trail);
      if (got === 0) break;
      for (const a of trail) {
        cap[a] -= got;
        cap[a ^ 1] += got;
      }
      total += got;
      events.push({ type: 'augment', segs: trail.map((a) => owner[a]), f: got });
    }
  }
  return { events, maxFlow: total };
}

export default function DinicViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ flow: 0, max: 0, phase: 0, dist: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ flow: 0, max: 0 });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      init: () => {
        const net = buildNetwork(h32(SEED + cycle.current * 7919));
        const { events, maxFlow } = recordDinic(net);
        return {
          net,
          events,
          maxFlow,
          applied: 0,
          tick: 0,
          levels: null,
          dist: 0,
          phase: 0,
          flow: 0,
          lastAugment: null,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        const doneAt = s.events.length * TICKS_PER_EVENT;
        if (s.tick >= doneAt) {
          s.lastAugment = null;
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const net = buildNetwork(h32(SEED + cycle.current * 7919));
            const rec = recordDinic(net);
            Object.assign(s, {
              net,
              events: rec.events,
              maxFlow: rec.maxFlow,
              applied: 0,
              tick: 0,
              levels: null,
              dist: 0,
              phase: 0,
              flow: 0,
              lastAugment: null,
              rest: 0,
            });
          }
          return true;
        }
        const target = Math.min(Math.floor(s.tick / TICKS_PER_EVENT) + 1, s.events.length);
        while (s.applied < target) {
          const ev = s.events[s.applied];
          if (ev.type === 'phase') {
            s.levels = ev.levels;
            s.dist = ev.dist;
            if (ev.dist >= 0) s.phase += 1;
            s.lastAugment = null;
          } else {
            for (const [ei, dir] of ev.segs) s.net.edges[ei].flow += dir * ev.f;
            s.flow += ev.f;
            s.lastAugment = ev;
          }
          s.applied += 1;
        }
        s.tick += 1;
        statsRef.current = { flow: s.flow, max: s.maxFlow, phase: s.phase, dist: s.dist };
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        const finished = s.applied >= s.events.length;
        ctx.fillText(
          finished
            ? `maximum reached · flow ${s.flow} · the last survey could not reach t`
            : `phase ${Math.max(s.phase, 1)} · s→t distance ${s.dist >= 0 ? s.dist : '∞'} · flow ${s.flow} of ${s.maxFlow}`,
          14,
          20,
        );

        const hot = new Set((s.lastAugment?.segs ?? []).map(([ei]) => ei));
        for (let i = 0; i < s.net.edges.length; i++) {
          const e = s.net.edges[i];
          const [x1, y1] = s.net.pos[e.u];
          const [x2, y2] = s.net.pos[e.v];
          ctx.strokeStyle = 'rgba(255,255,255,0.13)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          const frac = Math.max(0, Math.min(1, e.flow / e.cap));
          if (frac > 0) {
            ctx.strokeStyle = hot.has(i) ? heur : path;
            ctx.lineWidth = 0.8 + 2.6 * frac;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + (x2 - x1), y1 + (y2 - y1));
            ctx.stroke();
          } else if (hot.has(i)) {
            ctx.strokeStyle = heur;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
        for (let v = 0; v < s.net.n; v++) {
          const [x, y] = s.net.pos[v];
          const special = v === 0 || v === 1;
          ctx.beginPath();
          ctx.arc(x, y, special ? 13 : 9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(20,26,40,0.9)';
          ctx.fill();
          ctx.strokeStyle = special ? path : algo;
          ctx.lineWidth = special ? 1.8 : 1.1;
          ctx.stroke();
          ctx.fillStyle = special ? path : ink;
          ctx.textAlign = 'center';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(v === 0 ? 's' : v === 1 ? 't' : '·', x, y + 3.5);
          if (s.levels && s.levels[v] >= 0 && !special) {
            ctx.fillStyle = algo;
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(String(s.levels[v]), x, y - 13);
          }
          ctx.textAlign = 'start';
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
          new network
        </button>
        <span className="viz-stat">
          {snap.max > 0
            ? <>blocking flows fill the level graph · <strong>{snap.flow}</strong> of {snap.max} routed</>
            : 'surveying levels…'}
        </span>
      </div>
    </>
  );
}
