import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The spelunk, watched. Eight chambers, one rope. Each node shows its
// chalk marks (index / low-link); the side stack grows as a column of
// chips on the right; back edges to on-stack chambers flash green as
// they pull low-links down; and when a vertex closes with
// lowlink == index, the stack pops down to it and the whole component
// floods one color. Sinks seal first: the reverse-topo order appears
// in the pop sequence, and the closing card says so.
const W = 640;
const H = 300;
const SEED = 20260827;
const TICKS_PER_EVENT = 11;
const END_HOLD = 80;

const GRAPHS = [
  {
    pos: [[80, 80], [200, 50], [200, 130], [340, 90], [460, 60], [460, 150], [580, 110], [340, 200]],
    edges: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3], [5, 6], [3, 7]],
  },
  {
    pos: [[90, 140], [210, 70], [210, 200], [350, 140], [480, 80], [480, 200], [590, 140], [350, 40]],
    edges: [[0, 1], [1, 3], [3, 2], [2, 0], [3, 4], [4, 6], [6, 5], [5, 4], [1, 7]],
  },
];

function runTarjan(n, adj) {
  const index = new Array(n).fill(-1);
  const low = new Array(n).fill(-1);
  const onStack = new Array(n).fill(false);
  const stack = [];
  const events = [];
  let counter = 0;
  let compCount = 0;

  const dfs = (v) => {
    index[v] = low[v] = counter++;
    stack.push(v);
    onStack[v] = true;
    events.push({ type: 'visit', v, idx: index[v], stack: stack.slice() });
    for (const w of adj[v]) {
      if (index[w] === -1) {
        events.push({ type: 'tree', from: v, to: w });
        dfs(w);
        if (low[w] < low[v]) {
          low[v] = low[w];
          events.push({ type: 'lowup', v, low: low[v], stack: stack.slice() });
        }
      } else if (onStack[w]) {
        if (index[w] < low[v]) {
          low[v] = index[w];
          events.push({ type: 'back', from: v, to: w, low: low[v], stack: stack.slice() });
        }
      }
    }
    if (low[v] === index[v]) {
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack[w] = false;
        comp.push(w);
      } while (w !== v);
      events.push({ type: 'pop', comp: comp.slice(), compIdx: compCount++, stack: stack.slice() });
    }
  };
  for (let s = 0; s < n; s++) if (index[s] === -1) dfs(s);
  return events;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  const g = GRAPHS[Math.floor(rand() * GRAPHS.length)];
  const n = g.pos.length;
  const adj = Array.from({ length: n }, () => []);
  g.edges.forEach(([u, v]) => adj[u].push(v));
  return { ...g, n, adj, events: runTarjan(n, adj) };
}

const COMP_COLORS = ['#62d98a', '#f0b94b', '#a58bff', '#4fd1c5', '#f687b3'];

