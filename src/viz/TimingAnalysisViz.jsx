import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A seeded layered netlist swept one node per tick in topological order.
// Invariant: every swept arrival equals the enumerated longest path; at the
// end the critical path is traced and paths are set beside relaxations.
const W = 640;
const H = 300;
const SEED = 20261010;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const layers = 4 + Math.floor(rand() * 2); // gate layers
  const width = 3;
  const nodes = [];
  const add = (kind, layer, delay) => {
    nodes.push({ id: nodes.length, kind, layer, delay, fanin: [], at: null, pred: -1 });
    return nodes.length - 1;
  };
  const prev = [];
  for (let i = 0; i < width; i += 1) prev.push(add('pi', 0, 0));
  let last = prev.slice();
  for (let l = 1; l <= layers; l += 1) {
    const cur = [];
    for (let j = 0; j < width; j += 1) {
      const g = add('gate', l, 1 + Math.round(rand() * 20) / 10);
      const k = 2 + Math.floor(rand() * 2);
      const picks = new Set([last[Math.floor(rand() * last.length)]]);
      while (picks.size < k) picks.add(last[Math.floor(rand() * last.length)]);
      for (const u of picks) nodes[g].fanin.push({ u, w: Math.round(rand() * 5) / 10 + 0.1 });
      cur.push(g);
    }
    last = cur;
  }
  const po = add('po', layers + 1, 0);
  nodes[po].fanin.push({ u: last[Math.floor(rand() * last.length)], w: 0.2 });
  // Kahn order
  const indeg = nodes.map((n) => n.fanin.length);
  const fanout = nodes.map(() => []);
  nodes.forEach((n) => n.fanin.forEach(({ u }) => fanout[u].push(n.id)));
  const ready = nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
  const order = [];
  while (ready.length) {
    const v = ready.shift();
    order.push(v);
    for (const w of fanout[v]) { indeg[w] -= 1; if (indeg[w] === 0) ready.push(w); }
  }
  // path count by dynamic programming
  const cnt = new Array(nodes.length).fill(0);
  for (const v of order) cnt[v] = nodes[v].kind === 'pi' ? 1 : nodes[v].fanin.reduce((s, { u }) => s + cnt[u], 0);
  return { nodes, order, step: 0, relax: 0, paths: cnt[po], po, crit: [], done: false, ok: true, last: `${nodes.length} nodes in ${layers} gate layers; ${cnt[po]} input-to-output paths; sweeping in topological order` };
}

// the referee: longest path to v by enumerating every path explicitly
function enumerateLongest(nodes, v) {
  if (nodes[v].kind === 'pi') return 0;
  let best = -Infinity;
  for (const { u, w } of nodes[v].fanin) best = Math.max(best, enumerateLongest(nodes, u) + w);
  return best + nodes[v].delay;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.step >= sc.order.length) {
    // trace the critical path from the output
    let v = sc.po;
    const path = [v];
    while (sc.nodes[v].pred >= 0) { v = sc.nodes[v].pred; path.push(v); }
    sc.crit = path.reverse();
    sc.done = true;
    sc.last = `done: arrival ${sc.nodes[sc.po].at.toFixed(1)} at the output through ${sc.crit.length - 2} gates; ${sc.relax} relaxations against ${sc.paths} paths; every arrival equal to the enumerated longest path: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  const v = sc.order[sc.step];
  const n = sc.nodes[v];
  if (n.kind === 'pi') {
    n.at = 0;
  } else {
    let best = -Infinity;
    for (const { u, w } of n.fanin) {
      sc.relax += 1;
      const t = sc.nodes[u].at + w;
      if (t > best) { best = t; n.pred = u; }
    }
    n.at = best + n.delay;
    const ref = enumerateLongest(sc.nodes, v);
    if (Math.abs(ref - n.at) > 1e-9) sc.ok = false;
  }
  sc.step += 1;
  sc.last = `node ${v}: arrival ${n.at.toFixed(1)}${n.kind === 'gate' ? ` = max over ${n.fanin.length} fan-in${n.fanin.length > 1 ? 's' : ''} + delay ${n.delay.toFixed(1)}` : ''}; ${sc.relax} relaxations so far`;
  return false;
}

export default function TimingAnalysisViz() {
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
        const layers = sc.nodes[sc.po].layer;
        const x = (l) => 50 + (l * (W - 110)) / layers;
        const y = (n) => {
          const same = sc.nodes.filter((m) => m.layer === n.layer);
          return 60 + same.indexOf(n) * ((H - 120) / Math.max(1, same.length - 1 || 1));
        };
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('arrival = max over fan-ins (arrival + wire) + gate delay, one node per tick in topological order; the zero-slack chain is the critical path', 12, 18);
        const onCrit = new Set(sc.crit);
        for (const n of sc.nodes) {
          for (const { u, w } of n.fanin) {
            const crit = onCrit.has(n.id) && sc.nodes[n.id].pred === u && sc.done;
            ctx.strokeStyle = crit ? good : n.at !== null ? `${algo}aa` : `${dim}55`;
            ctx.lineWidth = crit ? 2.5 : 1;
            ctx.beginPath();
            ctx.moveTo(x(sc.nodes[u].layer) + 16, y(sc.nodes[u]));
            ctx.lineTo(x(n.layer) - 16, y(n));
            ctx.stroke();
            if (n.at !== null) {
              ctx.fillStyle = `${dim}cc`;
              ctx.fillText(w.toFixed(1), (x(sc.nodes[u].layer) + x(n.layer)) / 2 - 8, (y(sc.nodes[u]) + y(n)) / 2 - 3);
            }
          }
        }
        const current = sc.step < sc.order.length && !sc.done ? sc.order[sc.step] : -1;
        for (const n of sc.nodes) {
          const px = x(n.layer);
          const py = y(n);
          const settled = n.at !== null;
          ctx.fillStyle = sc.done && onCrit.has(n.id) ? good : n.id === current ? heur : settled ? algo : `${dim}66`;
          ctx.fillRect(px - 16, py - 11, 32, 22);
          ctx.fillStyle = '#0b0e14';
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(n.kind === 'gate' ? `d${n.delay.toFixed(1)}` : n.kind, px - 13, py + 4);
          ctx.font = '11px ui-monospace, monospace';
          if (settled) {
            ctx.fillStyle = ink;
            ctx.fillText(n.at.toFixed(1), px - 12, py - 15);
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText(`relaxations ${sc.relax} against ${sc.paths} paths; the file's ladder: 4.7e21 paths, 865 relaxations`, 12, H - 26);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: every swept arrival equals the enumerated longest path' : 'INVARIANT BROKEN', 12, H - 42);
        const line = sc.last;
        ctx.fillStyle = sc.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 8);
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
          new netlist
        </button>
        <span className="viz-stat">{snap.line || 'sweeping…'}</span>
      </div>
    </>
  );
}
