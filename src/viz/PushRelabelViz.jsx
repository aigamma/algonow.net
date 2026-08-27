import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Water on terraces, run for real. A small layered network drawn as
// columns whose height is the label and whose amber fill is the
// excess: the same push/relabel/FIFO machine as the Python referee
// executes one operation per beat. Pushes pour amber downhill along
// the edge; relabels jack a column up a notch in red; drained
// vertices go quiet. The end state: no puddles anywhere but the
// sink, whose green fill is the max flow: with the cut drawn dashed.
const W = 640;
const H = 300;
const SEED = 20260827;
const OP_TICKS = 12;
const END_HOLD = 70;

function buildNetwork(rand) {
  // s -> two middle layers of 3 -> t, capacities small ints.
  const n = 8;
  const s = 0;
  const t = 7;
  const edges = [];
  for (let i = 1; i <= 3; i++) edges.push([s, i, 3 + Math.floor(rand() * 5)]);
  for (let i = 1; i <= 3; i++)
    for (let j = 4; j <= 6; j++)
      if (rand() < 0.75) edges.push([i, j, 1 + Math.floor(rand() * 5)]);
  for (let j = 4; j <= 6; j++) edges.push([j, t, 2 + Math.floor(rand() * 5)]);
  return { n, s, t, edges };
}

function runMachine(net) {
  const { n, s, t, edges } = net;
  const cap = new Map();
  const adj = Array.from({ length: n }, () => []);
  const key = (u, v) => u * 100 + v;
  edges.forEach(([u, v, c]) => {
    if (!cap.has(key(u, v))) {
      adj[u].push(v);
      adj[v].push(u);
      cap.set(key(u, v), 0);
      cap.set(key(v, u), 0);
    }
    cap.set(key(u, v), cap.get(key(u, v)) + c);
  });
  const h = Array(n).fill(0);
  h[s] = n;
  const ex = Array(n).fill(0);
  const events = [];
  const active = [];
  const inQ = Array(n).fill(false);
  const activate = (v) => {
    if (v !== s && v !== t && ex[v] > 0 && !inQ[v]) {
      inQ[v] = true;
      active.push(v);
    }
  };
  adj[s].forEach((v) => {
    const c = cap.get(key(s, v));
    if (c > 0) {
      cap.set(key(s, v), 0);
      cap.set(key(v, s), cap.get(key(v, s)) + c);
      ex[v] += c;
      ex[s] -= c;
      events.push({ kind: 'push', from: s, to: v, amt: c, h: h.slice(), ex: ex.slice() });
      activate(v);
    }
  });
  let guard = 0;
  while (active.length && guard < 4000) {
    guard += 1;
    const u = active.shift();
    inQ[u] = false;
    let stuck = false;
    while (ex[u] > 0 && !stuck) {
      let pushed = false;
      for (const v of adj[u]) {
        if (cap.get(key(u, v)) > 0 && h[u] === h[v] + 1) {
          const d = Math.min(ex[u], cap.get(key(u, v)));
          cap.set(key(u, v), cap.get(key(u, v)) - d);
          cap.set(key(v, u), cap.get(key(v, u)) + d);
          ex[u] -= d;
          ex[v] += d;
          events.push({ kind: 'push', from: u, to: v, amt: d, h: h.slice(), ex: ex.slice() });
          activate(v);
          pushed = true;
          if (ex[u] === 0) break;
        }
      }
      if (ex[u] === 0) break;
      if (!pushed) {
        const lows = adj[u].filter((v) => cap.get(key(u, v)) > 0).map((v) => h[v]);
        if (!lows.length) break;
        h[u] = 1 + Math.min(...lows);
        events.push({ kind: 'relabel', at: u, to: h[u], h: h.slice(), ex: ex.slice() });
        activate(u);
        stuck = true;
      }
    }
  }
  // Final cut side (residual reachability from s).
  const seen = new Set([s]);
  const q = [s];
  while (q.length) {
    const u = q.pop();
    adj[u].forEach((v) => {
      if (!seen.has(v) && cap.get(key(u, v)) > 0) {
        seen.add(v);
        q.push(v);
      }
    });
  }
  return { events, flow: ex[t], cut: seen, edges };
}