export default function TarjanViz() {
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
        scene: makeScene(SEED + cycle.current * 7919),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = s.scene.events.length * TICKS_PER_EVENT + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
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

        const done = s.tick >= sc.events.length * TICKS_PER_EVENT;
        const upTo = done
          ? sc.events.length
          : Math.min(Math.floor(s.tick / TICKS_PER_EVENT) + 1, sc.events.length);

        // Replay events.
        const idxOf = new Array(sc.n).fill(null);
        const lowOf = new Array(sc.n).fill(null);
        const compOf = new Array(sc.n).fill(-1);
        let stack = [];
        let cur = null;
        let flashEdge = null;
        let popped = null;
        for (let e = 0; e < upTo; e++) {
          const ev = sc.events[e];
          const isLast = e === upTo - 1 && !done;
          if (ev.type === 'visit') {
            idxOf[ev.v] = ev.idx;
            lowOf[ev.v] = ev.idx;
            stack = ev.stack;
            if (isLast) cur = ev.v;
          } else if (ev.type === 'tree') {
            if (isLast) flashEdge = { from: ev.from, to: ev.to, kind: 'tree' };
          } else if (ev.type === 'back') {
            lowOf[ev.from] = ev.low;
            stack = ev.stack;
            if (isLast) flashEdge = { from: ev.from, to: ev.to, kind: 'back' };
          } else if (ev.type === 'lowup') {
            lowOf[ev.v] = ev.low;
            stack = ev.stack;
            if (isLast) cur = ev.v;
          } else if (ev.type === 'pop') {
            ev.comp.forEach((v) => (compOf[v] = ev.compIdx));
            stack = ev.stack;
            if (isLast) popped = ev;
          }
        }

        // Edges.
        sc.edges.forEach(([u, v]) => {
          const [x1, y1] = sc.pos[u];
          const [x2, y2] = sc.pos[v];
          const isFlash = flashEdge && flashEdge.from === u && flashEdge.to === v;
          const sameComp = compOf[u] !== -1 && compOf[u] === compOf[v];
          ctx.strokeStyle = isFlash
            ? flashEdge.kind === 'back'
              ? good
              : heur
            : sameComp
              ? `${COMP_COLORS[compOf[u] % COMP_COLORS.length]}88`
              : '#2a3450';
          ctx.lineWidth = isFlash ? 2.4 : 1.2;
          ctx.setLineDash(isFlash && flashEdge.kind === 'back' ? [5, 4] : []);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          const mx = x1 + (x2 - x1) * 0.6;
          const my = y1 + (y2 - y1) * 0.6;
          const ang = Math.atan2(y2 - y1, x2 - x1);
          ctx.fillStyle = '#3a4664';
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx - 7 * Math.cos(ang - 0.38), my - 7 * Math.sin(ang - 0.38));
          ctx.lineTo(mx - 7 * Math.cos(ang + 0.38), my - 7 * Math.sin(ang + 0.38));
          ctx.fill();
        });

        // Nodes with chalk marks.
        for (let v = 0; v < sc.n; v++) {
          const [x, y] = sc.pos[v];
          const comp = compOf[v];
          const isCur = cur === v;
          const inPop = popped && popped.comp.includes(v);
          ctx.fillStyle =
            comp !== -1
              ? `${COMP_COLORS[comp % COMP_COLORS.length]}33`
              : idxOf[v] !== null
                ? 'rgba(93,162,255,0.15)'
                : 'rgba(255,255,255,0.04)';
          ctx.strokeStyle =
            inPop
              ? COMP_COLORS[popped.compIdx % COMP_COLORS.length]
              : comp !== -1
                ? `${COMP_COLORS[comp % COMP_COLORS.length]}`
                : isCur
                  ? heur
                  : algo;
          ctx.lineWidth = isCur || inPop ? 2.4 : 1.4;
          ctx.beginPath();
          ctx.arc(x, y, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = '11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText('ABCDEFGH'[v], x, y + 4);
          ctx.textAlign = 'start';
          if (idxOf[v] !== null) {
            ctx.fillStyle = lowOf[v] < idxOf[v] ? good : dim;
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(`${idxOf[v]}/${lowOf[v]}`, x - 12, y + 26);
          }
        }

        // The side stack.
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('stack', W - 60, 34);
        stack.forEach((v, i) => {
          const y = 240 - i * 22;
          ctx.fillStyle = 'rgba(240,185,75,0.18)';
          ctx.strokeStyle = heur;
          ctx.fillRect(W - 66, y, 34, 18);
          ctx.strokeRect(W - 65.5, y + 0.5, 33, 17);
          ctx.fillStyle = ink;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('ABCDEFGH'[v], W - 53, y + 13);
        });

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        let line;
        if (done) {
          const nComps = Math.max(...compOf) + 1;
          ctx.fillText('the rope is empty: components popped downstream-first (reverse topological)', 14, 20);
          line = `${nComps} components from one pass · labels are index/lowlink`;
          ctx.fillStyle = good;
        } else if (popped) {
          ctx.fillText(`lowlink == index at ${'ABCDEFGH'[popped.comp[popped.comp.length - 1]]}: the component seals`, 14, 20);
          line = `popped {${popped.comp.map((v) => 'ABCDEFGH'[v]).join(', ')}} as SCC #${popped.compIdx + 1}`;
          ctx.fillStyle = COMP_COLORS[popped.compIdx % COMP_COLORS.length];
        } else if (flashEdge && flashEdge.kind === 'back') {
          ctx.fillText('a back edge to an on-stack chamber: the low-link pulls down', 14, 20);
          line = `${'ABCDEFGH'[flashEdge.from]} → ${'ABCDEFGH'[flashEdge.to]}: proof of a way back up`;
          ctx.fillStyle = good;
        } else {
          ctx.fillText('chalk and rope: index/lowlink marks appear as the DFS descends', 14, 20);
          line = 'green label = a low-link below its index: an escape route is known';
          ctx.fillStyle = ink;
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
          new caves
        </button>
        <span className="viz-stat">
          {snap.line || 'uncoiling the rope…'}
        </span>
      </div>
    </>
  );
}