const POS = [
  [70, 150], [230, 70], [230, 150], [230, 230],
  [410, 70], [410, 150], [410, 230], [570, 150],
];

export default function PushRelabelViz() {
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
      init: () => {
        const rand = mulberry32(SEED + cycle.current * 6997);
        const net = buildNetwork(rand);
        return {
          net,
          run: runMachine(net),
          tick: 0,
          rest: 0,
          stopAtRest: isStill(),
        };
      },
      tick: (s) => {
        const total = s.run.events.length * OP_TICKS + END_HOLD;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            const rand = mulberry32(SEED + cycle.current * 6997);
            const net = buildNetwork(rand);
            Object.assign(s, { net, run: runMachine(net), tick: 0, rest: 0 });
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';

        const run = s.run;
        const shown = Math.min(Math.floor(s.tick / OP_TICKS), run.events.length);
        const finished = shown >= run.events.length;
        const state = shown > 0 ? run.events[shown - 1] : null;
        const hArr = state ? state.h : [8, 0, 0, 0, 0, 0, 0, 0];
        const exArr = state ? state.ex : [0, 0, 0, 0, 0, 0, 0, 0];

        // Edges.
        run.edges.forEach(([u, v]) => {
          const [x1, y1] = POS[u];
          const [x2, y2] = POS[v];
          const crossesCut = finished && run.cut.has(u) && !run.cut.has(v);
          ctx.strokeStyle = crossesCut ? warn : '#2a3450';
          ctx.lineWidth = crossesCut ? 2 : 1.3;
          ctx.setLineDash(crossesCut ? [5, 4] : []);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // The current operation flash.
        if (state && !finished) {
          if (state.kind === 'push') {
            const [x1, y1] = POS[state.from];
            const [x2, y2] = POS[state.to];
            const f = ((s.tick % OP_TICKS) + 1) / OP_TICKS;
            ctx.strokeStyle = heur;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f);
            ctx.stroke();
          }
        }

        // Vertices: column height = label, amber fill = excess.
        POS.forEach(([x, y], v) => {
          const hh = Math.min(hArr[v], 10);
          const colH = 10 + hh * 8;
          const isS = v === s.net.s;
          const isT = v === s.net.t;
          const relabeling =
            state && !finished && state.kind === 'relabel' && state.at === v;
          ctx.fillStyle = '#22304e';
          ctx.fillRect(x - 16, y - colH / 2, 32, colH);
          if (exArr[v] > 0 && !isS) {
            const fillH = Math.min(colH - 4, 4 + exArr[v] * 3);
            ctx.fillStyle = isT ? good : heur;
            ctx.fillRect(x - 13, y + colH / 2 - 2 - fillH, 26, fillH);
          }
          ctx.strokeStyle = relabeling
            ? warn
            : isS
              ? algo
              : isT
                ? good
                : '#40507a';
          ctx.lineWidth = relabeling ? 2.4 : 1.5;
          ctx.strokeRect(x - 16, y - colH / 2, 32, colH);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(isS ? 's' : isT ? 't' : `h${hArr[v]}`, x - 8, y - colH / 2 - 5);
        });

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('columns: height label · amber: excess puddle · the queue works front to back', 14, 20);

        let line;
        if (!state) {
          line = 'the tank opens…';
          ctx.fillStyle = dim;
        } else if (finished) {
          line = `no puddles left: sink holds ${run.flow}: the dashed cut certifies it (cut = flow)`;
          ctx.fillStyle = good;
        } else if (state.kind === 'push') {
          line = `op ${shown}/${run.events.length} · push ${state.amt} downhill: one level, no map`;
          ctx.fillStyle = heur;
        } else {
          line = `op ${shown}/${run.events.length} · stuck: relabel to h=${state.to}: heights only climb`;
          ctx.fillStyle = warn;
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
          new network
        </button>
        <span className="viz-stat">
          {snap.line || 'the tank opens…'}
        </span>
      </div>
    </>
  );
}
